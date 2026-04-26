const { NutritionLog } = require('../../models/Logs');
const { triggerDailyLifeStateRecompute } = require('../dailyLifeState/triggerDailyLifeStateRecompute');
const { getEmbedding } = require('./embeddingService');

let IndbFood;
try { IndbFood = require('../../models/IndbFood'); } catch { IndbFood = null; }

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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
      description: 'Searches the local food database by semantic similarity. If no confident match is found, estimate nutrients inside commit_to_ledger.',
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
      description: 'Use ONLY for critical unresolvable ambiguity (e.g., "chicken" with no context at all).',
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
      description: 'Saves the finalised nutritional data to the user\'s daily log. Always estimate ALL tracked nutrients, not just macros.',
      parameters: {
        type: 'object',
        properties: {
          meal_type: { type: 'string', description: 'breakfast | snack | lunch | dinner' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:                 { type: 'number' },
                quantity:             { type: 'number' },
                unit:                 { type: 'string' },
                calories:             { type: 'number' },
                protein:              { type: 'number' },
                carbs:                { type: 'number' },
                fat:                  { type: 'number' },
                fiber:                { type: 'number' },
                sugar:                { type: 'number' },
                sodium:               { type: 'number' },
                potassium:            { type: 'number' },
                iron:                 { type: 'number' },
                calcium:              { type: 'number' },
                vitaminB:             { type: 'number' },
                magnesium:            { type: 'number' },
                zinc:                 { type: 'number' },
                vitaminC:             { type: 'number' },
                omega3:               { type: 'number' },
                saturatedFat:         { type: 'number' },
                monounsaturatedFat:   { type: 'number' },
                polyunsaturatedFat:   { type: 'number' },
                cholesterol:          { type: 'number' },
                phosphorus:           { type: 'number' },
                copper:               { type: 'number' },
                vitaminB9:            { type: 'number' },
                vitaminB12:           { type: 'number' },
                folate:               { type: 'number' },
              },
              required: ['name', 'quantity', 'unit', 'calories', 'protein', 'carbs', 'fat'],
            },
          },
        },
        required: ['meal_type', 'items'],
      },
    },
  },
];

const NUTRITION_SYSTEM_PROMPT = `
You are a highly precise nutrition logging assistant for an Indian health app.
You receive natural-language descriptions of what the user ate and log them accurately.

Tools:
1. search_db_and_estimate — semantic DB lookup. Use it for each distinct food item.
2. ask_user_clarification — only for genuinely unresolvable ambiguity.
3. commit_to_ledger — ALWAYS call this to finalise the log.

RULES:
- Assume standard Indian portion sizes unless told otherwise (e.g., 1 roti ≈ 30g, 1 katori dal ≈ 150g).
- If quantity is ambiguous, make a reasonable assumption and state it in your reply.
- When committing, fill ALL nutrient fields with good estimates (not just calories/protein/carbs/fat).
- After successful commit, reply with a concise confirmation: food names, quantities, total calories, macros summary.
- Never ask multiple clarifying questions in sequence. One question max — then commit with your best estimate.
`.trim();

// ── Session class ─────────────────────────────────────────────────────────────

class NutritionAgentSession {
  constructor(userId) {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set. Cannot run Nutrition Agent.');
    }
    this.userId = userId;
    this.messageHistory = [{ role: 'system', content: NUTRITION_SYSTEM_PROMPT }];
    this.committedMealId = null; // track last committed meal for undo
  }

  async handleVoiceInput(transcript) {
    this.messageHistory.push({ role: 'user', content: transcript });

    let loopCount = 0;
    while (loopCount < 6) {
      loopCount++;

      const payload = {
        model: GROQ_MODEL,
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
        throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const messageResponse = data.choices?.[0]?.message;
      if (!messageResponse) break;

      this.messageHistory.push(messageResponse);

      if (messageResponse.tool_calls?.length > 0) {
        for (const toolCall of messageResponse.tool_calls) {
          const { id, function: func } = toolCall;
          const args = JSON.parse(func.arguments || '{}');
          console.log(`[NutritionAgent] Tool: ${func.name}`, JSON.stringify(args).slice(0, 120));

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
    if (!foodString) return { status: 'no_input', message: 'Estimate all nutrients.' };
    if (!IndbFood) return { status: 'db_unavailable', message: 'DB not connected. Estimate all nutrients.' };

    try {
      const queryVector = await getEmbedding(foodString);
      const results = await IndbFood.aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: 10,
            limit: 1,
          },
        },
        { $project: { displayName: 1, score: { $meta: 'vectorSearchScore' } } },
      ]);

      if (results?.length > 0 && results[0].score > 0.85) {
        return { status: 'found', food: results[0].displayName, message: 'Use standard portion scaling.' };
      }
      return { status: 'not_found', food: foodString, message: 'Estimate all macros and micronutrients using your knowledge.' };
    } catch (err) {
      console.error('[NutritionAgent] DB search error:', err.message);
      return { status: 'error', message: 'DB error. Estimate all nutrients.' };
    }
  }

  async _commit({ meal_type, items }) {
    if (!this.userId || !items?.length) {
      return { success: false, error: 'No items to commit.' };
    }

    const now = new Date();
    const start = startOfDay(now);
    const end = endOfDay(now);

    // BUG 1 FIX: query by date range, not dayKey
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

    const mealName = items.map(i => i.name).join(' + ');
    const newMeal = {
      name: mealName,
      mealType: (meal_type || 'snack').toLowerCase(),
      time: now.toTimeString().slice(0, 5),
      foods: items.map(item => ({
        name:                 String(item.name || ''),
        quantity:             Number(item.quantity || 1),
        unit:                 String(item.unit || 'g'),
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
      })),
    };

    // Compute per-meal totals
    newMeal.totalCalories = newMeal.foods.reduce((s, f) => s + f.calories, 0);
    newMeal.totalProtein  = newMeal.foods.reduce((s, f) => s + f.protein, 0);
    newMeal.totalCarbs    = newMeal.foods.reduce((s, f) => s + f.carbs, 0);
    newMeal.totalFat      = newMeal.foods.reduce((s, f) => s + f.fat, 0);

    log.meals.push(newMeal);

    // BUG 2 FIX: recompute dailyTotals after adding meal
    log.dailyTotals = recalcDailyTotals(log);

    await log.save();

    // Track the meal index for potential undo
    this.committedMealId = { logId: log._id.toString(), mealIndex: log.meals.length - 1 };

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