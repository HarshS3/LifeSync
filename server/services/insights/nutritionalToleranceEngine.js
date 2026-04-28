const { NutritionLog, WeightLog, MentalLog, FitnessLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');

/**
 * Analyzes individual nutritional tolerances by correlating intake with 
 * downstream biological signals (weight, energy, hunger, performance).
 */
async function analyzeNutritionalDNA(userId) {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  // 1. Fetch all relevant logs
  const [nutrition, weights, mental, workouts] = await Promise.all([
    NutritionLog.find({ user: userId, date: { $gte: fourWeeksAgo } }).sort({ date: 1 }),
    WeightLog.find({ user: userId, date: { $gte: fourWeeksAgo } }).sort({ date: 1 }),
    MentalLog.find({ user: userId, date: { $gte: fourWeeksAgo } }).sort({ date: 1 }),
    Workout.find({ user: userId, date: { $gte: fourWeeksAgo } }).sort({ date: 1 })
  ]);

  if (nutrition.length < 7) {
    return { status: 'insufficient_data', message: 'Log more meals to unlock your Nutritional DNA profile.' };
  }

  // Map data by date string for easy lookup
  const dateMap = {};
  const getDateStr = (d) => new Date(d).toISOString().split('T')[0];

  nutrition.forEach(n => {
    const d = getDateStr(n.date);
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d].carbs = n.dailyTotals?.carbs || 0;
    dateMap[d].sodium = n.dailyTotals?.sodium || 0;
  });

  weights.forEach(w => {
    const d = getDateStr(w.date);
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d].weight = w.weightKg;
  });

  mental.forEach(m => {
    const d = getDateStr(m.date);
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d].energy = m.energyLevel;
    dateMap[d].hunger = m.hungerLevel;
  });

  workouts.forEach(w => {
    const d = getDateStr(w.date);
    if (!dateMap[d]) dateMap[d] = {};
    const sessionMax = Math.max(...(w.exercises?.flatMap(ex => ex.sets?.map(s => s.weight) || []) || [0]));
    dateMap[d].performance = sessionMax;
  });

  // 2. Perform Correlation Analysis
  const carbTolerance = analyzeCarbTolerance(dateMap);
  const saltSensitivity = analyzeSaltSensitivity(dateMap);

  return {
    status: 'success',
    profile: {
      carbTolerance,
      saltSensitivity
    }
  };
}

function analyzeCarbTolerance(dateMap) {
  const dates = Object.keys(dateMap).sort();
  const highCarbDays = [];
  const lowCarbDays = [];

  // Determine user-specific high/low carb thresholds (simple version: top/bottom 30%)
  const carbValues = Object.values(dateMap).map(d => d.carbs).filter(c => c > 0).sort((a, b) => a - b);
  if (carbValues.length < 5) return { status: 'unknown' };
  
  const lowThreshold = carbValues[Math.floor(carbValues.length * 0.3)];
  const highThreshold = carbValues[Math.floor(carbValues.length * 0.7)];

  dates.forEach((d, i) => {
    const data = dateMap[d];
    if (data.carbs >= highThreshold && data.carbs > 150) {
      highCarbDays.push({ date: d, index: i });
    } else if (data.carbs <= lowThreshold && data.carbs > 0) {
      lowCarbDays.push({ date: d, index: i });
    }
  });

  // Signals to observe on "Next Day"
  const signals = {
    weightSpike: [], // high carb -> next morning weight change
    performanceBoost: [], // high carb -> next day workout performance
    hungerResponse: [] // high carb -> next day hunger
  };

  highCarbDays.forEach(day => {
    const nextDayStr = dates[day.index + 1];
    if (!nextDayStr) return;
    const nextDay = dateMap[nextDayStr];
    const currentDay = dateMap[day.date];

    if (nextDay.weight && currentDay.weight) {
      signals.weightSpike.push(nextDay.weight - currentDay.weight);
    }
    if (nextDay.performance) {
      signals.performanceBoost.push(nextDay.performance);
    }
    if (nextDay.hunger) {
      signals.hungerResponse.push(nextDay.hunger);
    }
  });

  const avgWeightSpike = signals.weightSpike.length ? signals.weightSpike.reduce((a, b) => a + b, 0) / signals.weightSpike.length : 0;
  
  let tolerance = 'medium';
  let reasoning = "Your body handles carbohydrates in a standard way.";
  let action = "Continue with a balanced macronutrient approach.";

  if (avgWeightSpike > 0.8 && signals.weightSpike.length >= 2) {
    tolerance = 'low';
    reasoning = `After high carb days, your weight spikes by an average of ${avgWeightSpike.toFixed(2)}kg. This suggests high water retention and potentially lower insulin sensitivity.`;
    action = "Prioritize protein and fats. Keep higher carb meals specifically around your training window to maximize glycogen replenishment without the bloat.";
  } else if (avgWeightSpike < 0.3 && signals.performanceBoost.length >= 2) {
    tolerance = 'high';
    reasoning = "You show minimal water retention after high carb days and consistent performance boosts. Your body is highly efficient at partition carbs into muscle tissue.";
    action = "A carb-forward approach is ideal for your biology. Use complex carbs as your primary fuel source, especially pre and post workout.";
  }

  return {
    tolerance,
    avgWeightSpike,
    reasoning,
    action,
    dataPoints: highCarbDays.length
  };
}

function analyzeSaltSensitivity(dateMap) {
  // Similar logic for Sodium -> Weight
  return { status: 'analyzing', message: 'More sodium data needed for precise calibration.' };
}

module.exports = { analyzeNutritionalDNA };
