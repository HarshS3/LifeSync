const { MentalLog, NutritionLog } = require('../../models/Logs');
const { dayKeyFromDate } = require('../dailyLifeState/dayKey');

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

function parseSleepHours(text) {
  const s = String(text || '').toLowerCase();
  // Examples: "slept 7h", "sleep 6 hours", "slept 6.5 hrs"
  const m = s.match(/\b(?:slept|sleep)\s*(?:for\s*)?(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (!m) return null;
  const hours = clamp(m[1], 0, 24);
  if (hours == null) return null;
  // Reject unlikely values for chat ingestion.
  if (hours > 16) return null;
  return hours;
}

function parseScale10(text, label) {
  const s = String(text || '').toLowerCase();
  // Prefer explicit /10.
  const reSlash = new RegExp(`\\b${label}\\s*(\\d{1,2})\\s*\\/\\s*10\\b`);
  const mSlash = s.match(reSlash);
  if (mSlash) return clamp(mSlash[1], 1, 10);

  // Accept: "stress 7", "energy 4" only if label is present.
  const reBare = new RegExp(`\\b${label}\\s*(\\d{1,2})\\b`);
  const mBare = s.match(reBare);
  if (mBare) return clamp(mBare[1], 1, 10);

  return null;
}

function parseMoodEnum(text) {
  const s = String(text || '').toLowerCase();
  // Very conservative mapping to existing enum.
  // We only map when the user uses a direct "mood" statement.
  // Examples: "mood good", "mood: neutral", "mood low".
  const m = s.match(/\bmood\s*[:=]?\s*(very\s*low|very-low|low|neutral|good|great)\b/);
  if (!m) return null;
  const raw = m[1].replace(/\s+/g, '-');
  if (['very-low', 'low', 'neutral', 'good', 'great'].includes(raw)) return raw;
  return null;
}

function parseWaterMl(text) {
  const s = String(text || '').toLowerCase();
  // Examples: "water 2l", "drank 1500 ml water", "hydration 1.5 liters"
  const m = s.match(/\b(?:water|hydration|drank)\s*(\d+(?:\.\d+)?)\s*(ml|l|liter|liters)\b/);
  if (!m) return null;
  const qty = Number(m[1]);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const unit = m[2];
  const ml = unit === 'ml' ? qty : qty * 1000;
  const rounded = Math.round(ml);
  // Reject obviously wrong values.
  if (rounded > 10000) return null;
  return rounded;
}

async function upsertTodayMentalLog({ userId, now, patch }) {
  const start = startOfDay(now);
  const end = endOfDay(now);

  const existing = await MentalLog.findOne({
    user: userId,
    date: { $gte: start, $lt: end },
  }).sort({ date: -1 });

  if (existing) {
    Object.assign(existing, patch);
    return existing.save();
  }

  return MentalLog.create({
    user: userId,
    date: now,
    ...patch,
  });
}

async function upsertTodayNutritionLog({ userId, now, patch }) {
  const start = startOfDay(now);
  const end = endOfDay(now);

  const existing = await NutritionLog.findOne({
    user: userId,
    date: { $gte: start, $lt: end },
  }).sort({ date: -1 });

  if (existing) {
    Object.assign(existing, patch);
    return existing.save();
  }

  return NutritionLog.create({
    user: userId,
    date: now,
    ...patch,
  });
}

/**
 * Deterministic chat ingestion (safe + conservative).
 *
 * Goal:
 * - Extract high-confidence daily signals from chat messages
 * - Persist into existing log models
 * - Return a summary of what was ingested (for debugging / observability)
 */
async function ingestFromChat({ userId, message, now = new Date() }) {
  if (!userId) return { ingested: false, dayKey: null, updates: [] };

  const updates = [];

  const sleepHours = parseSleepHours(message);
  const stressLevel = parseScale10(message, 'stress');
  const energyLevel = parseScale10(message, 'energy');
  const mood = parseMoodEnum(message);
  const waterMl = parseWaterMl(message);

  // MentalLog updates
  const mentalPatch = {};
  if (sleepHours != null) mentalPatch.sleepHours = sleepHours;
  if (stressLevel != null) mentalPatch.stressLevel = stressLevel;
  if (energyLevel != null) mentalPatch.energyLevel = energyLevel;
  if (mood) mentalPatch.mood = mood;

  if (Object.keys(mentalPatch).length) {
    await upsertTodayMentalLog({ userId, now, patch: mentalPatch });
    updates.push({ model: 'MentalLog', patch: mentalPatch });
  }

  // NutritionLog updates
  if (waterMl != null) {
    // Incrementally add water intake for the day.
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

  const dayKey = dayKeyFromDate(now);
  return { ingested: updates.length > 0, dayKey, updates };
}

module.exports = {
  ingestFromChat,
};
