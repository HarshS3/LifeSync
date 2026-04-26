const { NutritionLog, WeightLog } = require('../../models/Logs');

/**
 * Calculates the running 7-day average of an array of data points.
 * Expects array of { date, value } sorted by date ascending.
 */
function calculateSmoothTrend(dataPoints, windowSize = 7) {
  if (!dataPoints || dataPoints.length === 0) return [];
  
  const smoothed = [];
  for (let i = 0; i < dataPoints.length; i++) {
    let windowSum = 0;
    let windowCount = 0;
    
    // Look back `windowSize` elements
    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      windowSum += dataPoints[j].value;
      windowCount++;
    }
    smoothed.push({
      date: dataPoints[i].date,
      value: windowSum / windowCount
    });
  }
  return smoothed;
}

/**
 * Calculates Adaptive TDEE by comparing consumed calories vs actual weight change.
 * Requires at least 14 days of data to be somewhat accurate, ideally 30+.
 * @param {ObjectId} userId 
 * @param {Number} daysBack - How many days to analyze (e.g., 30)
 * @param {Date} referenceDate - The end date for the analysis (defaults to today)
 */
async function calculateAdaptiveTDEE(userId, daysBack = 30, referenceDate = new Date()) {
  const cutoffDate = new Date(referenceDate);
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // 1. Fetch Weight Logs
  const weightLogsRaw = await WeightLog.find({
    user: userId,
    date: { $gte: cutoffDate, $lte: referenceDate }
  }).sort({ date: 1 });

  if (weightLogsRaw.length < 3) {
    return { status: 'insufficient_data', message: 'Need at least 3 weight logs to estimate Adaptive TDEE.' };
  }

  // 2. Fetch Nutrition Logs to get calorie intake
  const nutritionLogs = await NutritionLog.find({
    user: userId,
    date: { $gte: cutoffDate, $lte: referenceDate }
  }).sort({ date: 1 });

  // Filter out days with < 800 calories (assume incomplete logging)
  const validNutriLogs = nutritionLogs.filter(log => (log.dailyTotals?.calories || 0) > 800);

  if (validNutriLogs.length < 5) {
    return { status: 'insufficient_logging', message: 'Need more days of accurate calorie tracking.' };
  }

  // Calculate average intake
  const totalCalsConsumed = validNutriLogs.reduce((sum, log) => sum + (log.dailyTotals?.calories || 0), 0);
  const avgDailyIntake = totalCalsConsumed / validNutriLogs.length;

  // 3. Smooth Weight Data to calculate trend
  const weightPoints = weightLogsRaw.map(w => ({ date: w.date, value: w.weightKg }));
  const smoothedWeights = calculateSmoothTrend(weightPoints, 7);

  if (smoothedWeights.length < 2) {
    return { status: 'insufficient_smoothed_data', message: 'Not enough data points after smoothing.' };
  }

  // Compare first smoothed point and last smoothed point
  const firstPoint = smoothedWeights[0];
  const lastPoint = smoothedWeights[smoothedWeights.length - 1];

  const daysElapsed = (new Date(lastPoint.date).getTime() - new Date(firstPoint.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysElapsed < 5) {
    return { status: 'insufficient_duration', message: 'Need at least a 5-day span between weight logs.' };
  }

  const weightChangeKg = lastPoint.value - firstPoint.value;
  
  // 1 kg of fat/tissue is roughly 7700 kcal
  const totalCalorieDelta = weightChangeKg * 7700;
  
  // Daily deficit (or surplus if positive) = delta / days
  const dailyEnergyDelta = totalCalorieDelta / Math.max(1, daysElapsed);

  const adaptiveTdee = avgDailyIntake - dailyEnergyDelta;

  // Check for Metabolic Adaptation stall:
  let isAdapted = false;
  let recommendation = '';

  if (avgDailyIntake < 1500 && Math.abs(weightChangeKg) < 0.3 && daysElapsed >= 14) {
    isAdapted = true;
    recommendation = `Metabolic Adaptation detected. Consider a 1-2 week diet break.`;
  }

  return {
    status: 'success',
    adaptiveTdee: Math.round(adaptiveTdee),
    avgDailyIntake: Math.round(avgDailyIntake),
    weightChangeKg: parseFloat(weightChangeKg.toFixed(2)),
    daysAnalyzed: Math.round(daysElapsed),
    smoothedCurve: smoothedWeights,
    isAdapted,
    recommendation
  };
}

/**
 * Calculates adaptive TDEE for every day in a range.
 * Highly optimized to avoid O(N^2) DB queries.
 */
async function calculateAdaptiveTDEEForRange(userId, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Fetch logs with 30-day buffer before start
  const bufferStart = new Date(start);
  bufferStart.setDate(bufferStart.getDate() - 40); // 40 days for safety

  const [weights, nutrition] = await Promise.all([
    WeightLog.find({ user: userId, date: { $gte: bufferStart, $lte: end } }).sort({ date: 1 }).lean(),
    NutritionLog.find({ user: userId, date: { $gte: bufferStart, $lte: end } }).sort({ date: 1 }).lean()
  ]);

  const results = {};
  
  // Iterate through each day in the requested range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = d.toISOString().split('T')[0];
    
    // Window: [d - 30, d]
    const winEnd = new Date(d);
    const winStart = new Date(d);
    winStart.setDate(winStart.getDate() - 30);

    const winWeights = weights.filter(w => w.date >= winStart && w.date <= winEnd);
    const winNutri = nutrition.filter(n => n.date >= winStart && n.date <= winEnd && (n.dailyTotals?.calories || 0) > 800);

    if (winWeights.length >= 3 && winNutri.length >= 5) {
      // Calculate inline for performance
      const totalCals = winNutri.reduce((sum, n) => sum + (n.dailyTotals.calories || 0), 0);
      const avgIntake = totalCals / winNutri.length;
      
      const pts = winWeights.map(w => ({ date: w.date, value: w.weightKg }));
      const smoothed = calculateSmoothTrend(pts, 7);
      
      if (smoothed.length >= 2) {
        const first = smoothed[0];
        const last = smoothed[smoothed.length - 1];
        const elapsed = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24);
        
        if (elapsed >= 5) {
          const delta = ((last.value - first.value) * 7700) / elapsed;
          results[dayKey] = Math.round(avgIntake - delta);
        }
      }
    }
  }
  
  return results;
}

module.exports = {
  calculateAdaptiveTDEE,
  calculateAdaptiveTDEEForRange,
  calculateSmoothTrend
};
