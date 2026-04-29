const Workout = require('../../models/Workout');
const { NutritionLog } = require('../../models/Logs');
const { evaluateDayInteractions } = require('../nutritionPipeline/nutrientInteractions');
const { analyzeGutTriggers } = require('./gutCorrelationEngine');

/**
 * The Correlation Engine identifies "Horizontal Connections" across different health domains.
 * It detects patterns like nutrition inhibiting performance, or chronic deficiencies.
 */
async function analyzeCorrelations(userId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 1. Fetch Data
  const workouts = await Workout.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const nutritionLogs = await NutritionLog.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const insights = [];

  // 2. Clinical Patterns: Multi-day Interaction Analysis (e.g. the "Chai + Dal" pattern)
  const interactionInsights = analyzeInteractionHistory(nutritionLogs);
  insights.push(...interactionInsights);

  // 3. Correlation: Nutrition vs Training Performance (Lagged Analysis)
  const perfInsight = analyzeNutritionPerformance(workouts, nutritionHistory(nutritionLogs));
  if (perfInsight) insights.push(perfInsight);

  // 4. Chronic Patterns: Deficiency Watch
  const deficiencyInsight = analyzeChronicDeficiencies(nutritionLogs);
  if (deficiencyInsight) insights.push(deficiencyInsight);

  // 5. Gut & Food Tolerances
  const gutInsights = await analyzeGutTriggers(userId, days);
  insights.push(...gutInsights);

  return insights;
}

function nutritionHistory(logs) {
  const map = {};
  logs.forEach(log => {
    const d = new Date(log.date).toDateString();
    map[d] = log;
  });
  return map;
}

/**
 * Detects recurring nutrient antagonisms using the scientific interaction engine.
 */
function analyzeInteractionHistory(logs) {
  const patternCounts = {}; // InteractionID -> count
  const insights = [];

  logs.forEach(log => {
    // nutritionPipeline expects meals with foods
    const { antagonisms } = evaluateDayInteractions(log.meals || []);
    antagonisms.forEach(ant => {
      patternCounts[ant.id] = (patternCounts[ant.id] || 0) + 1;
    });
  });

  // Iron + Tannins (Chai with Dal)
  if (patternCounts['iron_tannins'] >= 4) {
    insights.push({
      type: 'clinical',
      title: 'Iron Absorption Barrier Detected',
      detail: `Your logs show a consistent "Chai with Dal" pattern (${patternCounts['iron_tannins']} times in 30 days). Tannins in your tea/coffee are binding to the iron in your meals, blocking absorption.`,
      impact: 'high',
      action: 'Separate your tea/coffee from your main meals by at least 90 minutes. This will immediately improve your effective iron uptake.'
    });
  }

  // Iron + Calcium
  if (patternCounts['iron_calcium'] >= 4) {
    insights.push({
      type: 'clinical',
      title: 'Iron vs. Calcium Competition',
      detail: `You often consume high-iron and high-calcium foods together. These minerals compete for the same absorption pathway.`,
      impact: 'medium',
      action: 'Try to have your dairy/calcium-rich snacks separately from your iron-rich lunch/dinner.'
    });
  }

  return insights;
}

/**
 * Detects if declining workout volume correlates with calorie/carb intake.
 */
function analyzeNutritionPerformance(workouts, nutritionMap) {
  if (workouts.length < 4) return null;

  const workoutVolume = workouts.map(w => ({
    date: new Date(w.date).toDateString(),
    vol: w.exercises?.reduce((sum, ex) => sum + (ex.sets?.reduce((s, set) => s + (set.reps * set.weight), 0) || 0), 0) || 0
  }));

  // Check last 7 days vs previous 7 days
  const recent = workoutVolume.slice(-3);
  const previous = workoutVolume.slice(-6, -3);

  if (recent.length < 2 || previous.length < 2) return null;

  const avgRecent = recent.reduce((s, v) => s + v.vol, 0) / recent.length;
  const avgPrev = previous.reduce((s, v) => s + v.vol, 0) / previous.length;

  if (avgRecent < avgPrev * 0.9 && avgPrev > 0) {
    // Volume is declining. Check nutrition.
    let lowCalDays = 0;
    recent.forEach(rv => {
      const log = nutritionMap[rv.date];
      if (log && log.macros?.calories < (log.targets?.calories || 2000) * 0.85) {
        lowCalDays++;
      }
    });

    if (lowCalDays >= 1) {
      return {
        type: 'correlation',
        title: 'Energy Drain Detected',
        detail: `Your gym performance is trending down (${Math.round((1 - avgRecent/avgPrev) * 100)}% volume drop). This aligns with lower energy intake on workout days.`,
        impact: 'high',
        action: 'Prioritize a 300kcal carbohydrate-rich snack 2 hours before your next session.'
      };
    }
  }
  return null;
}

/**
 * Detects chronic deficiencies (Iron/B12/Vit D)
 */
function analyzeChronicDeficiencies(logs) {
  if (logs.length < 7) return null;

  let totalIron = 0;
  let targetIron = 0;
  logs.forEach(log => {
    totalIron += log.macros?.iron || 0;
    targetIron += (log.targets?.iron || 18);
  });

  const avgIron = totalIron / logs.length;
  const avgTarget = targetIron / logs.length;

  if (avgIron < avgTarget * 0.6) {
    return {
      type: 'deficiency',
      title: 'Chronic Iron Shortfall',
      detail: `Your iron intake is consistently low (${Math.round(avgIron)}mg vs ${Math.round(avgTarget)}mg target). This is likely the root cause of declining stamina.`,
      impact: 'high',
      action: 'Introduce Vitamin C (lemon/tomatoes) with your lentils to double your current iron absorption rate.'
    };
  }
  return null;
}

module.exports = { analyzeCorrelations };

module.exports = { analyzeCorrelations };
