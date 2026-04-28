const { NutritionLog } = require('../../models/Logs');

/**
 * Analyzes hunger and satiety patterns by observing logging frequency 
 * relative to meal macro composition.
 */
async function analyzeSatietyPatterns(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await NutritionLog.find({
    user: userId,
    date: { $gte: thirtyDaysAgo }
  }).sort({ date: 1 });

  if (logs.length < 10) {
    return { status: 'insufficient_data', message: 'Log your meals for at least 10 days to map your satiety patterns.' };
  }

  const mealStats = []; // { macros, gapUntilNextMeal }
  const firstMealTimes = [];

  logs.forEach(day => {
    if (!day.meals || day.meals.length < 2) return;

    // Sort meals by time
    const sortedMeals = [...day.meals].sort((a, b) => {
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });

    // Capture first meal time
    if (sortedMeals[0]?.time) {
      const [h, m] = sortedMeals[0].time.split(':').map(Number);
      firstMealTimes.push(h + m/60);
    }

    for (let i = 0; i < sortedMeals.length - 1; i++) {
      const current = sortedMeals[i];
      const next = sortedMeals[i+1];

      if (!current.time || !next.time) continue;

      const [h1, m1] = current.time.split(':').map(Number);
      const [h2, m2] = next.time.split(':').map(Number);
      
      const gapHours = (h2 + m2/60) - (h1 + m1/60);

      if (gapHours > 0 && gapHours < 12) {
        mealStats.push({
          protein: current.totalProtein || 0,
          carbs: current.totalCarbs || 0,
          fat: current.totalFat || 0,
          calories: current.totalCalories || 0,
          gapHours
        });
      }
    }
  });

  if (mealStats.length < 5) {
    return { status: 'insufficient_data', message: 'More frequent logging needed to detect meal gaps.' };
  }

  // Group by dominant macro
  const patterns = {
    highProtein: [], // gap durations
    highCarb: [],
    highFat: []
  };

  mealStats.forEach(s => {
    const totalMacros = s.protein + s.carbs + s.fat;
    if (totalMacros === 0) return;

    const pPct = s.protein / totalMacros;
    const cPct = s.carbs / totalMacros;
    const fPct = s.fat / totalMacros;

    if (pPct > 0.35) patterns.highProtein.push(s.gapHours);
    if (cPct > 0.50) patterns.highCarb.push(s.gapHours);
    if (fPct > 0.40) patterns.highFat.push(s.gapHours);
  });

  const getAvg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;

  const results = {
    proteinSatiety: getAvg(patterns.highProtein),
    carbSatiety: getAvg(patterns.highCarb),
    fatSatiety: getAvg(patterns.highFat),
    avgFirstMeal: getAvg(firstMealTimes)
  };

  // Build Insights
  const insights = [];
  if (results.proteinSatiety && results.carbSatiety) {
    if (results.proteinSatiety > results.carbSatiety + 1) {
      insights.push(`Protein is significantly more satiating for you. High-protein meals keep you full for ~${results.proteinSatiety.toFixed(1)} hours compared to ~${results.carbSatiety.toFixed(1)} hours for high-carb meals.`);
    }
  }

  if (results.avgFirstMeal > 11) {
    insights.push(`You naturally gravitate towards a later first meal (avg ${Math.floor(results.avgFirstMeal)}:${Math.round((results.avgFirstMeal%1)*60).toString().padStart(2,'0')}), suggesting high morning satiety.`);
  }

  return {
    status: 'success',
    results,
    insights,
    summary: `Analyzed ${mealStats.length} meal transitions over 30 days.`
  };
}

module.exports = { analyzeSatietyPatterns };
