const { NutritionLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');
const { triggerDailyLifeStateRecompute } = require('../dailyLifeState/triggerDailyLifeStateRecompute');
const { getEmbedding } = require('./embeddingService');
const { toSearchResult } = require('../nutritionSources/indbMongo');

let IndbFood;
try { IndbFood = require('../../models/IndbFood'); } catch { IndbFood = null; }
let TarlaFood;
try { TarlaFood = require('../../models/TarlaFood'); } catch { TarlaFood = null; }
let MfpFood;
try { MfpFood = require('../../models/MfpFood'); } catch { MfpFood = null; }

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const NUTRITION_AGENT_MODEL = process.env.GROQ_TOOL_MODEL || 'llama-3.3-70b-versatile';

// ── Session-level embedding cache (avoids re-embedding same query) ────────────
const _embeddingCache = new Map();
async function getCachedEmbedding(text) {
  const key = text.trim().toLowerCase();
  if (_embeddingCache.has(key)) return _embeddingCache.get(key);
  const vec = await getEmbedding(text);
  _embeddingCache.set(key, vec);
  return vec;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

/** Recompute dailyTotals from all meals + supplements (mirrors nutritionRoutes logic). */
function recalcDailyTotals(log) {
  const FIELDS = [
    'calories','protein','carbs','fat','fiber','sugar','sodium','potassium',
    'iron','calcium','vitaminB','magnesium','zinc','vitaminC','omega3',
    'saturatedFat','monounsaturatedFat','polyunsaturatedFat','cholesterol',
    'phosphorus','copper','selenium','manganese',
    'vitaminA','vitaminE','vitaminD','vitaminD2','vitaminD3',
    'vitaminB1','vitaminB2','vitaminB3','vitaminB5','vitaminB6',
    'vitaminB7','vitaminB9','vitaminB12','folate',
  ];
  const totals = {};
  FIELDS.forEach(f => { totals[f] = 0; });

  (log.meals || []).forEach(meal => {
    (meal.foods || []).forEach(food => {
      FIELDS.forEach(f => { totals[f] += Number(food[f] || 0); });
    });
  });
  (log.supplements || []).forEach(supp => {
    const n = supp.nutriments || {};
    FIELDS.forEach(f => { totals[f] += Number(n[f] || 0); });
  });

  FIELDS.forEach(f => { totals[f] = Math.round(totals[f] * 10) / 10; });
  return totals;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const nutritionTools = [
  {
    type: 'function',
    function: {
      name: 'search_db_and_estimate',
      description: 'Search the food DB by name. Returns all_units: every available (food_name, unit) variant. Call this FIRST for every food.',
      parameters: {
        type: 'object',
        properties: {
          food_string: { type: 'string' },
        },
        required: ['food_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_user_clarification',
      description: 'Send a question or confirmation message to the user. Use for: (1) presenting food variants, (2) asking quantity, (3) asking for log confirmation.',
      parameters: {
        type: 'object',
        properties: {
          question_to_ask: { type: 'string' },
        },
        required: ['question_to_ask'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'commit_to_ledger',
      description: 'Save the meal ONLY after user confirms. If backend returns {unit_error:true}, re-ask with available units.',
      parameters: {
        type: 'object',
        properties: {
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          meal_time: { type: 'string', description: 'HH:MM 24h. Omit if unknown.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:          { type: 'string' },
                db_item_id:    { type: 'string' },
                db_collection: { type: 'string' },
                user_quantity: { type: 'string' },
                user_unit:     { type: 'string' },
                calories:      { type: 'number' },
                protein:       { type: 'number' },
                carbs:         { type: 'number' },
                fat:           { type: 'number' },
              },
              required: ['name', 'user_quantity', 'user_unit', 'db_item_id', 'db_collection'],
            },
          },
        },
        required: ['meal_type', 'items'],
      },
    },
  },
];

const NUTRITION_SYSTEM_PROMPT_BASE = `
You are a highly precise nutrition logging assistant for an Indian health app.

!! CRITICAL RULES — NEVER BREAK THESE:
1. NEVER invent food or nutrition data. NEVER estimate. NEVER commit food not found in DB.
2. ALWAYS show DB food variants to the user before asking for quantity.
3. ALWAYS confirm with the user before calling commit_to_ledger.
4. ONLY log items explicitly mentioned or confirmed in the CURRENT interaction.
5. IGNORE and FORGET any unconfirmed food items from earlier in the session history once a new food is discussed.
!!

WORKFLOW for each food item — follow EXACTLY:

STEP 1 — Search:
  Call search_db_and_estimate for every food the user mentions.

STEP 2 — Handle result:
  a. If status = "not_found": tell the user "Sorry, I couldn't find [food] in our database and cannot log it." STOP.
  b. If status = "found": proceed to STEP 3.

STEP 3 — Present variants (MANDATORY — skip only if user ALREADY gave quantity+unit in the SAME message that matches a DB entry):
  Call ask_user_clarification with a short message listing the top options:
    "Found for '[food]':
    • [Food Variant A] — can log in: [unit1 / unit2]
    • [Food Variant B] — can log in: [unit1]
    Which one did you have, and how much?"

STEP 4 — Confirm before logging (MANDATORY):
  Once you have food+quantity+unit matched to a DB entry, calculate the precise totals:
  Ratio = user_quantity / serving_qty.
  Totals = Ratio * base_nutrients (calories, protein, carbs, fat).
  Then call ask_user_clarification with the ACTUAL NUMBERS (do NOT leave the placeholders below as text):
    "Ready to log: [user_quantity] [user_unit] [food name] (~[ACTUAL_CAL] kcal | P [ACTUAL_P]g · C [ACTUAL_C]g · F [ACTUAL_F]g). Log it?"
  Wait for the user to say yes/confirm BEFORE calling commit_to_ledger.
  If user says no or wants a change: adjust and re-confirm.

STEP 5 — Commit:
  Call commit_to_ledger with the confirmed items. Use the matched db_item_id and db_collection.
  NEVER commit without a matched db_item_id from the DB search.

STEP 6 — Handle unit_error from commit:
  If commit returns {unit_error: true}: call ask_user_clarification with the available_units list.
  NEVER retry commit with the same unresolved unit.

FOOD NAMES: name = food only, no quantities. CORRECT: "Roti". WRONG: "5 Roti".
MEAL TIME: Extract if mentioned ("at 8am" → "08:00"). Otherwise OMIT.
MULTI-MEAL: Call commit_to_ledger ONCE PER MEAL TYPE with all its foods.
KEEP MESSAGES SHORT. Do not read the internal unit-ID map aloud.
`.trim();

/**
 * Build a training context block to append to the system prompt.
 * This gives the LLM real data about what the user has done today so it can
 * give workout-aware advice (post-workout protein windows, carb replenishment, etc.).
 */
async function buildTrainingContextBlock(userId) {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [todayWorkouts, user, recentNutritionLogs] = await Promise.all([
      Workout.find({ user: userId, date: { $gte: todayStart } }).sort({ date: -1 }).lean(),
      User.findById(userId).select('biologicalProfile weight clinicalTargets eatingPattern').lean(),
      NutritionLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).select('dailyTotals date').lean(),
    ]);

    const profile = user?.biologicalProfile || {};
    const weightKg = profile.weightKg || user?.weight || 75;
    const proteinTarget = user?.clinicalTargets?.targets?.protein || Math.round(weightKg * 1.6);
    const calTarget = user?.clinicalTargets?.targets?.calories || null;
    const eatingPattern = user?.eatingPattern || profile.eatingPattern || 'traditional_3meal';
    const metabolicGoal = profile.metabolicGoal || 'maintenance';
    const trainingPhase = profile.trainingPhase || null;

    // 7-day protein average
    const logsWithData = recentNutritionLogs.filter(l => (l.dailyTotals?.calories || 0) > 300);
    const avg7dProtein = logsWithData.length > 0
      ? Math.round(logsWithData.reduce((s, l) => s + (l.dailyTotals?.protein || 0), 0) / logsWithData.length)
      : null;

    // Today's workout summary
    let workoutSummary = 'No workout logged today.';
    let postWorkoutWindowOpen = false;
    if (todayWorkouts.length > 0) {
      const w = todayWorkouts[0];
      const exercises = (w.exercises || []).map(e => e.name).filter(Boolean);
      const totalSets = (w.exercises || []).reduce((s, e) => s + (e.sets || []).length, 0);
      const totalVolume = (w.exercises || []).reduce((sum, e) =>
        sum + (e.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0), 0);
      const workoutTime = new Date(w.date);
      const minsAgo = Math.round((now - workoutTime) / 60000);
      postWorkoutWindowOpen = minsAgo <= 90;

      workoutSummary = `Workout logged today: "${w.name || 'Unnamed'}" — ${exercises.slice(0, 5).join(', ')}${exercises.length > 5 ? ` + ${exercises.length - 5} more` : ''}. ${totalSets} sets, ~${Math.round(totalVolume / 1000)}k kg·reps total volume. Completed ${minsAgo} min ago.`;
      if (postWorkoutWindowOpen) {
        workoutSummary += ` POST-WORKOUT WINDOW IS OPEN (${90 - minsAgo} min remaining) — prioritise 25-40g protein now.`;
      }
    }

    const lines = [
      `\n\n--- USER TRAINING CONTEXT (live, do not share raw numbers unprompted) ---`,
      `Body weight: ${weightKg}kg`,
      `Protein target: ${proteinTarget}g/day${calTarget ? ` | Calorie target: ${calTarget} kcal/day` : ''}`,
      `Metabolic goal: ${metabolicGoal}${trainingPhase ? ` (${trainingPhase} phase)` : ''}`,
      `Eating pattern: ${eatingPattern}`,
      avg7dProtein != null ? `7-day avg protein: ${avg7dProtein}g/day (target: ${proteinTarget}g)` : '',
      workoutSummary,
      ``,
      `HOW TO USE THIS CONTEXT:`,
      `- If the post-workout window is open, gently note it after logging food and suggest a protein source if the meal is low-protein.`,
      `- If the user's 7-day avg protein is below 80% of target, mention it briefly when logging low-protein meals.`,
      `- If eating pattern is IF/OMAD, do not flag lopsided protein distribution as a problem.`,
      `- Do NOT lecture unprompted. One short sentence max when the context is relevant.`,
      `--- END TRAINING CONTEXT ---`,
    ].filter(Boolean);

    return lines.join('\n');
  } catch (err) {
    console.warn('[NutritionAgent] Failed to build training context:', err.message);
    return '';
  }
}


// ── Session class ─────────────────────────────────────────────────────────────

class NutritionAgentSession {
  constructor(userId, systemPrompt) {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set. Cannot run Nutrition Agent.');
    }
    this.userId = userId;
    this.userMealSchedule = null; // populated by caller
    this.messageHistory = [{ role: 'system', content: systemPrompt || NUTRITION_SYSTEM_PROMPT_BASE }];
    this.committedMealId = null; // track last committed meal for undo
  }

  /**
   * Preferred construction path — injects live training context into the system prompt.
   * Falls back to base prompt if context fetch fails so the agent always starts.
   */
  static async create(userId) {
    const trainingCtx = await buildTrainingContextBlock(userId);
    const fullPrompt = NUTRITION_SYSTEM_PROMPT_BASE + (trainingCtx || '');
    return new NutritionAgentSession(userId, fullPrompt);
  }

  async handleVoiceInput(transcript) {
    console.log(`[NutritionAgent] Incoming transcript: "${transcript}"`);
    this.messageHistory.push({ role: 'user', content: transcript });

    let loopCount = 0;
    while (loopCount < 6) {
      loopCount++;

      const payload = {
        model: NUTRITION_AGENT_MODEL,
        messages: this.messageHistory,
        tools: nutritionTools,
        tool_choice: 'auto',
        temperature: 0.2,
      };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[NutritionAgent] FULL Groq error:', errText.slice(0, 800));
        throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const messageResponse = data.choices?.[0]?.message;
      if (!messageResponse) break;

      this.messageHistory.push(messageResponse);

      if (messageResponse.tool_calls?.length > 0) {
        for (const toolCall of messageResponse.tool_calls) {
          const { id, function: func } = toolCall;
          
          let args;
          try {
            args = JSON.parse(func.arguments || '{}');
            console.log(`[NutritionAgent] Tool: ${func.name}`, JSON.stringify(args).slice(0, 120));
          } catch(e) {
            console.error(`[NutritionAgent] Malformed tool arguments from LLM for ${func.name}:`, func.arguments);
            this.messageHistory.push({
              role: 'tool',
              tool_call_id: id,
              name: func.name,
              content: JSON.stringify({ error: 'Malformed JSON arguments. Please call the tool again with valid JSON.' })
            });
            continue;
          }

          let result = {};
          if (func.name === 'search_db_and_estimate') {
            result = await this._searchDB(args.food_string);
          } else if (func.name === 'ask_user_clarification') {
            return { audioResponseText: args.question_to_ask, isComplete: false, foodLogged: false };
          } else if (func.name === 'commit_to_ledger') {
            result = await this._commit(args);
          }

          this.messageHistory.push({
            role: 'tool',
            tool_call_id: id,
            name: func.name,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      if (messageResponse.content) {
        return {
          audioResponseText: messageResponse.content,
          isComplete: true,
          foodLogged: this.committedMealId !== null,
          committedMealId: this.committedMealId,
        };
      }
    }

    return { audioResponseText: 'I had trouble processing that. Please try again.', isComplete: false, foodLogged: false };
  }

  // ── private methods ─────────────────────────────────────────────────────────

  async _searchDB(foodString) {
    if (!foodString) return { status: 'no_input', message: 'Database temporarily unavailable. Tell the user you cannot look up nutrition data right now and ask them to try again in a moment.' };
    if (!IndbFood) return { status: 'db_unavailable', message: 'Database temporarily unavailable. Tell the user you cannot look up nutrition data right now and ask them to try again in a moment.' };

    try {
      const queryVector = await getCachedEmbedding(foodString);

      const trySearch = async (Model, modelName) => {
        if (!Model) return [];
        try {
          const results = await Model.aggregate([
            {
              $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector,
                numCandidates: 100,
                limit: 15, // Get top 15 per collection to capture all unit variants
              },
            },
            { $project: { displayName: 1, columns: 1, score: { $meta: 'vectorSearchScore' } } },
          ]);
          return results.map(r => ({ ...r, modelName }));
        } catch (err) {
          console.warn(`[NutritionAgent] vectorSearch error on ${modelName}:`, err.message);
        }
        return [];
      };

      const [indb, tarla, mfp] = await Promise.all([
        trySearch(IndbFood, 'IndbFood'),
        trySearch(TarlaFood, 'TarlaFood'),
        trySearch(MfpFood, 'MfpFood')
      ]);

      const allCandidates = [...indb, ...tarla, ...mfp].sort((a, b) => b.score - a.score);

      // Log top candidates for debugging
      console.log(`[NutritionAgent] Top candidates for "${foodString}":`,
        allCandidates.slice(0, 6).map(c => `${c.displayName} (${c.score?.toFixed(3)})`).join(', ')
      );

      if (allCandidates.length === 0 || allCandidates[0].score <= 0.75) {
        return { status: 'not_found', food: foodString, message: `"${foodString}" was not found in the database. Do NOT invent or estimate nutrition. Tell the user you cannot log this food.` };
      }

      // --- Same-dish filter ---
      // Priority: score >= 0.88 (strong match) OR score >= 0.80 AND name contains a query word
      const SCORE_HARD   = 0.88; // always include
      const SCORE_SOFT   = 0.80; // include only if name contains query word
      const queryWords   = foodString.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      const sameDishCandidates = allCandidates
        .filter(c => {
          if (c.score < SCORE_SOFT) return false;
          if (c.score >= SCORE_HARD) return true; // strong semantic hit
          // Medium score: name must contain at least one user query word
          const cName = c.displayName.toLowerCase();
          return queryWords.length === 0 || queryWords.some(w => cName.includes(w));
        })
        .slice(0, 5); // hard cap at 5 candidates max

      // Build all_units: one entry per unique (food_name, unit) combo, ordered by score
      const all_units = [];
      const seenKeys = new Set();
      for (const c of sameDishCandidates) {
        const mapped = toSearchResult(c);
        const unit = String(mapped.servingUnit || 'g').toLowerCase().trim();
        const key  = `${c.displayName.toLowerCase()}||${unit}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        all_units.push({
          db_item_id:       c._id.toString(),
          db_collection:    c.modelName,
          food_name:        c.displayName,
          serving_qty:      mapped.servingQty || 1,
          serving_unit:     mapped.servingUnit || 'g',
          serving_weight_g: mapped.servingWeightG || null,
          unit,
          // Base nutrients for the AI to calculate confirmation totals
          calories:         mapped.calories || 0,
          protein:          mapped.protein || 0,
          carbs:            mapped.carbs || 0,
          fat:              mapped.fat || 0,
        });
      }

      if (all_units.length === 0) {
        return { status: 'not_found', food: foodString, message: `"${foodString}" was not found in the database. Do NOT invent or estimate nutrition. Tell the user you cannot log this food.` };
      }

      // Group by food variant name for the clarification message
      const variantMap = {};
      for (const u of all_units) {
        if (!variantMap[u.food_name]) variantMap[u.food_name] = [];
        variantMap[u.food_name].push(u.unit);
      }
      const variantLines = Object.entries(variantMap)
        .map(([name, units]) => `  • ${name} — available in: [${units.join(', ')}]`)
        .join('\n');

      const primary    = all_units[0];
      const displayMax = 4; // never show more than 4 options to the user
      const topUnits   = all_units.slice(0, displayMax);
      const topVariantLines = Object.entries(
        topUnits.reduce((m, u) => { (m[u.food_name] = m[u.food_name] || []).push(u.unit); return m; }, {})
      ).map(([name, units]) => `• ${name} (${units.join(' / ')})`).join('\n');

      const unitSummary = all_units.map(u => `"${u.food_name}" in "${u.unit}" → db_item_id:${u.db_item_id} db_collection:${u.db_collection}`).join(' | ');

      return {
        status: 'found',
        food_name:    primary.food_name,
        primary_unit: primary.serving_unit,
        all_units,
        message:
`FOUND ${all_units.length} option(s) for "${foodString}". Showing top ${topUnits.length}:
${topVariantLines}

IF user already gave quantity+unit → match & COMMIT immediately.
IF user did NOT give quantity → call ask_user_clarification with this SHORT message (do NOT read the full unit-ID map aloud):
  "I found a few options for '${foodString}':\n${topVariantLines}\nWhich one, and how much?"

WHEN user replies → match food+unit from all_units → COMMIT with matched db_item_id.
NEVER commit unmatched. NEVER estimate.

Full unit-ID map (internal, DO NOT speak aloud): ${unitSummary}`,
      };

    } catch (err) {
      console.error('[NutritionAgent] DB search error:', err.message);
      return { status: 'error', message: 'DB error. Cannot estimate. Tell the user there was a database error.' };
    }
  }


  /** Default meal times used when user provides no explicit time and profile has no schedule */
  static defaultMealTime(mealType) {
    const defaults = { breakfast: '08:00', lunch: '13:00', dinner: '20:00', snack: '16:00' };
    return defaults[String(mealType).toLowerCase()] || '12:00';
  }

  async _commit({ meal_type, meal_time, items }) {
    if (!this.userId || !items?.length) {
      return { success: false, error: 'No items to commit.' };
    }

    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    // Resolve meal time: (1) LLM-extracted from message, (2) user profile schedule, (3) current wall-clock time
    const mealTypeKey = String(meal_type || 'snack').toLowerCase();
    const fallbackTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const resolvedTime =
      meal_time ||
      (this.userMealSchedule && this.userMealSchedule[mealTypeKey]) ||
      fallbackTime;

    let log = await NutritionLog.findOne({
      user: this.userId,
      date: { $gte: start, $lt: end },
    }).sort({ date: -1 });

    if (!log) {
      log = new NutritionLog({
        user: this.userId,
        date: start,
        meals: [],
        supplements: [],
        waterIntake: 0,
        dailyTotals: {},
      });
    }

    const foodsArray = await Promise.all(items.map(async item => {
        // Support both new (user_quantity/user_unit) and legacy (quantity/unit) field names
        const userQty  = Number(item.user_quantity ?? item.quantity ?? 1);
        const userUnit = String(item.user_unit   || item.unit || 'g').toLowerCase().trim();

        let baseObj = {
          name:                 String(item.name || ''),
          quantity:             userQty,
          unit:                 userUnit,
          calories:             Number(item.calories || 0),
          protein:              Number(item.protein || 0),
          carbs:                Number(item.carbs || 0),
          fat:                  Number(item.fat || 0),
          fiber:                Number(item.fiber || 0),
          sugar:                Number(item.sugar || 0),
          sodium:               Number(item.sodium || 0),
          potassium:            Number(item.potassium || 0),
          iron:                 Number(item.iron || 0),
          calcium:              Number(item.calcium || 0),
          vitaminB:             Number(item.vitaminB || 0),
          magnesium:            Number(item.magnesium || 0),
          zinc:                 Number(item.zinc || 0),
          vitaminC:             Number(item.vitaminC || 0),
          omega3:               Number(item.omega3 || 0),
          saturatedFat:         Number(item.saturatedFat || 0),
          monounsaturatedFat:   Number(item.monounsaturatedFat || 0),
          polyunsaturatedFat:   Number(item.polyunsaturatedFat || 0),
          cholesterol:          Number(item.cholesterol || 0),
          phosphorus:           Number(item.phosphorus || 0),
          copper:               Number(item.copper || 0),
          vitaminB9:            Number(item.vitaminB9 || 0),
          vitaminB12:           Number(item.vitaminB12 || 0),
          folate:               Number(item.folate || 0),
          sourceFoodId:         'llm-agent-estimate',
          sourceKind:           'chat-agent',
        };

        if (item.db_item_id && item.db_collection) {
          try {
            let Model;
            if (item.db_collection === 'IndbFood') Model = IndbFood;
            else if (item.db_collection === 'TarlaFood') Model = TarlaFood;
            else if (item.db_collection === 'MfpFood') Model = MfpFood;

            if (Model) {
              const doc = await Model.findById(item.db_item_id);
              if (doc) {
                const mapped = toSearchResult(doc);
                const dbUnit = String(mapped.servingUnit || 'g').trim();
                const dbQty  = mapped.servingQty || 1;
                const normalize = u => {
                  let n = u.toLowerCase().replace(/s$/, '').trim();
                  if (n === 'gram' || n === 'gm' || n === 'ml') return 'g';
                  if (n === 'pc' || n === 'pcs') return 'piece';
                  return n;
                };
                const userUnitNorm = normalize(userUnit);
                const dbUnitNorm   = normalize(dbUnit);
                const dbIsGram   = dbUnitNorm === 'g';
                const userIsGram = userUnitNorm === 'g';

                let ratio = null; // null = no valid resolution found

                if (userUnitNorm === dbUnitNorm) {
                  // ✅ Case 1: Exact unit match → direct ratio
                  ratio = userQty / dbQty;
                } else if (mapped.servingWeightG) {
                  // ✅ Case 2: Different units but DB has gram-weight bridge
                  if (userIsGram && !dbIsGram) {
                    // User gave grams, DB is pieces → userGrams / gramsPerPiece = pieces
                    ratio = userQty / mapped.servingWeightG;
                  } else if (!userIsGram && dbIsGram) {
                    // User gave pieces, DB is grams → pieces × gramsPerPiece / dbQty
                    ratio = (userQty * mapped.servingWeightG) / dbQty;
                  } else {
                    // Both non-gram different units with weight bridge → use weight bridge
                    ratio = userQty / dbQty;
                  }
                }
                // else: ratio stays null — unit mismatch with no bridge

                if (ratio === null || !Number.isFinite(ratio)) {
                  // ❌ Hard reject: cannot resolve units without estimation
                  console.warn(`[NutritionAgent] Unit mismatch or invalid ratio for ${item.name}: user=${userUnit}, db=${dbUnit}, ratio=${ratio}. Rejecting.`);
                  return {
                    ...baseObj, // keep LLM estimates only
                    _unitError: true,
                    _availableUnit: dbUnit,
                    _rejectedUnit: userUnit,
                  };
                }

                console.log(`[NutritionAgent] Commit ratio for ${item.name}: userQty=${userQty} ${userUnit}, dbQty=${dbQty} ${dbUnit}, servingWeightG=${mapped.servingWeightG}, ratio=${ratio.toFixed(4)}`);
                baseObj.quantity        = userQty;
                baseObj.unit            = userUnit;
                baseObj.baseServingQty  = mapped.servingQty;
                baseObj.baseServingUnit = mapped.servingUnit;
                baseObj.servingLabel    = mapped.servingLabel;
                baseObj.servingWeightG  = mapped.servingWeightG;
                baseObj.sourceFoodId    = mapped.id;
                baseObj.sourceKind      = mapped._local?.kind || 'db';
                baseObj.name            = mapped.name; // Use exact DB name

                const FOOD_NUTRIENT_FIELDS = [
                  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'potassium',
                  'iron', 'calcium', 'vitaminB', 'vitaminB12', 'magnesium', 'zinc', 'vitaminC',
                  'omega3', 'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat',
                  'cholesterol', 'phosphorus', 'copper', 'selenium', 'manganese', 'vitaminA',
                  'vitaminE', 'vitaminD', 'folate'
                ];
                FOOD_NUTRIENT_FIELDS.forEach(field => {
                  const baseVal = Number(mapped[field] || 0);
                  if (Number.isFinite(baseVal)) {
                    baseObj[`${field}_base`] = baseVal;
                    baseObj[field] = Math.round(baseVal * ratio * 100) / 100;
                  } else {
                    baseObj[field] = 0;
                  }
                });
              }
            }
          } catch(e) {
            console.warn('[NutritionAgent] Failed to load db_item_id in commit:', e.message);
          }
        }
        return baseObj;
    }));

    // ── Hard gatekeeper: abort if any item has an unresolvable unit mismatch ──
    const unitErrors = foodsArray.filter(f => f._unitError);
    if (unitErrors.length > 0) {
      const errorDetails = unitErrors.map(f => 
        `"${f.name}": you said "${f._rejectedUnit}" but DB only has "${f._availableUnit}"`
      ).join('; ');
      const availableUnits = [...new Set(unitErrors.map(f => f._availableUnit))];
      return {
        success: false,
        unit_error: true,
        available_units: availableUnits,
        message: `Unit mismatch — cannot log: ${errorDetails}. Please ask the user to specify in one of these units: [${availableUnits.join(', ')}]. Do NOT estimate or commit without the correct unit.`,
      };
    }

    // TASK 4: Zero-calorie commit guard
    for (const item of foodsArray) {
      const foodNameStr = String(item.name || '').toLowerCase();
      const isKnownZeroCalorie = /^(water|black coffee|tea|plain tea|sparkling water|herbal tea)/.test(foodNameStr);
      if (!isKnownZeroCalorie && (!item.calories || item.calories === 0)) {
        return { success: false, error: `Nutrition data not found for "${item.name}". Please try a different name.` };
      }
    }

    const mealName = foodsArray.map(f => f.name).join(' + ');
    const newMeal = {
      name: mealName,
      mealType: mealTypeKey,
      time: resolvedTime,
      foods: foodsArray,
    };

    // Compute per-meal totals with NaN safety
    const sumSafe = (arr, field) => arr.reduce((s, f) => s + (Number(f[field]) || 0), 0);
    newMeal.totalCalories = sumSafe(newMeal.foods, 'calories');
    newMeal.totalProtein  = sumSafe(newMeal.foods, 'protein');
    newMeal.totalCarbs    = sumSafe(newMeal.foods, 'carbs');
    newMeal.totalFat      = sumSafe(newMeal.foods, 'fat');

    // TASK 7: Duplicate meal guard — reject if same name+type was logged in the last 5 minutes
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const isDuplicate = log.meals.some(m =>
      m.name === newMeal.name &&
      m.mealType === newMeal.mealType &&
      new Date(m.mealTime || m.createdAt || 0).getTime() > fiveMinAgo
    );
    if (isDuplicate) {
      return { success: false, alreadyLogged: true, message: 'This meal was already logged recently.' };
    }

    log.meals.push(newMeal);
    log.dailyTotals = recalcDailyTotals(log);

    try {
      await log.save();
      console.log(`[NutritionAgent] DATABASE SAVE SUCCESSFUL for user ${this.userId} on ${start.toISOString()}`);
      const savedMeal = log.meals[log.meals.length - 1];
      this.committedMealId = {
        logId: log._id.toString(),
        mealId: (savedMeal && savedMeal._id ? savedMeal._id.toString() : ''),
        mealIndex: log.meals.length - 1,
      };
    } catch (saveErr) {
      console.error('[NutritionAgent] DATABASE SAVE FAILED:', saveErr);
      throw new Error(`Database save failed: ${saveErr.message}`);
    }

    // BUG 3 FIX: correct signature { userId, date, reason }
    try {
      triggerDailyLifeStateRecompute({ userId: this.userId, date: start, reason: 'chat_food_log' });
    } catch (e) {
      console.error('[NutritionAgent] triggerDailyLifeStateRecompute failed:', e.message);
    }

    const totalCal = Math.round(newMeal.totalCalories);
    const totalPro = Math.round(newMeal.totalProtein * 10) / 10;
    const totalCar = Math.round(newMeal.totalCarbs * 10) / 10;
    const totalFat = Math.round(newMeal.totalFat * 10) / 10;

    return {
      success: true,
      summary: `${mealName} — ${totalCal} kcal | P ${totalPro}g | C ${totalCar}g | F ${totalFat}g`,
      logId: log._id.toString(),
      mealIndex: log.meals.length - 1,
    };
  }
}

module.exports = { NutritionAgentSession };