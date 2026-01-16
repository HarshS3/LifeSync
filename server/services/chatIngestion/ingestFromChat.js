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
  // Be conservative: only infer sleep hours when the phrase strongly indicates duration.
  // Common STT variants:
  // - "slept 7h", "slept 6.5 hrs", "sleep 6 hours"
  // - "got 7 hours of sleep", "had 8 hours sleep"
  // - "slept 7" (sometimes the unit is omitted)

  // With explicit units.
  let m = s.match(/\b(?:slept|sleep)\s*(?:for\s*)?(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (!m) {
    m = s.match(/\b(?:got|had)\s*(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:of\s*)?sleep\b/);
  }

  // Unit-less but strongly indicated by "slept".
  if (!m) {
    m = s.match(/\bslept\s*(?:for\s*)?(\d{1,2}(?:\.\d)?)\b/);
  }

  if (!m) return null;

  const hours = clamp(m[1], 0, 24);
  if (hours == null) return null;
  // Reject unlikely values for chat ingestion.
  if (hours > 16) return null;
  // If someone says "slept 7/10" treat that as not sleep-hours.
  if (/(?:^|\s)\/\s*(?:10|ten)\b/.test(s.slice(m.index + m[0].length))) return null;
  return hours;
}

function parseNumberToken10(token) {
  const raw = String(token || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return clamp(raw, 1, 10);
  const map = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  if (Object.prototype.hasOwnProperty.call(map, raw)) return map[raw];
  return null;
}

function parseScale10(text, label) {
  const s = String(text || '').toLowerCase();

  // Accept natural variants:
  // - "energy was 6 out of 10"
  // - "my stress level is six out of ten"
  // - "energy 6/10"
  // - "stress: 7"
  const labelPattern = `${label}(?:\\s*level)?`;
  const numToken = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)';
  // Allow plain whitespace: "energy 6/10" as well as "energy was 6/10", "energy: 6/10".
  const sep = '(?:\\s*(?:(?:[:=])|is|was|at)?\\s*)';

  // Prefer explicit /10 or out-of-10.
  const reExplicit = new RegExp(`\\b${labelPattern}\\b${sep}${numToken}\\s*(?:\\/\\s*(?:10|ten)|out\\s*of\\s*(?:10|ten))\\b`);
  const mExplicit = s.match(reExplicit);
  if (mExplicit) return parseNumberToken10(mExplicit[1]);

  // Bare: "stress 7" / "energy was 4"
  const reBare = new RegExp(`\\b${labelPattern}\\b${sep}${numToken}\\b`);
  const mBare = s.match(reBare);
  if (mBare) return parseNumberToken10(mBare[1]);

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

  const dryRun = Boolean(arguments?.[0]?.dryRun);

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
    if (!dryRun) {
      await upsertTodayMentalLog({ userId, now, patch: mentalPatch });
    }
    updates.push({ model: 'MentalLog', patch: mentalPatch });
  }

  // NutritionLog updates
  if (waterMl != null) {
    if (dryRun) {
      updates.push({ model: 'NutritionLog', patch: { waterIntakeDeltaMl: waterMl } });
    } else {
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
  }

  const dayKey = dayKeyFromDate(now);
  return { ingested: updates.length > 0, dayKey, updates };
}

module.exports = {
  ingestFromChat,
};
