const { MentalLog, NutritionLog, WeightLog } = require('../../models/Logs');
const User = require('../../models/User');
const { dayKeyFromDate } = require('../dailyLifeState/dayKey');

// ── helpers ───────────────────────────────────────────────────────────────────

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.max(min, Math.min(max, x));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

// ── parsers (unchanged from original) ────────────────────────────────────────

function parseSleepHours(text) {
  const s = String(text || '').toLowerCase();
  let m = s.match(/\b(?:slept|sleep)\s*(?:for\s*)?(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (!m) m = s.match(/\b(?:got|had)\s*(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:of\s*)?sleep\b/);
  if (!m) m = s.match(/\bslept\s*(?:for\s*)?(\d{1,2}(?:\.\d)?)\b/);
  if (!m) return null;
  const hours = clamp(m[1], 0, 24);
  if (hours == null || hours > 16) return null;
  if (/(?:^|\s)\/\s*(?:10|ten)\b/.test(s.slice(m.index + m[0].length))) return null;
  return hours;
}

function parseNumberToken10(token) {
  const raw = String(token || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return clamp(raw, 1, 10);
  const map = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
  return Object.prototype.hasOwnProperty.call(map, raw) ? map[raw] : null;
}

function parseScale10(text, label) {
  const s = String(text || '').toLowerCase();
  const labelPattern = `${label}(?:\\s*level)?`;
  const numToken = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)';
  const sep = '(?:\\s*(?:(?:[:=])|is|was|at)?\\s*)';
  const reExplicit = new RegExp(`\\b${labelPattern}\\b${sep}${numToken}\\s*(?:\\/\\s*(?:10|ten)|out\\s*of\\s*(?:10|ten))\\b`);
  const mExplicit = s.match(reExplicit);
  if (mExplicit) return parseNumberToken10(mExplicit[1]);
  const reBare = new RegExp(`\\b${labelPattern}\\b${sep}${numToken}\\b`);
  const mBare = s.match(reBare);
  if (mBare) return parseNumberToken10(mBare[1]);
  return null;
}

function parseMoodEnum(text) {
  const s = String(text || '').toLowerCase();
  const m = s.match(/\bmood\s*[:=]?\s*(very\s*low|very-low|low|neutral|good|great)\b/);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '-');
  return ['very-low', 'low', 'neutral', 'good', 'great'].includes(raw) ? raw : null;
}

function parseWaterMl(text) {
  const s = String(text || '').toLowerCase();
  const m = s.match(/\b(?:water|hydration|drank)\s*(\d+(?:\.\d+)?)\s*(ml|l|liter|liters)\b/);
  if (!m) return null;
  const qty = Number(m[1]);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const ml = m[2] === 'ml' ? qty : qty * 1000;
  const rounded = Math.round(ml);
  return rounded > 10000 ? null : rounded;
}

function parseWeight(text) {
  const s = String(text || '').toLowerCase();
  // Matches "weight 75", "weight is 75.5", "75kg", "75.5 kg", "weighed 75.5"
  const m = s.match(/\b(?:weight|weighed|is|at)?\s*(\d{2,3}(?:\.\d)?)\s*(?:kg|kilo|kilos)?\b/);
  if (!m) return null;
  // If no weight-specific keyword, check if it's "75 kg"
  if (!/weight|weighed/.test(s) && !/kg|kilo/.test(s)) return null;

  const val = Number(m[1]);
  if (val < 30 || val > 300) return null; // safety bounds
  return val;
}

// ── NEW: Food intent detection ────────────────────────────────────────────────

/**
 * Returns true when the message looks like a meal/food log description.
 * Conservative: requires at least ONE food signal + ONE quantity/food-context word.
 * Will NOT fire on greetings, questions, or general wellness statements.
 */
function detectFoodLogIntent(message) {
  const s = String(message || '').toLowerCase().trim();
  if (!s) return false;

  // Exclude clear questions (unless they contain food words)
  const hasQuestionStart = /^(why|what|how|when|where|who|do|does|did|am|are|is|can|could|would|should|will|have|has)\b/.test(s);
  const endsWithQuestion = s.endsWith('?');
  
  // Food/ingredient words (Indian + common)
  const hasFoodWord = /\b(roti|chapati|rice|dal|daal|sabzi|curry|paratha|idli|dosa|upma|poha|egg|eggs|chicken|paneer|tofu|salad|bread|oats|yogurt|curd|milk|protein|shake|smoothie|soup|fruit|banana|apple|mango|sandwich|toast|pasta|noodles|pizza|burger|coffee|tea|chai|juice|water|glass|bowl|cup|plate|serving|spoon|grams|kg)\b/i.test(s);
  
  // If it's a question but has a food word, it might be "Can I log idli?" -> let the agent handle it
  if ((hasQuestionStart || endsWithQuestion) && !hasFoodWord) return false;

  // Must NOT be a pure wellness / mood statement
  const wellnessOnly = /^(feeling|i feel|my stress|my energy|my mood|slept|woke up|tired|stressed|anxious|happy|sad|energy level)/i.test(s);
  if (wellnessOnly && !/(ate|had|eat|breakfast|lunch|dinner|snack|drank|cup|bowl|plate|roti|rice|dal|protein)/i.test(s)) return false;

  // Food verb signals — strong indicator
  const hasFoodVerb = /\b(ate|had|eat|eaten|drinking|drank|having|finished|consumed|ordered|made|log|logging|logged)\b/i.test(s);

  // Meal context signals
  const hasMealContext = /\b(breakfast|lunch|dinner|snack|meal|brunch)\b/i.test(s);

  // Quantity signals
  const hasQuantity = /\b(\d+\s*(g|kg|ml|l|cup|cups|bowl|bowls|plate|plates|roti|chapati|piece|pieces|slice|slices|serving|scoop)|\d+\s+\w+)\b/i.test(s);

  // Indefinite article quantity (e.g. "a bowl of", "half a plate")
  const hasIndefiniteQty = /\b(a|an|one|half|quarter)\s+(bowl|cup|plate|glass|slice|piece|scoop|serving|handful|portion)\b/i.test(s);

  const combinedQuantity = hasQuantity || hasIndefiniteQty;

  // Question guard: questions without a food verb are advisory, not logging
  const isQuestion = hasQuestionStart || s.endsWith('?');
  if (isQuestion && !hasFoodVerb) return false;

  // Lenient check: (Verb OR Context OR Quantity OR just a food name alone)
  // We'll allow (Verb OR Context OR Quantity) AND (Food Word)
  // OR just (Verb AND Quantity)
  return (hasFoodVerb || hasMealContext || combinedQuantity) && hasFoodWord || (hasFoodVerb && combinedQuantity);
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function upsertTodayMentalLog({ userId, now, patch }) {
  const start = startOfDay(now);
  const end = endOfDay(now);
  const existing = await MentalLog.findOne({ user: userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
  if (existing) {
    Object.assign(existing, patch);
    return existing.save();
  }
  return MentalLog.create({ user: userId, date: now, ...patch });
}

async function upsertTodayNutritionLog({ userId, now, patch }) {
  const start = startOfDay(now);
  const end = endOfDay(now);
  const existing = await NutritionLog.findOne({ user: userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
  if (existing) {
    Object.assign(existing, patch);
    return existing.save();
  }
  return NutritionLog.create({ user: userId, date: now, ...patch });
}
async function upsertTodayWeightLog({ userId, now, weightKg }) {
  const start = startOfDay(now);
  const end = endOfDay(now);
  const existing = await WeightLog.findOne({ user: userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
  
  if (existing) {
    existing.weightKg = weightKg;
    await existing.save();
  } else {
    await WeightLog.create({ user: userId, date: now, weightKg });
  }

  // Update user profile with latest weight
  const latestWeight = await WeightLog.findOne({ user: userId }).sort({ date: -1 });
  if (latestWeight) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        weight: latestWeight.weightKg,
        'biologicalProfile.weightKg': latestWeight.weightKg
      }
    });
  }
}

// ── Food logging via Nutrition Agent ─────────────────────────────────────────

const SESSION_TTL = 15 * 60 * 1000; // 15 minutes

async function tryLogFoodViaAgent({ userId, message }) {
  try {
    const { NutritionAgentSession } = require('../nutritionAI/nutritionAgent');

    // Use a persistent session ID based on userId for chat-based logging
    const sessionId = `chat_session_${userId}`;
    if (!global.agentSessions) global.agentSessions = {};

    let agent = global.agentSessions[sessionId];

    // TTL check: expire sessions older than 15 minutes
    if (agent && agent.createdAt && Date.now() - agent.createdAt > SESSION_TTL) {
      delete global.agentSessions[sessionId];
      agent = null;
    }

    if (!agent) {
      agent = await NutritionAgentSession.create(userId);
      agent.createdAt = Date.now();
      global.agentSessions[sessionId] = agent;
    }
    
    // Fetch user to pass meal schedule defaults (only once or update if needed)
    if (!agent.userMealSchedule) {
      const user = await User.findById(userId).select('mealSchedule').lean();
      if (user && user.mealSchedule) {
        agent.userMealSchedule = user.mealSchedule;
      }
    }

    const result = await agent.handleVoiceInput(message);

    // If the agent is complete (session ended), delete it to prevent sticky sessions
    if (result.isComplete) {
      delete global.agentSessions[sessionId];
    }

    return {
      handled: true,
      foodLogged: result.foodLogged || false,
      agentReply: result.audioResponseText || null,
      committedMealId: result.committedMealId || null,
      isComplete: result.isComplete,
    };
  } catch (err) {
    console.error('[ingestFromChat] Food agent error:', err.message);
    return { handled: false, foodLogged: false, agentReply: null, error: err.message };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Deterministic chat ingestion — extracts wellness signals AND detects food logs.
 *
 * Returns:
 *  { ingested, dayKey, updates, foodIngestion? }
 */
async function ingestFromChat({ userId, message, now = new Date() }) {
  if (!userId) return { ingested: false, dayKey: null, updates: [] };

  const updates = [];

  // ── 1. Wellness signal extraction (unchanged) ──────────────────────────────
  const sleepHours  = parseSleepHours(message);
  const stressLevel = parseScale10(message, 'stress');
  const energyLevel = parseScale10(message, 'energy');
  const mood        = parseMoodEnum(message);
  const waterMl     = parseWaterMl(message);
  const weightKg    = parseWeight(message);

  const mentalPatch = {};
  if (sleepHours  != null) mentalPatch.sleepHours  = sleepHours;
  if (stressLevel != null) mentalPatch.stressLevel = stressLevel;
  if (energyLevel != null) mentalPatch.energyLevel = energyLevel;
  if (mood)                mentalPatch.mood        = mood;

  if (Object.keys(mentalPatch).length) {
    await upsertTodayMentalLog({ userId, now, patch: mentalPatch });
    updates.push({ model: 'MentalLog', patch: mentalPatch });
  }

  // Weight check
  if (weightKg != null) {
    await upsertTodayWeightLog({ userId, now, weightKg });
    updates.push({ model: 'WeightLog', patch: { weightKg } });
  }

  // Water intake
  if (waterMl != null) {
    const start = startOfDay(now);
    const end = endOfDay(now);
    const existing = await NutritionLog.findOne({ user: userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
    if (existing) {
      existing.waterIntake = (Number(existing.waterIntake) || 0) + waterMl;
      await existing.save();
      updates.push({ model: 'NutritionLog', patch: { waterIntakeDeltaMl: waterMl, waterIntakeTotalMl: existing.waterIntake } });
    } else {
      const created = await upsertTodayNutritionLog({ userId, now, patch: { waterIntake: waterMl } });
      updates.push({ model: 'NutritionLog', patch: { waterIntakeDeltaMl: waterMl, waterIntakeTotalMl: created.waterIntake } });
    }
  }

  // ── 2. Food intent detection → Nutrition Agent ────────────────────────────
  let foodIngestion = null;
  const sessionId = `chat_session_${userId}`;
  // Expire stale sessions before checking for active session
  if (global.agentSessions && global.agentSessions[sessionId]) {
    const s = global.agentSessions[sessionId];
    if (s.createdAt && Date.now() - s.createdAt > SESSION_TTL) {
      delete global.agentSessions[sessionId];
    }
  }
  const hasActiveSession = global.agentSessions && global.agentSessions[sessionId];
  
  if (detectFoodLogIntent(message) || hasActiveSession) {
    console.log(`[ingestFromChat] Routing to NutritionAgentSession: intent=${detectFoodLogIntent(message)}, active=${!!hasActiveSession}`);
    foodIngestion = await tryLogFoodViaAgent({ userId, message });
    if (foodIngestion.foodLogged) {
      updates.push({ model: 'NutritionLog', patch: { mealLogged: true, committedMealId: foodIngestion.committedMealId } });
    }
  }

  const dayKey = dayKeyFromDate(now);
  return {
    ingested: updates.length > 0,
    dayKey,
    updates,
    foodIngestion,
  };
}

module.exports = { ingestFromChat, detectFoodLogIntent };
