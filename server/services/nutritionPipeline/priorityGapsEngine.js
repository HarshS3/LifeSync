/**
 * Priority Gaps Engine
 *
 * Identifies nutrients the user is chronically under-consuming and finds
 * specific food fixes from the MongoDB food database (IndbFood, MfpFood, TarlaFood).
 *
 * Logic:
 *   1. Scan last N days of nutrition logs
 *   2. For each nutrient, compute average intake as % of clinical target
 *   3. Find nutrients below DEFICIENCY_THRESHOLD on at least MIN_DEFICIENT_DAYS days
 *   4. For each deficient nutrient, query ALL food collections for foods rich in that nutrient
 *      that the user hasn't logged recently (fresh suggestions)
 *   5. Return ranked gap list with food suggestions and context
 */

const { NutritionLog } = require('../../models/Logs');
const IndbFood = require('../../models/IndbFood');
const MfpFood = require('../../models/MfpFood');
const TarlaFood = require('../../models/TarlaFood');

const DEFICIENCY_THRESHOLD = 0.70;  // < 70% of target = flagged
const MIN_DEFICIENT_DAYS = 3;       // must be low at least 3 of the last 7 days
const LOOK_BACK_DAYS = 7;
const MAX_FOOD_SUGGESTIONS = 3;

// Maps nutrient keys to how they're stored in each food collection's columns array.
// Format: { indbKey, mfpKey, tarlaKey, unit, perServing }
// perServing: typical amount in a practical serving (used to estimate "how much to add")
const NUTRIENT_COLUMN_MAP = {
  magnesium:  { indbKey: 'magnesium_mg', mfpKey: 'magnesium',    tarlaKey: 'magnesium',    unit: 'mg',  perServing: 30 },
  iron:       { indbKey: 'iron_mg',      mfpKey: 'iron',          tarlaKey: 'iron',          unit: 'mg',  perServing: 1 },
  calcium:    { indbKey: 'calcium_mg',   mfpKey: 'calcium',       tarlaKey: 'calcium',       unit: 'mg',  perServing: 50 },
  zinc:       { indbKey: 'zinc_mg',      mfpKey: 'zinc',          tarlaKey: 'zinc',          unit: 'mg',  perServing: 0.5 },
  vitaminD:   { indbKey: 'vitd_ug',      mfpKey: 'vitamin_d',     tarlaKey: 'vitamin_d',     unit: 'µg',  perServing: 1 },
  vitaminB12: { indbKey: 'vitb12_ug',    mfpKey: 'vitamin_b12',   tarlaKey: 'vitamin_b12',   unit: 'µg',  perServing: 0.5 },
  vitaminC:   { indbKey: 'vitc_mg',      mfpKey: 'vitamin_c',     tarlaKey: 'vitamin_c',     unit: 'mg',  perServing: 20 },
  vitaminA:   { indbKey: 'vita_ug',      mfpKey: 'vitamin_a',     tarlaKey: 'vitamin_a',     unit: 'µg',  perServing: 50 },
  folate:     { indbKey: 'folate_ug',    mfpKey: 'folate',        tarlaKey: 'folate',        unit: 'µg',  perServing: 30 },
  potassium:  { indbKey: 'potassium_mg', mfpKey: 'potassium',     tarlaKey: 'potassium',     unit: 'mg',  perServing: 100 },
  fiber:      { indbKey: 'fibre_g',      mfpKey: 'fiber',         tarlaKey: 'fiber',         unit: 'g',   perServing: 2 },
  omega3:     { indbKey: 'omega_3',      mfpKey: 'omega3',        tarlaKey: 'omega3',        unit: 'g',   perServing: 0.5 },
  vitaminE:   { indbKey: 'vite_mg',      mfpKey: 'vitamin_e',     tarlaKey: 'vitamin_e',     unit: 'mg',  perServing: 2 },
  selenium:   { indbKey: 'selenium_ug',  mfpKey: 'selenium',      tarlaKey: 'selenium',      unit: 'µg',  perServing: 5 },
  iodine:     { indbKey: 'iodine',       mfpKey: 'iodine',        tarlaKey: 'iodine',        unit: 'ug',  perServing: 15 },
  choline:    { indbKey: 'choline',      mfpKey: 'choline',       tarlaKey: 'choline',       unit: 'mg',  perServing: 50 },
};

// Human-readable names and why it matters
const NUTRIENT_META = {
  magnesium:  { name: 'Magnesium',   why: 'ATP synthesis, muscle contraction, sleep quality' },
  iron:       { name: 'Iron',        why: 'Oxygen transport, energy metabolism' },
  calcium:    { name: 'Calcium',     why: 'Bone density, muscle and nerve function' },
  zinc:       { name: 'Zinc',        why: 'Immune function, testosterone production, wound healing' },
  vitaminD:   { name: 'Vitamin D',   why: 'Calcium absorption, immune function, mood regulation' },
  vitaminB12: { name: 'Vitamin B12', why: 'Neurological function, red blood cell formation' },
  vitaminC:   { name: 'Vitamin C',   why: 'Collagen synthesis, iron absorption, antioxidant' },
  vitaminA:   { name: 'Vitamin A',   why: 'Vision, immune response, skin health' },
  folate:     { name: 'Folate',      why: 'DNA synthesis, cell division, mood regulation' },
  potassium:  { name: 'Potassium',   why: 'Blood pressure, muscle function, electrolyte balance' },
  fiber:      { name: 'Fiber',       why: 'Gut health, glucose control, satiety' },
  omega3:     { name: 'Omega-3',     why: 'Inflammation reduction, brain health, cardiovascular' },
  vitaminE:   { name: 'Vitamin E',   why: 'Antioxidant, immune function, skin health' },
  selenium:   { name: 'Selenium',    why: 'Thyroid function, antioxidant enzyme cofactor' },
  iodine:     { name: 'Iodine',      why: 'Thyroid hormone synthesis, metabolism, brain development', fix: 'Add iodized salt, dairy, eggs, or seafood to your diet.' },
  choline:    { name: 'Choline',     why: 'Neurotransmitter synthesis, liver function, membrane integrity', fix: 'Add eggs, liver, soybeans, or lean meat — one egg provides ~150mg choline.' },
};

function parseColumnValue(columns, key) {
  if (!Array.isArray(columns) || !key) return 0;
  const lower = key.toLowerCase();
  const col = columns.find(c => c.key && c.key.toLowerCase() === lower);
  if (!col || !col.value) return 0;
  const v = parseFloat(String(col.value).replace(/[^0-9.]/g, ''));
  return isNaN(v) ? 0 : v;
}

async function getFoodSuggestionsForNutrient(nutrientKey, colMap, recentFoodNames) {
  const suggestions = [];
  const recentSet = new Set((recentFoodNames || []).map(n => String(n).toLowerCase()));

  const pickBestFromCollection = async (model, colKey) => {
    if (!colKey) return [];
    try {
      // Only fetch documents that actually have this nutrient column (Task 12)
      const docs = await model.find({ 'columns.key': colKey }).select('displayName columns').lean().limit(500);
      return docs
        .map(d => ({ name: d.displayName, value: (d.columns || []).find(c => c.key === colKey)?.value || 0 }))
        .filter(d => d.value > 0 && !recentSet.has(String(d.name || '').toLowerCase()))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    } catch {
      return [];
    }
  };

  const [indbResults, mfpResults, tarlaResults] = await Promise.all([
    pickBestFromCollection(IndbFood, colMap.indbKey),
    pickBestFromCollection(MfpFood, colMap.mfpKey),
    pickBestFromCollection(TarlaFood, colMap.tarlaKey),
  ]);

  // Merge, dedup by lowercased name, take top MAX_FOOD_SUGGESTIONS
  const seen = new Set();
  const all = [...indbResults, ...mfpResults, ...tarlaResults].sort((a, b) => b.value - a.value);
  for (const item of all) {
    const key = item.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ name: item.name, amountPer100g: item.value, unit: colMap.unit });
    if (suggestions.length >= MAX_FOOD_SUGGESTIONS) break;
  }
  return suggestions;
}

/**
 * @param {string} userId
 * @param {Object} clinicalTargets — { targets: { magnesium, iron, ... } }
 * @returns {Array} priority gap items sorted by severity
 */
async function computePriorityGaps(userId, clinicalTargets) {
  if (!clinicalTargets?.targets) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOOK_BACK_DAYS);

  const logs = await NutritionLog.find({
    user: userId,
    date: { $gte: cutoff },
  }).select('date dailyTotals meals').lean();

  if (logs.length === 0) return [];

  // Build set of foods logged in the last 3 days (for "don't suggest what you just ate")
  const recent3Days = new Date();
  recent3Days.setDate(recent3Days.getDate() - 3);
  const recentFoodNames = [];
  logs
    .filter(l => new Date(l.date) >= recent3Days)
    .forEach(l => (l.meals || []).forEach(m => (m.foods || []).forEach(f => {
      if (f.name) recentFoodNames.push(f.name);
    })));

  const targets = clinicalTargets.targets;
  const microTargets = targets.micronutrients || {};

  // Combine flat targets and micronutrients into one lookup
  const allTargets = {
    ...microTargets,
    fiber: targets.fiber,
    omega3: targets.omega3 || (targets.micronutrients?.omega3),
  };

  const gaps = [];

  for (const [nutrientKey, colMap] of Object.entries(NUTRIENT_COLUMN_MAP)) {
    const target = allTargets[nutrientKey];
    if (!target || target <= 0) continue;

    // Count days below threshold
    let deficientDays = 0;
    let totalRatio = 0;
    let daysWithData = 0;

    for (const log of logs) {
      // Skip days where total calories < 200 — likely incomplete/no-log days (Task 11)
      if ((log.dailyTotals?.calories || 0) < 200) continue;
      daysWithData++;
      const intake = log.dailyTotals?.[nutrientKey] || 0;
      const ratio = intake / target;
      totalRatio += ratio;
      if (ratio < DEFICIENCY_THRESHOLD) deficientDays++;
    }

    if (deficientDays < MIN_DEFICIENT_DAYS) continue;

    const avgRatio = daysWithData > 0 ? totalRatio / daysWithData : 0;
    const severity = avgRatio < 0.40 ? 'critical' : avgRatio < 0.60 ? 'high' : 'moderate';
    const meta = NUTRIENT_META[nutrientKey] || { name: nutrientKey, why: '' };

    gaps.push({
      nutrient: nutrientKey,
      name: meta.name,
      why: meta.why,
      avgPercent: Math.round(avgRatio * 100),
      deficientDays,
      daysAnalyzed: daysWithData,
      severity,
      target: Math.round(target),
      unit: colMap.unit,
      _colMap: colMap,
    });
  }

  // Sort: critical first, then by avgPercent ascending (worst gap first)
  const severityOrder = { critical: 0, high: 1, moderate: 2 };
  gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.avgPercent - b.avgPercent);

  // Top 5 gaps, then fetch food suggestions for each
  const topGaps = gaps.slice(0, 5);

  await Promise.all(topGaps.map(async (gap) => {
    gap.foodSuggestions = await getFoodSuggestionsForNutrient(gap.nutrient, gap._colMap, recentFoodNames);
    delete gap._colMap;
  }));

  return topGaps;
}

module.exports = { computePriorityGaps };
