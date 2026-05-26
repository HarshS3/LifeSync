/**
 * Insulin Intelligence Service
 * 
 * Simulates glycemic response based on meal timing, macronutrient composition, 
 * and sequence (fiber-first modeling).
 */

function analyzeMeals(meals) {
  if (!meals || meals.length === 0) return null;

  const mealAnalyses = [];
  let totalDailyCarbs = 0;
  let totalDailyFiber = 0;
  let totalDailySugar = 0;

  const sorted = [...meals]
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

  sorted.forEach(meal => {
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

    // Glycemic Pressure Formula
    // fiberBonus: cumulative fiber from previous meals reduces overall insulin sensitivity drag
    const fiberBonus = Math.min(cumulativeFiber * 0.015, 0.40);
    // gp: carbs relative to buffering agents (fiber, protein)
    const gp = (carbs / (fiber + protein + 1)) * (1 - fiberBonus);
    // peakAmp: amplitude of the spike
    const peakAmp = Math.min(carbs, 80) * Math.min(gp / 5, 2.5);
    const peakGlucose = Math.round(90 + peakAmp);
    const spikeLevel = peakGlucose >= 160 ? 'high' : peakGlucose >= 130 ? 'moderate' : 'low';

    mealAnalyses.push({
      name: meal.name || meal.mealType || 'Meal',
      time: meal.time,
      carbs: Math.round(carbs),
      fiber: Math.round(fiber),
      protein: Math.round(protein),
      peakGlucose,
      spikeLevel,
    });

    cumulativeFiber += fiber;
  });

  const avgPeak = Math.round(mealAnalyses.reduce((s, m) => s + m.peakGlucose, 0) / mealAnalyses.length);
  const overallLevel = avgPeak >= 155 ? 'high' : avgPeak >= 130 ? 'moderate' : 'low';

  // ─── Generate 24h Curve (48 points, 30-min intervals) ──────────────────────
  const curveData = [];
  const labels = [];

  for (let i = 0; i <= 48; i++) {
    const minute = i * 30;
    let glucose = 90;

    sorted.forEach(meal => {
      if (minute < meal.mealMinute) return;

      const diff = minute - meal.mealMinute;
      if (diff > 240) return; // effect lasts 4 hours

      // Bell curve approximation: amp * exp(-(x-peak)^2 / width)
      const amp = meal.peakGlucose - 90;
      const peakTime = 60; // peak at 1 hour
      const width = 2500;
      const spike = amp * Math.exp(-Math.pow(diff - peakTime, 2) / width);
      glucose += Math.max(0, spike);
    });

    curveData.push(Math.round(glucose));
    if (i % 8 === 0) { // Labels every 4 hours
      const hour = Math.floor(minute / 60);
      labels.push(`${hour}:00`);
    } else {
      labels.push("");
    }
  }

  return {
    mealAnalyses,
    avgPeak,
    overallLevel,
    totalDailyCarbs: Math.round(totalDailyCarbs),
    totalDailyFiber: Math.round(totalDailyFiber),
    totalDailySugar: Math.round(totalDailySugar),
    curveData,
    labels
  };
}

module.exports = {
  analyzeMeals
};
