const Workout = require('../../models/Workout');
const { NutritionLog } = require('../../models/Logs');
const User = require('../../models/User');
const { evaluateDayInteractions, interactionRules } = require('../nutritionPipeline/nutrientInteractions');
const { analyzeGutTriggers } = require('./gutCorrelationEngine');
const { calculateDailyTargets } = require('../nutritionEngine');

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

  const [workouts, nutritionLogs, user] = await Promise.all([
    Workout.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
    NutritionLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
    User.findById(userId).select('biologicalProfile weight height gender dob clinicalTargets').lean(),
  ]);

  const profile = user?.biologicalProfile || {};
  const toNum = v => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
  const ep = {
    ...profile,
    biologicalSex: profile.biologicalSex || user?.gender,
    heightCm: toNum(profile.heightCm) ?? toNum(user?.height),
    weightKg: toNum(profile.weightKg) ?? toNum(user?.weight),
    dob: profile.dob || user?.dob,
  };
  const userWeightKg = ep.weightKg || 75;
  const calc = calculateDailyTargets(ep);
  const refCalories = user?.clinicalTargets?.targets?.calories || calc?.targets?.calories || 2000;
  const refProtein = user?.clinicalTargets?.targets?.protein || calc?.targets?.protein || Math.round(userWeightKg * 1.6);

  const insights = [];

  insights.push(...analyzeInteractionHistory(nutritionLogs));

  const perfInsight = analyzeNutritionPerformance(workouts, buildNutritionMap(nutritionLogs), userWeightKg, refProtein, refCalories);
  if (perfInsight) insights.push(perfInsight);

  const fuelWindowInsight = await analyzePreTrainingFuelWindow(workouts, nutritionLogs);
  if (fuelWindowInsight) insights.push(fuelWindowInsight);

  insights.push(...analyzeChronicDeficiencies(nutritionLogs));

  const muscleLossInsight = analyzeMuscleLocRisk(workouts, nutritionLogs, userWeightKg, refCalories, refProtein);
  if (muscleLossInsight) insights.push(muscleLossInsight);

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
function analyzeNutritionPerformance(workouts, nutritionMap, userWeightKg, refProtein, refCalories) {
  if (workouts.length < 4) return null;

  // Dynamic thresholds scale to the individual user — avoid false positives for heavy or light athletes
  const proteinThreshold = Math.round((userWeightKg || 75) * 1.7); // ~1.7g/kg = solid training-day protein
  const lowCalThreshold = Math.round((refCalories || 2000) * 0.80); // <80% of target = underfueled

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
  if (avgPrev === 0) return null;

  // ── Positive signal: volume up + high protein ─────────────────────────────
  const highProteinDays = recent.filter(rv => {
    const log = nutritionMap[rv.date];
    return log && log.dailyTotals && log.dailyTotals.protein >= proteinThreshold;
  }).length;
  if (avgRecent >= avgPrev * 1.1 && highProteinDays >= 2) {
    return {
      type: 'correlation',
      title: 'High protein driving performance gains',
      detail: `Workout volume is up ${Math.round((avgRecent / avgPrev - 1) * 100)}% vs the prior 3 sessions. ${highProteinDays} of those days had protein ≥ ${proteinThreshold}g (your body-weight-adjusted target).`,
      impact: 'moderate',
      action: 'Keep protein intake consistent — this pattern is directly supporting your performance gains.',
    };
  }

  // ── Negative signal: volume down + underfueling ────────────────────────────
  if (avgRecent >= avgPrev * 0.9) return null; // flat or mild drop — not notable

  const dropPct = Math.round((1 - avgRecent / avgPrev) * 100);

  let lowCalDays = 0;
  for (const rv of recent) {
    const log = nutritionMap[rv.date];
    const cal = log?.dailyTotals?.calories;
    if (cal != null && cal < lowCalThreshold) lowCalDays++;
  }

  if (lowCalDays >= 1) {
    return {
      type: 'correlation',
      title: 'Training volume drop linked to low fuel',
      detail: `Workout volume is down ${dropPct}% vs the prior 3 sessions. ${lowCalDays} of those days had calorie intake below ${lowCalThreshold} kcal (80% of your target).`,
      impact: 'high',
      action: 'Eat a 300–400 kcal carbohydrate-rich snack 1–2 hours before your next session.',
    };
  }

  return null;
}

// ── 3. Pre-training fuel window (forward-looking) ────────────────────────────
// Fires when the user has trained today but today's calorie/protein intake is
// meaningfully behind their historical training-day baseline — catching a
// recovery-nutrition gap before performance suffers.
async function analyzePreTrainingFuelWindow(workouts, nutritionLogs) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  // logs are sorted ascending — most recent is last; find today from the tail
  const todayLog = [...nutritionLogs].reverse().find(l => new Date(l.date) >= todayStart);
  if (!todayLog) return null;

  const todayCalories = todayLog.dailyTotals?.calories || 0;
  const todayProtein  = todayLog.dailyTotals?.protein  || 0;

  // Use 7 most-recent completed days (before today) as historical baseline
  const historicalLogs = nutritionLogs.filter(l => new Date(l.date) < todayStart).slice(-7);
  if (historicalLogs.length < 3) return null;

  const avgCals    = historicalLogs.reduce((s, l) => s + (l.dailyTotals?.calories || 0), 0) / historicalLogs.length;
  const avgProtein = historicalLogs.reduce((s, l) => s + (l.dailyTotals?.protein  || 0), 0) / historicalLogs.length;

  // Only fire when the user has trained today
  const trainedToday = workouts.some(w => new Date(w.date) >= todayStart);
  if (!trainedToday) return null;
  if (avgCals < 500) return null; // baseline too thin to be meaningful

  const calRatio   = todayCalories / avgCals;
  const proteinGap = avgProtein - todayProtein;

  if (calRatio < 0.6 && proteinGap > 20) {
    return {
      type: 'fuel_timing',
      title: 'Post-workout refuel behind schedule',
      detail: `You've logged ${Math.round(todayCalories)} kcal today vs your typical ${Math.round(avgCals)} kcal. Protein is ${Math.round(proteinGap)}g below your usual intake on training days.`,
      impact: 'high',
      action: `Prioritise a ${Math.round(proteinGap)}g protein meal now — muscle protein synthesis peaks within 2h post-training.`,
    };
  }

  if (calRatio < 0.75 && proteinGap > 10) {
    return {
      type: 'fuel_timing',
      title: 'Recovery nutrition below typical',
      detail: `Today's intake (${Math.round(todayCalories)} kcal, ${Math.round(todayProtein)}g protein) is behind your usual training-day nutrition.`,
      impact: 'moderate',
      action: 'Add a protein-rich snack or meal to support recovery and muscle repair.',
    };
  }

  return null;
}

// ── 4. Chronic deficiency scan — all nutrients in NUTRIENT_RDA ───────────────
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

// ── 5. Muscle loss risk — aggressive deficit + low protein + active training ───
// Fires when all three conditions are true for 10+ days: calorie deficit > 500 kcal,
// protein averaging below 80% of target, and at least 3 workouts in the window.
// Thresholds are scaled to the individual user's TDEE and bodyweight — not hardcoded absolutes.
function analyzeMuscleLocRisk(workouts, nutritionLogs, userWeightKg, refCalories, refProtein) {
  if (nutritionLogs.length < 10 || workouts.length < 3) return null;

  const wKg = userWeightKg || 75;
  const calsFloor = Math.round((refCalories || 2000) * 0.75); // <75% of TDEE = aggressive deficit
  const proteinFloor = Math.round(wKg * 1.2); // 1.2g/kg minimum for muscle retention during training
  const safeProtein = Math.round(wKg * 1.6); // recommended floor

  const recentLogs = nutritionLogs.slice(-14); // last 14 days
  if (recentLogs.length < 10) return null;

  let deficitDays = 0;
  let lowProteinDays = 0;
  let totalProtein = 0;
  let totalCalories = 0;
  let logsWithData = 0;

  for (const log of recentLogs) {
    const cal = log.dailyTotals?.calories;
    const pro = log.dailyTotals?.protein;
    if (!cal || !pro) continue;
    logsWithData++;
    totalCalories += cal;
    totalProtein += pro;
    if (cal < calsFloor) deficitDays++;
    if (pro < proteinFloor) lowProteinDays++;
  }

  if (logsWithData < 8) return null;

  const avgCal = totalCalories / logsWithData;
  const avgProtein = totalProtein / logsWithData;
  const deficitDaysFraction = deficitDays / logsWithData;
  const lowProteinFraction = lowProteinDays / logsWithData;

  // All three must be true: sustained deficit, low protein, active training
  if (deficitDaysFraction < 0.6 || lowProteinFraction < 0.6) return null;

  const recentWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
    return d >= cutoff;
  });
  if (recentWorkouts.length < 3) return null;

  return {
    type: 'muscle_loss_risk',
    title: '⚠️ Muscle loss risk: aggressive deficit + low protein while training',
    detail: `Over the last ${logsWithData} logged days: avg ${Math.round(avgCal)} kcal/day (${deficitDays} days under ${calsFloor} kcal — 75% of your TDEE), avg ${Math.round(avgProtein)}g protein/day (${lowProteinDays} days under ${proteinFloor}g — 1.2g/kg minimum), with ${recentWorkouts.length} training sessions. This combination drives muscle catabolism.`,
    impact: 'high',
    action: `Raise protein to at least ${safeProtein}g/day and calories above ${calsFloor} kcal on training days. You can still be in a deficit — just not this deep while training this frequently.`,
  };
}

module.exports = { analyzeCorrelations, analyzePreTrainingFuelWindow };
