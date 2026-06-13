const Workout = require('../../models/Workout');
const { NutritionLog } = require('../../models/Logs');
const { evaluateDayInteractions, interactionRules } = require('../nutritionPipeline/nutrientInteractions');
const { analyzeGutTriggers } = require('./gutCorrelationEngine');

// ── Nutrient deficiency config ────────────────────────────────────────────────
// Add any nutrient that lives in NutritionLog.dailyTotals here. No other changes needed.
const NUTRIENT_RDA = [
  { key: 'iron',       rda: 18,   label: 'Iron',        unit: 'mg',  fix: 'Add vitamin C (lemon, tomato) to iron-rich meals — doubles absorption. Separate tea/coffee by 90 min.' },
  { key: 'calcium',    rda: 1000, label: 'Calcium',     unit: 'mg',  fix: 'Include dairy, fortified plant milk, or dark leafy greens daily.' },
  { key: 'zinc',       rda: 11,   label: 'Zinc',        unit: 'mg',  fix: 'Add pumpkin seeds, chickpeas, or lean meat to your meals.' },
  { key: 'magnesium',  rda: 400,  label: 'Magnesium',   unit: 'mg',  fix: 'Include nuts, seeds, and dark leafy greens (spinach, kale).' },
  { key: 'vitaminD',   rda: 15,   label: 'Vitamin D',   unit: 'µg',  fix: 'Dietary Vitamin D is rarely sufficient — supplement and 15 min of morning sunlight.' },
  { key: 'vitaminB12', rda: 2.4,  label: 'Vitamin B12', unit: 'µg',  fix: 'B12 comes almost exclusively from animal products. Consider a supplement if vegetarian.' },
  { key: 'folate',     rda: 400,  label: 'Folate',      unit: 'µg',  fix: 'Add lentils, leafy greens, and beans — one serving covers ~50% of the daily target.' },
  { key: 'potassium',  rda: 3500, label: 'Potassium',   unit: 'mg',  fix: 'Banana, sweet potato, yoghurt, and coconut water are high-potassium options.' },
  { key: 'fiber',      rda: 30,   label: 'Fiber',       unit: 'g',   fix: 'Add one serving of legumes or whole grains per day.' },
  { key: 'vitaminC',   rda: 90,   label: 'Vitamin C',   unit: 'mg',  fix: 'Add a citrus fruit or raw tomato to at least one meal daily.' },
  { key: 'omega3',     rda: 1.6,  label: 'Omega-3',     unit: 'g',   fix: 'Add flaxseed, walnuts, or fatty fish 2–3 times a week.' },
];

// ── Interaction rule lookup — built from interactionRules, no hardcoding ──────
// Maps rule.id → rule so we can generate insight text dynamically.
const ANTAGONISM_BY_ID = Object.fromEntries(
  interactionRules.antagonistic.map(r => [r.id, r])
);

async function analyzeCorrelations(userId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [workouts, nutritionLogs] = await Promise.all([
    Workout.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
    NutritionLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
  ]);

  const insights = [];

  insights.push(...analyzeInteractionHistory(nutritionLogs));

  const perfInsight = analyzeNutritionPerformance(workouts, buildNutritionMap(nutritionLogs));
  if (perfInsight) insights.push(perfInsight);

  insights.push(...analyzeChronicDeficiencies(nutritionLogs));

  const gutInsights = await analyzeGutTriggers(userId, days);
  insights.push(...gutInsights);

  return insights;
}

function buildNutritionMap(logs) {
  const map = {};
  logs.forEach(log => {
    map[new Date(log.date).toDateString()] = log;
  });
  return map;
}

// ── 1. Recurring nutrient antagonisms ────────────────────────────────────────
// Loops over ALL rules in interactionRules.antagonistic — adding a rule there
// automatically surfaces it here when it appears >= threshold times.
function analyzeInteractionHistory(logs) {
  const counts = {}; // ruleId -> occurrenceCount

  for (const log of logs) {
    const { antagonisms } = evaluateDayInteractions(log.meals || []);
    for (const ant of antagonisms) {
      counts[ant.id] = (counts[ant.id] || 0) + 1;
    }
  }

  const THRESHOLD = 3; // fire after 3+ occurrences in the window
  const insights = [];

  for (const [id, count] of Object.entries(counts)) {
    if (count < THRESHOLD) continue;
    const rule = ANTAGONISM_BY_ID[id];
    if (!rule) continue;

    insights.push({
      type: 'clinical',
      title: `${rule.title} — recurring pattern`,
      detail: `Detected ${count} times in the last 30 days. ${rule.description} Effect: ${rule.effect}.`,
      impact: 'high',
      action: rule.fix || 'Review meal timing for this nutrient combination.',
    });
  }

  return insights;
}

// ── 2. Nutrition vs training performance (lagged) ────────────────────────────
function analyzeNutritionPerformance(workouts, nutritionMap) {
  if (workouts.length < 4) return null;

  const volumes = workouts.map(w => ({
    date: new Date(w.date).toDateString(),
    vol: w.exercises?.reduce((sum, ex) =>
      sum + (ex.sets?.reduce((s, set) => s + ((set.reps || 0) * (set.weight || 0)), 0) || 0), 0) || 0,
  }));

  const recent   = volumes.slice(-3);
  const previous = volumes.slice(-6, -3);
  if (recent.length < 2 || previous.length < 2) return null;

  const avgRecent = recent.reduce((s, v) => s + v.vol, 0) / recent.length;
  const avgPrev   = previous.reduce((s, v) => s + v.vol, 0) / previous.length;
  if (avgPrev === 0 || avgRecent >= avgPrev * 0.9) return null;

  const dropPct = Math.round((1 - avgRecent / avgPrev) * 100);

  // Count workout days where calories were notably below a reasonable floor
  let lowCalDays = 0;
  for (const rv of recent) {
    const log = nutritionMap[rv.date];
    const cal = log?.dailyTotals?.calories;
    if (cal != null && cal < 1700) lowCalDays++;
  }

  if (lowCalDays >= 1) {
    return {
      type: 'correlation',
      title: 'Training volume drop linked to low fuel',
      detail: `Workout volume is down ${dropPct}% vs the prior 3 sessions. ${lowCalDays} of those days had calorie intake below 1700 kcal.`,
      impact: 'high',
      action: 'Eat a 300–400 kcal carbohydrate-rich snack 1–2 hours before your next session.',
    };
  }

  return null;
}

// ── 3. Chronic deficiency scan — all nutrients in NUTRIENT_RDA ───────────────
// Returns one insight per nutrient that averages below 60% of RDA over the window.
// Sorted by severity (largest gap first), capped at 3 to avoid noise.
function analyzeChronicDeficiencies(logs) {
  if (logs.length < 7) return [];

  const deficient = [];

  for (const { key, rda, label, unit, fix } of NUTRIENT_RDA) {
    let total = 0;
    let daysWithData = 0;

    for (const log of logs) {
      const val = log.dailyTotals?.[key];
      if (val != null && Number.isFinite(Number(val))) {
        total += Number(val);
        daysWithData++;
      }
    }

    if (daysWithData < 5) continue; // not enough data for this nutrient

    const avg = total / daysWithData;
    const pct = avg / rda;

    if (pct < 0.6) {
      deficient.push({ key, label, unit, avg, rda, pct, fix });
    }
  }

  // Sort worst first, cap at 3 insights
  deficient.sort((a, b) => a.pct - b.pct);

  return deficient.slice(0, 3).map(({ label, unit, avg, rda, pct, fix }) => ({
    type: 'deficiency',
    title: `Chronic ${label} shortfall`,
    detail: `Average intake over the last 30 days: ${avg.toFixed(1)}${unit} — only ${Math.round(pct * 100)}% of the ${rda}${unit} daily target.`,
    impact: pct < 0.4 ? 'high' : 'moderate',
    action: fix,
  }));
}

module.exports = { analyzeCorrelations };
