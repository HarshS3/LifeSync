/**
 * Insulin Intelligence Service
 *
 * Simulates glycemic response using Glycemic Load (GL) per meal, not raw carbs.
 * GL = (GI / 100) × net_carbs. More accurate than raw-carb formula because
 * 50g carbs from lentils (GI ~29) vs white rice (GI ~73) are completely different responses.
 *
 * Modifiers applied on top of GL:
 *   1. Meal sequence   — fiber/protein logged before this meal reduces spike (Shukla 2019)
 *   2. Recent workout  — within 3h prior, muscles clear glucose faster (Richter & Hargreaves 2013)
 *   3. Time of day     — evening/night meals spike more due to circadian insulin resistance
 *   4. Cumulative fiber — running daily fiber total blunts subsequent meals
 *
 * IMPORTANT: We deliberately avoid fake-precise mg/dL numbers.
 * Output: traffic-light classification + relative pattern + counterfactual insight.
 * The raw peakGlucose field is kept for relative bar charting only; it is NOT presented
 * as a clinical CGM reading. The UI must show "~" prefix and a disclaimer.
 */

// ── GI lookup table for common Indian + general foods ───────────────────────
// Sources: Foster-Powell et al. 2002 (AJCN), Atkinson et al. 2008 (Diabetes Care),
//          Indian foods: Misra et al. (2009), Augustin et al. (2015).
// Keys: lowercase food name fragments. Matched via substring.
// Values: GI (glucose reference = 100).
const GI_TABLE = {
  // High GI (>70) — rapid spikes
  'white rice': 73, 'rice': 73, 'basmati rice': 63, 'jasmine rice': 89,
  'bread': 75, 'white bread': 75, 'maida': 70, 'cornflakes': 81,
  'poha': 76, 'puffed rice': 82, 'rice flakes': 76, 'idli': 77,
  'dosa': 72, 'paratha': 62, 'naan': 71, 'puri': 70,
  'potato': 78, 'boiled potato': 78, 'mashed potato': 87, 'french fries': 63,
  'watermelon': 76, 'dates': 103, 'glucose': 100, 'sugar': 65, 'jaggery': 84,
  'sports drink': 78, 'cola': 63, 'juice': 66, 'fruit juice': 66,
  'pineapple': 66, 'raisins': 64,

  // Medium GI (56–70)
  'brown rice': 68, 'whole wheat bread': 69, 'roti': 62, 'chapati': 62,
  'pita': 57, 'oats': 55, 'porridge': 58, 'upma': 65, 'sabudana': 67,
  'banana': 51, 'mango': 56, 'grapes': 59, 'papaya': 60,
  'sweet potato': 63, 'yam': 54, 'couscous': 65,
  'corn': 52, 'maize': 52, 'bhutta': 52,
  'pizza': 60, 'pasta': 50, 'noodles': 58,

  // Low GI (<56)
  'dal': 29, 'lentil': 29, 'masoor': 29, 'moong': 31, 'moong dal': 31,
  'chana': 28, 'chickpea': 28, 'rajma': 29, 'kidney bean': 29,
  'black bean': 30, 'soybean': 16, 'tofu': 15,
  'milk': 31, 'yogurt': 36, 'curd': 36, 'greek yogurt': 11,
  'apple': 36, 'orange': 43, 'pear': 38, 'plum': 39, 'cherry': 22,
  'strawberry': 40, 'peach': 42, 'kiwi': 47,
  'carrot': 35, 'spinach': 15, 'broccoli': 15, 'tomato': 30,
  'cucumber': 15, 'capsicum': 15, 'onion': 10, 'garlic': 10,
  'nuts': 15, 'peanuts': 14, 'almonds': 15, 'cashew': 22, 'walnut': 15,
  'egg': 0, 'chicken': 0, 'fish': 0, 'meat': 0,
  'paneer': 0, 'cheese': 10,
};

const DEFAULT_GI = 60; // fallback for unknown foods

function lookupGI(foodName) {
  if (!foodName) return DEFAULT_GI;
  const lower = foodName.toLowerCase();
  // exact match first
  if (GI_TABLE[lower] !== undefined) return GI_TABLE[lower];
  // substring match — longest key wins to avoid 'rice' matching 'white rice'
  let best = null;
  let bestLen = 0;
  for (const key of Object.keys(GI_TABLE)) {
    if (lower.includes(key) && key.length > bestLen) {
      best = GI_TABLE[key];
      bestLen = key.length;
    }
  }
  return best !== null ? best : DEFAULT_GI;
}

function getMealGI(foods) {
  if (!foods || foods.length === 0) return DEFAULT_GI;
  let totalCarbs = 0;
  let weightedGI = 0;
  foods.forEach(f => {
    const carbs = f.carbs || 0;
    const gi = f.glycemicIndex != null ? f.glycemicIndex : lookupGI(f.name || '');
    weightedGI += gi * carbs;
    totalCarbs += carbs;
  });
  return totalCarbs > 0 ? weightedGI / totalCarbs : DEFAULT_GI;
}

// ── Modifiers ────────────────────────────────────────────────────────────────

// Meal-sequence effect: if protein+fiber was high in meals BEFORE this one,
// gastric emptying slows and glucose rise is blunted.
// Shukla et al. 2019 — 37% reduction when vegetables eaten before carbs.
function mealSequenceModifier(prevMealProtein, prevMealFiber) {
  if (prevMealFiber >= 5 && prevMealProtein >= 15) return 0.63; // −37%
  if (prevMealFiber >= 3 || prevMealProtein >= 10) return 0.80; // −20%
  return 1.0;
}

// Circadian modifier: morning = best insulin sensitivity, evening = worst.
// Saad et al. 2012 (PNAS): insulin secretion is ~50% lower in evening.
function circadianModifier(mealMinute) {
  if (mealMinute < 420) return 0.85;   // before 7am — fasted, lower response
  if (mealMinute < 720) return 0.90;   // 7am–12pm — morning peak sensitivity
  if (mealMinute < 900) return 1.00;   // 12–3pm — moderate
  if (mealMinute < 1080) return 1.10;  // 3–6pm — mild resistance
  return 1.20;                          // after 6pm — evening resistance
}

// Post-workout: active muscle glucose uptake without insulin (GLUT4 translocation).
// Effect lasts ~2h, strongest in first 45 min (Richter & Hargreaves 2013).
function workoutModifier(minsAfterWorkout) {
  if (minsAfterWorkout == null) return 1.0;
  if (minsAfterWorkout <= 45) return 0.70;  // −30%
  if (minsAfterWorkout <= 120) return 0.80; // −20%
  if (minsAfterWorkout <= 180) return 0.90; // −10%
  return 1.0;
}

// Cumulative fiber: each gram of fiber already consumed today reduces next meal's spike.
// Jenkins et al. 1978, 2002. Caps at 40% reduction.
function cumulativeFiberModifier(totalFiberBefore) {
  const reduction = Math.min(totalFiberBefore * 0.015, 0.40);
  return 1.0 - reduction;
}

// ── Main analysis ─────────────────────────────────────────────────────────────

/**
 * @param {Array} meals — meal objects with time (HH:mm) and foods[]
 * @param {Object} [opts]
 * @param {number} [opts.minsAfterWorkout] — minutes since last workout completed (null = no workout today)
 */
function analyzeMeals(meals, opts = {}) {
  if (!meals || meals.length === 0) return null;

  const { minsAfterWorkout = null } = opts;

  const sorted = meals
    .map(m => {
      const parts = (m.time || '').split(':').map(Number);
      const minute = parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
        ? parts[0] * 60 + parts[1] : null;
      return { ...m, mealMinute: minute };
    })
    .filter(m => m.mealMinute !== null)
    .sort((a, b) => a.mealMinute - b.mealMinute);

  if (sorted.length === 0) return null;

  let cumulativeFiber = 0;
  let prevProtein = 0;
  let prevFiber = 0;
  let totalDailyCarbs = 0;
  let totalDailyFiber = 0;
  let totalDailySugar = 0;

  const mealAnalyses = [];

  sorted.forEach((meal, idx) => {
    let carbs = 0, fiber = 0, protein = 0, fat = 0, sugar = 0;
    meal.foods?.forEach(f => {
      carbs += f.carbs || 0;
      fiber += f.fiber || 0;
      protein += f.protein || 0;
      fat += f.fat || 0;
      sugar += f.sugar || 0;
    });

    totalDailyCarbs += carbs;
    totalDailyFiber += fiber;
    totalDailySugar += sugar;

    const gi = getMealGI(meal.foods || []);
    const netCarbs = Math.max(0, carbs - fiber * 0.5); // fiber partially offsets carb response
    const baseGL = (gi / 100) * netCarbs;

    // Apply modifiers
    const seqMod = idx > 0 ? mealSequenceModifier(prevProtein, prevFiber) : 1.0;
    const circMod = circadianModifier(meal.mealMinute);
    const wkoutMod = workoutModifier(minsAfterWorkout);
    const fiberMod = cumulativeFiberModifier(cumulativeFiber);

    const effectiveGL = baseGL * seqMod * circMod * wkoutMod * fiberMod;

    // Map GL to a relative glucose excursion above fasting (90 mg/dL baseline).
    // GL of 10 = moderate meal. Each GL unit ≈ 1.8 mg/dL rise (empirical calibration
    // from Wolever & Bolognesi 1996). This is a MODEL, not a CGM reading.
    const excursion = Math.min(effectiveGL * 1.8, 90); // physiological ceiling
    const peakGlucose = Math.round(90 + excursion);

    const spikeLevel = peakGlucose >= 155 ? 'high' : peakGlucose >= 125 ? 'moderate' : 'low';

    // Counterfactual: what if protein/fiber came first?
    let counterfactual = null;
    if (idx === 0 && spikeLevel !== 'low') {
      const cfGL = effectiveGL * 0.63; // meal-sequence modifier applied
      const cfExcursion = Math.min(cfGL * 1.8, 90);
      const cfPeak = Math.round(90 + cfExcursion);
      if (cfPeak < peakGlucose - 8) {
        counterfactual = {
          action: 'Eat protein/vegetables before the carbs in this meal',
          estimatedPeak: cfPeak,
          reduction: peakGlucose - cfPeak,
        };
      }
    }

    mealAnalyses.push({
      name: meal.name || meal.mealType || 'Meal',
      time: meal.time,
      carbs: Math.round(carbs),
      fiber: Math.round(fiber),
      protein: Math.round(protein),
      gi: Math.round(gi),
      glycemicLoad: Math.round(effectiveGL * 10) / 10,
      peakGlucose, // relative model value — use for bar charts with "~" prefix
      spikeLevel,
      counterfactual,
      modifiersApplied: {
        mealSequence: seqMod < 1.0,
        circadian: circMod > 1.0 ? 'elevated' : circMod < 1.0 ? 'lowered' : 'neutral',
        postWorkout: wkoutMod < 1.0,
        cumulativeFiber: fiberMod < 1.0,
      },
    });

    cumulativeFiber += fiber;
    prevProtein = protein;
    prevFiber = fiber;
  });

  const avgPeak = Math.round(mealAnalyses.reduce((s, m) => s + m.peakGlucose, 0) / mealAnalyses.length);
  const overallLevel = avgPeak >= 150 ? 'high' : avgPeak >= 125 ? 'moderate' : 'low';

  // Pattern summary for the UI
  const highMeals = mealAnalyses.filter(m => m.spikeLevel === 'high');
  const bestCounterfactual = mealAnalyses
    .filter(m => m.counterfactual)
    .sort((a, b) => (b.counterfactual.reduction || 0) - (a.counterfactual.reduction || 0))[0];

  const patternSummary = buildPatternSummary(mealAnalyses, overallLevel);

  // ── 24h curve (48 half-hour points) ───────────────────────────────────────
  const curveData = [];
  const labels = [];

  for (let i = 0; i <= 48; i++) {
    const minute = i * 30;
    let glucose = 90;

    sorted.forEach((meal, idx) => {
      if (minute < meal.mealMinute) return;
      const diff = minute - meal.mealMinute;
      if (diff > 240) return;

      const analysis = mealAnalyses[idx];
      const amp = analysis.peakGlucose - 90;
      // Asymmetric bell: rise to peak at ~45-60 min, fall over 2-3h
      const risePeak = 50;
      const width = diff <= risePeak ? 1200 : 2800;
      const spike = amp * Math.exp(-Math.pow(diff - risePeak, 2) / width);
      glucose += Math.max(0, spike);
    });

    curveData.push(Math.round(glucose));
    labels.push(i % 8 === 0 ? `${Math.floor((i * 30) / 60)}:00` : '');
  }

  return {
    mealAnalyses,
    avgPeak,
    overallLevel,
    patternSummary,
    bestCounterfactual: bestCounterfactual ? bestCounterfactual.counterfactual : null,
    totalDailyCarbs: Math.round(totalDailyCarbs),
    totalDailyFiber: Math.round(totalDailyFiber),
    totalDailySugar: Math.round(totalDailySugar),
    curveData,
    labels,
    modelNote: 'Estimates based on glycemic load model, not CGM data. Use for pattern guidance only.',
  };
}

function buildPatternSummary(mealAnalyses, overallLevel) {
  const highCount = mealAnalyses.filter(m => m.spikeLevel === 'high').length;
  const hasEveningSpike = mealAnalyses.some(m => m.spikeLevel !== 'low' && m.mealMinute >= 1080);
  const hasPostWorkoutBonus = mealAnalyses.some(m => m.modifiersApplied?.postWorkout);

  if (overallLevel === 'low') {
    return 'Well-controlled glycemic day. Good macro sequencing and fiber distribution.';
  }
  if (hasEveningSpike && highCount > 0) {
    return `${highCount} high-GL meal${highCount > 1 ? 's' : ''} detected, including an evening meal. Evening carbs spike higher due to lower insulin sensitivity after 6pm.`;
  }
  if (highCount > 0) {
    return `${highCount} high-GL meal${highCount > 1 ? 's' : ''}. Consider front-loading fiber/protein before carbs at those meals.`;
  }
  if (hasPostWorkoutBonus) {
    return 'Post-workout meals are well-timed — muscle uptake is actively clearing glucose.';
  }
  return 'Moderate glycemic pattern. See per-meal breakdown for improvement tips.';
}

module.exports = { analyzeMeals, lookupGI };
