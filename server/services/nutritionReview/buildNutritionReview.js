const { NutritionLog } = require('../../models/Logs');

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDayKey(dayKey) {
  const s = String(dayKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map((x) => Number(x));
  const start = new Date(y, m - 1, d);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dateStart: start, dateEnd: end };
}

function completenessScore({ totals, waterMl }) {
  const calories = safeNumber(totals?.calories);
  const protein = safeNumber(totals?.protein);
  const carbs = safeNumber(totals?.carbs);
  const fat = safeNumber(totals?.fat);

  const macros = [protein, carbs, fat];
  const macroPresentCount = macros.filter((m) => m != null && m > 0).length;
  const caloriesPresent = calories != null && calories > 0;
  const waterPresent = waterMl != null && waterMl > 0;

  return clamp01((macroPresentCount + (caloriesPresent ? 1 : 0) + (waterPresent ? 1 : 0)) / 5);
}

function buildFlags({ totals, waterMl }) {
  const calories = safeNumber(totals?.calories);
  const protein = safeNumber(totals?.protein);
  const fiber = safeNumber(totals?.fiber);
  const sodium = safeNumber(totals?.sodium);
  const potassium = safeNumber(totals?.potassium);
  const iron = safeNumber(totals?.iron);
  const calcium = safeNumber(totals?.calcium);
  const vitaminC = safeNumber(totals?.vitaminC);
  const magnesium = safeNumber(totals?.magnesium);
  const omega3 = safeNumber(totals?.omega3);

  const flags = [];

  // General, non-prescriptive ranges. These are educational heuristics.
  if (waterMl != null && waterMl > 0 && waterMl < 1500) {
    flags.push({
      key: 'low_hydration',
      severity: 'moderate',
      title: 'Hydration may be low',
      evidence: { waterMl },
    });
  }

  if (fiber != null && fiber > 0 && fiber < 20) {
    flags.push({
      key: 'low_fiber',
      severity: 'moderate',
      title: 'Fiber appears low',
      evidence: { fiberG: fiber },
    });
  }

  if (protein != null && protein > 0 && protein < 50) {
    flags.push({
      key: 'low_protein',
      severity: 'mild',
      title: 'Protein may be on the low side',
      evidence: { proteinG: protein },
    });
  }

  if (calories != null && calories > 0 && calories < 1200) {
    flags.push({
      key: 'very_low_calories',
      severity: 'caution',
      title: 'Calories look very low for a full day',
      evidence: { calories },
    });
  }

  if (sodium != null && sodium > 0 && sodium > 2300) {
    flags.push({
      key: 'high_sodium',
      severity: 'mild',
      title: 'Sodium may be high',
      evidence: { sodiumMg: sodium },
    });
  }

  // Micronutrients: only flag if explicitly logged (>0) but low. If 0, treat as "unknown".
  if (potassium != null && potassium > 0 && potassium < 2500) {
    flags.push({
      key: 'low_potassium',
      severity: 'mild',
      title: 'Potassium may be low',
      evidence: { potassiumMg: potassium },
    });
  }

  if (iron != null && iron > 0 && iron < 8) {
    flags.push({
      key: 'low_iron',
      severity: 'mild',
      title: 'Iron intake may be low',
      evidence: { ironMg: iron },
    });
  }

  if (calcium != null && calcium > 0 && calcium < 600) {
    flags.push({
      key: 'low_calcium',
      severity: 'mild',
      title: 'Calcium intake may be low',
      evidence: { calciumMg: calcium },
    });
  }

  if (vitaminC != null && vitaminC > 0 && vitaminC < 60) {
    flags.push({
      key: 'low_vitamin_c',
      severity: 'mild',
      title: 'Vitamin C intake may be low',
      evidence: { vitaminCMg: vitaminC },
    });
  }

  if (magnesium != null && magnesium > 0 && magnesium < 300) {
    flags.push({
      key: 'low_magnesium',
      severity: 'mild',
      title: 'Magnesium intake may be low',
      evidence: { magnesiumMg: magnesium },
    });
  }

  if (omega3 != null && omega3 > 0 && omega3 < 1) {
    flags.push({
      key: 'low_omega3',
      severity: 'mild',
      title: 'Omega-3 intake may be low',
      evidence: { omega3G: omega3 },
    });
  }

  return flags;
}

async function buildNutritionReview({ userId, dayKey }) {
  const range = parseDayKey(dayKey);
  if (!range) {
    const err = new Error('Invalid dayKey; expected YYYY-MM-DD');
    err.status = 400;
    throw err;
  }

  const { dateStart, dateEnd } = range;
  const log = await NutritionLog.findOne({ user: userId, date: { $gte: dateStart, $lt: dateEnd } }).lean();

  const totals = log?.dailyTotals || {};
  const waterMl = safeNumber(log?.waterIntake) ?? 0;

  const snapshot = {
    calories: safeNumber(totals?.calories) ?? 0,
    protein: safeNumber(totals?.protein) ?? 0,
    carbs: safeNumber(totals?.carbs) ?? 0,
    fat: safeNumber(totals?.fat) ?? 0,
    fiber: safeNumber(totals?.fiber) ?? 0,
    sugar: safeNumber(totals?.sugar) ?? 0,
    sodium: safeNumber(totals?.sodium) ?? 0,
    potassium: safeNumber(totals?.potassium) ?? 0,
    iron: safeNumber(totals?.iron) ?? 0,
    calcium: safeNumber(totals?.calcium) ?? 0,
    vitaminB: safeNumber(totals?.vitaminB) ?? 0,
    magnesium: safeNumber(totals?.magnesium) ?? 0,
    zinc: safeNumber(totals?.zinc) ?? 0,
    vitaminC: safeNumber(totals?.vitaminC) ?? 0,
    omega3: safeNumber(totals?.omega3) ?? 0,
    waterMl,
  };

  const completeness = completenessScore({ totals, waterMl });
  const confidence = clamp01(0.2 + 0.8 * completeness);

  const flags = buildFlags({ totals, waterMl });

  const questionsForClinician = [];
  if (flags.some((f) => f.key === 'very_low_calories')) {
    questionsForClinician.push('If this is typical, is my intake appropriate for my health goals and medical history?');
  }
  if (flags.some((f) => f.key === 'high_sodium')) {
    questionsForClinician.push('If I have blood pressure or kidney concerns, what sodium target is right for me?');
  }
  if (flags.some((f) => f.key === 'low_iron')) {
    questionsForClinician.push('If fatigue is present, should I consider checking iron labs (ferritin, CBC) with my clinician?');
  }

  const notes = [
    'This is an educational review based on logged totals (not a diagnosis).',
    'If nutrients are missing from the log, LifeSync treats them as unknown rather than “low”.',
  ];

  return {
    dayKey,
    dateStart,
    dateEnd,
    hasLog: Boolean(log),
    confidence,
    completeness,
    snapshot,
    flags,
    questionsForClinician,
    notes,
  };
}

module.exports = { buildNutritionReview };
