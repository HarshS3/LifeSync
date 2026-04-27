const { NutritionLog, WeightLog, MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');

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

/**
 * ═══════════════════════════════════════════════════════════════
 * PERSONAL METABOLIC MAP
 * ═══════════════════════════════════════════════════════════════
 * Goes beyond a single TDEE number. Builds a dynamic model
 * that adjusts for:
 *   1. Stress load  — cortisol suppresses NEAT (-50 to -200 cal)
 *   2. Training load — EPOC & muscle mass elevate TDEE (+50 to +300 cal)
 *   3. Diet adaptation — prolonged deficit triggers metabolic slowdown
 *
 * Scientific basis:
 *   - Cortisol chronically elevated → reduces spontaneous movement (NEAT)
 *     Ref: Dallman et al., 2004; Epel et al., 2001
 *   - Resistance training EPOC: ~5-9% elevation for 24-48h post session
 *     Ref: Schuenke et al., 2002; Speakman & Selman, 2003
 *   - Metabolic adaptation in sustained deficit: ~5-15% below predicted
 *     Ref: Rosenbaum & Leibel, 2010; Muller & Bosy-Westphal, 2013
 */
async function calculateMetabolicMap(userId, daysBack = 60) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // ── Fetch all data in parallel ──────────────────────────────────
  const [nutritionLogs, weightLogs, mentalLogs, workouts] = await Promise.all([
    NutritionLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean(),
    WeightLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean(),
    MentalLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean(),
    Workout.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean(),
  ]);

  const validNutriLogs = nutritionLogs.filter(l => (l.dailyTotals?.calories || 0) > 800);

  if (validNutriLogs.length < 5 || weightLogs.length < 3) {
    return { status: 'insufficient_data', message: 'Need at least 5 nutrition logs and 3 weight logs for a metabolic map.' };
  }

  // ── 1. BASE TDEE (calorie-vs-weight method) ─────────────────────
  const weightPoints = weightLogs.map(w => ({ date: w.date, value: w.weightKg }));
  const smoothedWeights = calculateSmoothTrend(weightPoints, 7);
  const firstW = smoothedWeights[0];
  const lastW = smoothedWeights[smoothedWeights.length - 1];
  const daysElapsed = Math.max(1, (new Date(lastW.date) - new Date(firstW.date)) / 86400000);
  const weightChangeKg = lastW.value - firstW.value;
  const avgIntake = validNutriLogs.reduce((s, l) => s + (l.dailyTotals?.calories || 0), 0) / validNutriLogs.length;
  const baseTDEE = Math.round(avgIntake - (weightChangeKg * 7700) / daysElapsed);

  // ── 2. STRESS MODIFIER ──────────────────────────────────────────
  // Recent 7-day stress vs historical baseline
  const recentWeekMentals = mentalLogs.filter(l => {
    const daysAgo = (endDate - new Date(l.date)) / 86400000;
    return daysAgo <= 7;
  });
  const olderMentals = mentalLogs.filter(l => {
    const daysAgo = (endDate - new Date(l.date)) / 86400000;
    return daysAgo > 7 && daysAgo <= 56;
  });

  const avgRecentStress = recentWeekMentals.length > 0
    ? recentWeekMentals.reduce((s, l) => s + (l.stressLevel || 5), 0) / recentWeekMentals.length
    : 5;
  const avgBaselineStress = olderMentals.length > 0
    ? olderMentals.reduce((s, l) => s + (l.stressLevel || 5), 0) / olderMentals.length
    : 5;

  // Each point above baseline stress reduces NEAT by ~25 cal
  const stressDelta = avgRecentStress - avgBaselineStress;
  const stressModifier = Math.round(Math.max(-200, Math.min(50, stressDelta * -25)));
  const stressLabel = stressDelta > 1.5
    ? `High stress week detected (avg ${avgRecentStress.toFixed(1)}/10). Cortisol suppressing NEAT by ~${Math.abs(stressModifier)} cal/day.`
    : stressDelta < -1.5
    ? `Lower stress than baseline — NEAT likely elevated by ~${Math.abs(stressModifier)} cal/day.`
    : `Stress within normal range.`;

  // ── 3. TRAINING LOAD MODIFIER ───────────────────────────────────
  // Recent week volume vs rolling 4-week average
  const recentWeekWorkouts = workouts.filter(w => (endDate - new Date(w.date)) / 86400000 <= 7);
  const olderWorkouts = workouts.filter(w => {
    const daysAgo = (endDate - new Date(w.date)) / 86400000;
    return daysAgo > 7 && daysAgo <= 35;
  });

  const calcVolume = (ws) => ws.reduce((total, w) => {
    const wVol = (w.exercises || []).reduce((ex, e) =>
      ex + (e.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);
    return total + wVol;
  }, 0);

  const recentVolume = calcVolume(recentWeekWorkouts);
  const avgWeeklyVolume = olderWorkouts.length > 0
    ? calcVolume(olderWorkouts) / Math.max(1, olderWorkouts.length / 3)
    : recentVolume;

  const volumeRatio = avgWeeklyVolume > 0 ? recentVolume / avgWeeklyVolume : 1;
  // Scale modifier: 1.5x volume → +~150 cal; 0.5x volume → -~75 cal
  const trainingModifier = Math.round(Math.max(-150, Math.min(300, (volumeRatio - 1) * 200)));
  const trainingLabel = recentWeekWorkouts.length === 0
    ? `No workouts logged this week — EPOC contribution is zero.`
    : volumeRatio > 1.3
    ? `Heavy training week (${recentWeekWorkouts.length} sessions). EPOC elevating TDEE by ~${trainingModifier} cal/day.`
    : volumeRatio < 0.7
    ? `Lighter training week than usual. TDEE adjusted down by ~${Math.abs(trainingModifier)} cal/day.`
    : `Training load is at your normal level.`;

  // ── 4. METABOLIC ADAPTATION MODIFIER ───────────────────────────
  // Detect sustained caloric deficit (8+ weeks below TDEE)
  let adaptationModifier = 0;
  let adaptationLabel = 'No metabolic adaptation detected.';
  let deficitStreak = 0;

  // Walk through nutrition logs weekly and check if intake < baseTDEE
  const weeklyCalories = {};
  validNutriLogs.forEach(l => {
    const weekKey = Math.floor((endDate - new Date(l.date)) / (7 * 86400000));
    if (!weeklyCalories[weekKey]) weeklyCalories[weekKey] = [];
    weeklyCalories[weekKey].push(l.dailyTotals?.calories || 0);
  });

  Object.values(weeklyCalories).forEach(weekLogs => {
    const weekAvg = weekLogs.reduce((s, c) => s + c, 0) / weekLogs.length;
    if (weekAvg < baseTDEE - 200) deficitStreak++;
  });

  if (deficitStreak >= 8) {
    adaptationModifier = -Math.round(baseTDEE * 0.12); // 12% suppression
    adaptationLabel = `${deficitStreak} weeks of sustained deficit detected. Metabolic adaptation likely — actual TDEE suppressed by ~${Math.abs(adaptationModifier)} cal/day. Consider a diet break.`;
  } else if (deficitStreak >= 6) {
    adaptationModifier = -Math.round(baseTDEE * 0.08);
    adaptationLabel = `${deficitStreak} weeks of sustained deficit. Early metabolic adaptation (~${Math.abs(adaptationModifier)} cal/day suppression). Monitor closely.`;
  } else if (deficitStreak >= 4) {
    adaptationModifier = -Math.round(baseTDEE * 0.05);
    adaptationLabel = `${deficitStreak} weeks of deficit — mild adaptation signal. Adjusted TDEE by ~${Math.abs(adaptationModifier)} cal/day.`;
  }

  // ── 5. DYNAMIC TDEE ─────────────────────────────────────────────
  const dynamicTDEE = baseTDEE + stressModifier + trainingModifier + adaptationModifier;

  // ── 6. DIET PHASE DETECTION ─────────────────────────────────────
  const intakeVsDynamic = avgIntake - dynamicTDEE;
  const dietPhase =
    intakeVsDynamic < -400 ? 'aggressive_cut'
    : intakeVsDynamic < -100 ? 'moderate_cut'
    : intakeVsDynamic < 100  ? 'maintenance'
    : intakeVsDynamic < 400  ? 'moderate_bulk'
    : 'aggressive_bulk';

  return {
    status: 'success',
    baseTDEE,
    dynamicTDEE: Math.round(dynamicTDEE),
    avgDailyIntake: Math.round(avgIntake),
    dietPhase,
    modifiers: {
      stress: {
        value: stressModifier,
        avgRecentStress: parseFloat(avgRecentStress.toFixed(1)),
        avgBaselineStress: parseFloat(avgBaselineStress.toFixed(1)),
        label: stressLabel,
      },
      training: {
        value: trainingModifier,
        sessionsThisWeek: recentWeekWorkouts.length,
        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
        label: trainingLabel,
      },
      adaptation: {
        value: adaptationModifier,
        deficitStreakWeeks: deficitStreak,
        label: adaptationLabel,
      },
    },
    insight: `Your real TDEE right now is ~${Math.round(dynamicTDEE)} cal/day — not the formula's estimate of ${baseTDEE}. This accounts for your current stress load, training volume, and diet history.`,
    weightChangeKg: parseFloat(weightChangeKg.toFixed(2)),
    daysAnalyzed: Math.round(daysElapsed),
  };
}

module.exports = {
  calculateAdaptiveTDEE,
  calculateAdaptiveTDEEForRange,
  calculateSmoothTrend,
  calculateMetabolicMap
};
