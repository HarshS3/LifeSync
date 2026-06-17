const { NutritionLog, WeightLog, MentalLog, StepsLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const { EXERCISE_METADATA } = require('../../constants/exerciseMetadata');

// TASK 1: Use evidence-based 7000 kcal/kg tissue (not 7700)
const KCAL_PER_KG_TISSUE = 7000;

/**
 * Calculates the running 7-day average of an array of data points.
 * Expects array of { date, value } sorted by date ascending.
 */
function calculateSmoothTrend(dataPoints, windowSize = 7) {
  if (!dataPoints || dataPoints.length === 0) return [];

  // To handle sparse data, we create a map of dates to values
  const dataMap = {};
  dataPoints.forEach(p => {
    const dStr = new Date(p.date).toLocaleDateString('en-CA');
    dataMap[dStr] = p.value;
  });

  const smoothed = [];
  dataPoints.forEach(p => {
    const currentDate = new Date(p.date);
    let windowSum = 0;
    let windowCount = 0;

    for (let i = 0; i < windowSize; i++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = checkDate.toLocaleDateString('en-CA');

      if (dataMap[checkStr] !== undefined) {
        windowSum += dataMap[checkStr];
        windowCount++;
      }
    }

    smoothed.push({
      date: p.date,
      value: windowSum / Math.max(1, windowCount)
    });
  });
  return smoothed;
}

// TASK 5: median helper for water-weight-resistant anchors
function medianVal(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
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

  // 1. Fetch Weight Logs and User Weight (for bodyweight volume)
  const [weightLogsRaw, user] = await Promise.all([
    WeightLog.find({
      user: userId,
      date: { $gte: cutoffDate, $lte: referenceDate }
    }).select('date weightKg').sort({ date: 1 }).lean(),
    require('../../models/User').findById(userId).select('weight biologicalProfile').lean()
  ]);

  // 2. Fetch Nutrition Logs to get calorie intake
  const nutritionLogs = await NutritionLog.find({
    user: userId,
    date: { $gte: cutoffDate, $lte: referenceDate }
  }).select('date dailyTotals.calories').sort({ date: 1 }).lean();

  // Filter out days with < 800 calories (assume incomplete logging)
  const validNutriLogs = nutritionLogs.filter(log => (log.dailyTotals?.calories || 0) > 800);

  // 3. Smooth Weight Data to calculate trend
  const weightPoints = weightLogsRaw.map(w => ({ date: w.date, value: w.weightKg }));
  const smoothedWeights = calculateSmoothTrend(weightPoints, 7);

  // TASK 2: Require at least 7 weight logs AND 14 days elapsed
  const daysElapsedPreCheck = smoothedWeights.length >= 2
    ? (new Date(smoothedWeights[smoothedWeights.length - 1].date).getTime() - new Date(smoothedWeights[0].date).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  if (weightLogsRaw.length < 7 || daysElapsedPreCheck < 14) {
    return { status: 'insufficient_data', reason: 'Need at least 7 weight logs over 14 days for accurate TDEE.' };
  }

  if (validNutriLogs.length < 5) {
    return { status: 'insufficient_logging', message: 'Need more days of accurate calorie tracking.' };
  }

  if (smoothedWeights.length < 2) {
    return { status: 'insufficient_smoothed_data', message: 'Not enough data points after smoothing.' };
  }

  const firstPoint = smoothedWeights[0];
  const lastPoint = smoothedWeights[smoothedWeights.length - 1];

  const daysElapsed = (new Date(lastPoint.date).getTime() - new Date(firstPoint.date).getTime()) / (1000 * 60 * 60 * 24);
  if (daysElapsed < 5) {
    return { status: 'insufficient_duration', message: 'Need at least a 5-day span between weight logs.' };
  }

  // TASK 4: Log coverage check — require 60% of days logged
  if (validNutriLogs.length / daysElapsed < 0.6) {
    return { status: 'insufficient_logging', reason: 'Log food consistently (60% of days) for accurate TDEE.' };
  }

  // Calculate average intake
  const totalCalsConsumed = validNutriLogs.reduce((sum, log) => sum + (log.dailyTotals?.calories || 0), 0);
  const avgDailyIntake = totalCalsConsumed / validNutriLogs.length;

  // TASK 5: Use median of first 3 and last 3 smoothed points as anchors
  const firstWeight = medianVal(smoothedWeights.slice(0, 3).map(p => p.value));
  const lastWeight = medianVal(smoothedWeights.slice(-3).map(p => p.value));
  const weightChangeKg = lastWeight - firstWeight;

  // TASK 1: Use KCAL_PER_KG_TISSUE (7000) instead of 7700
  const totalCalorieDelta = weightChangeKg * KCAL_PER_KG_TISSUE;

  // Daily deficit (or surplus if positive) = delta / days
  const dailyEnergyDelta = totalCalorieDelta / Math.max(1, daysElapsed);

  const rawTdee = avgDailyIntake - dailyEnergyDelta;

  // TASK 3: Clamp adaptive TDEE to physiologically plausible range
  const adaptiveTdee = Math.max(1000, Math.min(6000, rawTdee));
  const lowConfidence = adaptiveTdee < 1200 || adaptiveTdee > 4500;

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
    recommendation,
    lowConfidence,
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
    WeightLog.find({ user: userId, date: { $gte: bufferStart, $lte: end } }).select('date weightKg').sort({ date: 1 }).lean(),
    NutritionLog.find({ user: userId, date: { $gte: bufferStart, $lte: end } }).select('date dailyTotals.calories').sort({ date: 1 }).lean()
  ]);

  const results = {};

  // Pre-process weights for smoothing
  const weightPoints = weights.map(w => ({ date: w.date, value: w.weightKg }));
  const smoothedWeightsMap = {};
  calculateSmoothTrend(weightPoints, 7).forEach(p => {
    smoothedWeightsMap[new Date(p.date).toLocaleDateString('en-CA')] = p.value;
  });

  // Iterate through each day in the requested range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = d.toLocaleDateString('en-CA');

    // Window: [d - 30, d]
    const winEnd = new Date(d);
    const winStart = new Date(d);
    winStart.setDate(winStart.getDate() - 30);

    const winNutri = nutrition.filter(n => n.date >= winStart && n.date <= winEnd && (n.dailyTotals?.calories || 0) > 800);

    // Find smoothed points in the 30-day window
    const windowDateKeys = Object.keys(smoothedWeightsMap)
      .filter(k => k >= winStart.toLocaleDateString('en-CA') && k <= dayKey)
      .sort();

    if (windowDateKeys.length >= 2 && winNutri.length >= 5) {
      const elapsed = (new Date(windowDateKeys[windowDateKeys.length - 1]) - new Date(windowDateKeys[0])) / 86400000;

      // TASK 4: Log coverage check
      if (winNutri.length / Math.max(1, elapsed) < 0.6) continue;

      // TASK 5: Use median of first 3 and last 3 smoothed points
      const firstSlice = windowDateKeys.slice(0, 3).map(k => smoothedWeightsMap[k]);
      const lastSlice = windowDateKeys.slice(-3).map(k => smoothedWeightsMap[k]);
      const firstVal = medianVal(firstSlice);
      const lastVal = medianVal(lastSlice);

      if (elapsed >= 5) {
        const totalCals = winNutri.reduce((sum, n) => sum + (n.dailyTotals.calories || 0), 0);
        const avgIntake = totalCals / winNutri.length;
        // TASK 1: Use KCAL_PER_KG_TISSUE
        const delta = ((lastVal - firstVal) * KCAL_PER_KG_TISSUE) / elapsed;
        const rawTdee = avgIntake - delta;
        // TASK 3: Clamp output
        results[dayKey] = Math.round(Math.max(1000, Math.min(6000, rawTdee)));
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
  const [user, nutritionLogs, weightLogs, mentalLogs, workouts, stepLogs] = await Promise.all([
    require('../../models/User').findById(userId).select('weight biologicalProfile').lean(),
    NutritionLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).select('date dailyTotals.calories').sort({ date: 1 }).lean(),
    WeightLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).select('date weightKg').sort({ date: 1 }).lean(),
    MentalLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).select('date stressLevel').sort({ date: 1 }).lean(),
    Workout.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).select('date exercises.name exercises.muscleGroup exercises.sets.weight exercises.sets.reps exercises.sets.duration exercises.sets.distance').sort({ date: 1 }).lean(),
    StepsLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).select('date stepsCount').sort({ date: 1 }).lean(),
  ]);

  const validNutriLogs = nutritionLogs.filter(l => (l.dailyTotals?.calories || 0) > 800);

  // TASK 2: Require at least 7 weight logs
  if (validNutriLogs.length < 5 || weightLogs.length < 7) {
    return { status: 'insufficient_data', reason: 'Need at least 7 weight logs over 14 days for accurate TDEE.', insulinSensitivity: user?.biologicalProfile?.insulinSensitivity || 'normal' };
  }

  // ── 1. BASE TDEE (calorie-vs-weight method) ─────────────────────
  const weightPoints = weightLogs.map(w => ({ date: w.date, value: w.weightKg }));
  const smoothedWeights = calculateSmoothTrend(weightPoints, 7);
  const firstW = smoothedWeights[0];
  const lastW = smoothedWeights[smoothedWeights.length - 1];
  const daysElapsed = Math.max(1, (new Date(lastW.date) - new Date(firstW.date)) / 86400000);

  // TASK 2: Check 14 days elapsed
  if (daysElapsed < 14) {
    return { status: 'insufficient_data', reason: 'Need at least 7 weight logs over 14 days for accurate TDEE.', insulinSensitivity: user?.biologicalProfile?.insulinSensitivity || 'normal' };
  }

  // TASK 4: Log coverage check
  if (validNutriLogs.length / daysElapsed < 0.6) {
    return { status: 'insufficient_logging', reason: 'Log food consistently (60% of days) for accurate TDEE.', insulinSensitivity: user?.biologicalProfile?.insulinSensitivity || 'normal' };
  }

  // TASK 5: Use median of first 3 and last 3 smoothed points as anchors
  const firstWeightVal = medianVal(smoothedWeights.slice(0, 3).map(p => p.value));
  const lastWeightVal = medianVal(smoothedWeights.slice(-3).map(p => p.value));
  const weightChangeKg = lastWeightVal - firstWeightVal;

  // TASK 6: Long-run avg intake for baseTDEE; recent 7-14 days for dietPhase
  const longRunLogs = validNutriLogs;
  const recentCutoff = new Date(endDate);
  recentCutoff.setDate(recentCutoff.getDate() - 14);
  const recentLogs = validNutriLogs.filter(l => new Date(l.date) >= recentCutoff);

  const longRunAvgIntake = longRunLogs.reduce((s, l) => s + (l.dailyTotals?.calories || 0), 0) / longRunLogs.length;
  const recentAvgIntake = recentLogs.length > 0
    ? recentLogs.reduce((s, l) => s + (l.dailyTotals?.calories || 0), 0) / recentLogs.length
    : longRunAvgIntake;

  // TASK 1: Use KCAL_PER_KG_TISSUE for baseTDEE
  const rawBaseTDEE = longRunAvgIntake - (weightChangeKg * KCAL_PER_KG_TISSUE) / daysElapsed;
  // TASK 3: Clamp baseTDEE
  const baseTDEE = Math.round(Math.max(1000, Math.min(6000, rawBaseTDEE)));
  const baseTDEELowConfidence = baseTDEE < 1200 || baseTDEE > 4500;

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

  // ── 3. TRAINING LOAD MODIFIER (Resistance) ──────────────────────
  // Recent week volume vs rolling average
  const recentWeekWorkouts = workouts.filter(w => (endDate - new Date(w.date)) / 86400000 <= 7);
  const olderWorkouts = workouts.filter(w => {
    const daysAgo = (endDate - new Date(w.date)) / 86400000;
    return daysAgo > 7 && daysAgo <= 42; // Up to 6 weeks for baseline
  });

  const userWeight = user?.biologicalProfile?.weight || user?.weight || 75;

  // Calculates RESISTANCE volume (weight * reps)
  const calcResistanceVolume = (ws) => ws.reduce((total, w) => {
    const wVol = (w.exercises || []).reduce((ex, e) => {
      const meta = EXERCISE_METADATA[e.name];
      if (meta?.type === 'cardio') return ex; // Skip cardio in resistance calc

      return ex + (e.sets || []).reduce((s, set) => {
        const effectiveWeight = (set.weight && set.weight > 0) ? set.weight : userWeight;
        return s + effectiveWeight * (set.reps || 0);
      }, 0);
    }, 0);
    return total + wVol;
  }, 0);

  const recentResVolume = calcResistanceVolume(recentWeekWorkouts);
  const avgWeeklyResVolume = olderWorkouts.length > 0
    ? calcResistanceVolume(olderWorkouts) / (olderWorkouts.length > 28 ? 5 : 4) // Estimate weeks
    : recentResVolume;

  const resVolumeRatio = avgWeeklyResVolume > 0 ? recentResVolume / avgWeeklyResVolume : 1;
  const trainingModifier = Math.round(Math.max(-150, Math.min(300, (resVolumeRatio - 1) * 200)));
  const trainingLabel = recentWeekWorkouts.length === 0
    ? `No resistance workouts logged this week.`
    : resVolumeRatio > 1.3
    ? `Heavy lifting week detected. EPOC elevating TDEE by ~${trainingModifier} cal/day.`
    : resVolumeRatio < 0.7
    ? `Lighter lifting week than usual. TDEE adjusted down by ~${Math.abs(trainingModifier)} cal/day.`
    : `Resistance training load is at your normal level.`;

  // ── 3.1 STEP MODIFIER (Relative Delta) ───────────────────────────
  const recentSteps = stepLogs.filter(l => (endDate - new Date(l.date)) / 86400000 <= 7);
  const olderSteps = stepLogs.filter(l => {
    const daysAgo = (endDate - new Date(l.date)) / 86400000;
    return daysAgo > 7;
  });

  const avgRecentSteps = recentSteps.length > 0
    ? recentSteps.reduce((s, l) => s + (l.stepsCount || 0), 0) / recentSteps.length
    : 0;
  const avgBaselineSteps = olderSteps.length > 0
    ? olderSteps.reduce((s, l) => s + (l.stepsCount || 0), 0) / olderSteps.length
    : avgRecentSteps || 5000; // Fallback to recent or 5k

  const stepDelta = avgRecentSteps - avgBaselineSteps;
  const stepModifier = Math.round(stepDelta * 0.04); // ~0.04 kcal per step
  const stepLabel = Math.abs(stepDelta) > 1500
    ? `${stepDelta > 0 ? 'Increased' : 'Decreased'} daily activity by ${Math.round(Math.abs(stepDelta))} steps vs baseline. Adjusted TDEE by ${stepModifier} cal/day.`
    : `Daily steps are consistent with your baseline.`;

  // ── 3.2 CARDIO MODIFIER (Relative Delta) ────────────────────────
  const calcCardioBurn = (ws) => {
    const dailyBurn = {};
    ws.forEach(w => {
      const dayKey = new Date(w.date).toLocaleDateString('en-CA');
      if (!dailyBurn[dayKey]) dailyBurn[dayKey] = 0;

      (w.exercises || []).forEach(e => {
        const meta = EXERCISE_METADATA[e.name];
        if (meta?.type === 'cardio' && meta.met) {
          const setsBurn = (e.sets || []).reduce((s, set) => {
            const durationHrs = (set.duration || 0) / 3600;
            // Only use reps-as-minutes heuristic for explicitly time-based cardio
            // (e.g. treadmill, cycling) where duration field is missing but reps makes no sense.
            // Cap at 2h to prevent absurd values from reps like "10 sets of 20 reps".
            const repsAsMinutes = (meta.unit === 'time' || e.name?.toLowerCase().includes('treadmill') ||
              e.name?.toLowerCase().includes('cycling') || e.name?.toLowerCase().includes('running') ||
              e.name?.toLowerCase().includes('rowing') || e.name?.toLowerCase().includes('elliptical'))
              ? Math.min(set.reps || 0, 120) : 0;
            const effectiveHrs = durationHrs || (repsAsMinutes / 60);
            return s + (meta.met * userWeight * effectiveHrs);
          }, 0);
          dailyBurn[dayKey] += setsBurn;
        }
      });
    });
    return dailyBurn;
  };

  const dailyCardioMap = calcCardioBurn(workouts);
  const recentCardioCals = Object.keys(dailyCardioMap)
    .filter(k => (endDate - new Date(k)) / 86400000 <= 7)
    .map(k => dailyCardioMap[k]);

  const olderCardioCals = Object.keys(dailyCardioMap)
    .filter(k => (endDate - new Date(k)) / 86400000 > 7)
    .map(k => dailyCardioMap[k]);

  const avgRecentCardio = recentCardioCals.length > 0
    ? recentCardioCals.reduce((s, c) => s + c, 0) / 7 // Divide by 7 days
    : 0;
  const avgBaselineCardio = olderCardioCals.length > 0
    ? olderCardioCals.reduce((s, c) => s + c, 0) / (daysBack - 7)
    : avgRecentCardio;

  const cardioModifier = Math.round(avgRecentCardio - avgBaselineCardio);
  const cardioLabel = Math.abs(cardioModifier) > 50
    ? `${cardioModifier > 0 ? 'More' : 'Less'} cardio than usual (${Math.abs(cardioModifier)} cal/day difference).`
    : `Cardio levels are stable.`;

  // ── 4. METABOLIC ADAPTATION MODIFIER ───────────────────────────
  // Detect sustained caloric deficit (consecutive weeks below TDEE)
  let adaptationModifier = 0;
  let adaptationLabel = 'No metabolic adaptation detected.';
  let deficitStreak = 0;
  let maxConsecutiveDeficit = 0;

  // Walk through nutrition logs weekly and check if intake < baseTDEE
  const weeklyCalories = {};
  validNutriLogs.forEach(l => {
    const weekKey = Math.floor((endDate - new Date(l.date)) / (7 * 86400000));
    if (!weeklyCalories[weekKey]) weeklyCalories[weekKey] = [];
    weeklyCalories[weekKey].push(l.dailyTotals?.calories || 0);
  });

  // Sort weeks descending (0 is most recent) and check for consecutive deficit
  const sortedWeeks = Object.keys(weeklyCalories).map(Number).sort((a, b) => a - b);
  for (const week of sortedWeeks) {
    const weekLogs = weeklyCalories[week];
    const weekAvg = weekLogs.reduce((s, c) => s + c, 0) / weekLogs.length;
    if (weekAvg < baseTDEE - 150) { // Using 150 as a meaningful deficit threshold
      deficitStreak++;
    } else {
      maxConsecutiveDeficit = Math.max(maxConsecutiveDeficit, deficitStreak);
      deficitStreak = 0;
    }
  }
  deficitStreak = Math.max(maxConsecutiveDeficit, deficitStreak);

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
  const rawDynamicTDEE = baseTDEE + stressModifier + trainingModifier + adaptationModifier + stepModifier + cardioModifier;
  // TASK 3: Clamp dynamic TDEE
  const dynamicTDEE = Math.max(1000, Math.min(6000, rawDynamicTDEE));
  const dynamicTDEELowConfidence = dynamicTDEE < 1200 || dynamicTDEE > 4500;

  // ── 6. DIET PHASE DETECTION ─────────────────────────────────────
  // TASK 6: Use recentAvgIntake for dietPhase comparison (not long-run avg)
  const intakeVsDynamic = recentAvgIntake - dynamicTDEE;
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
    avgDailyIntake: Math.round(longRunAvgIntake),
    recentAvgIntake: Math.round(recentAvgIntake),
    dietPhase,
    lowConfidence: baseTDEELowConfidence || dynamicTDEELowConfidence,
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
        volumeRatio: parseFloat(resVolumeRatio.toFixed(2)),
        label: trainingLabel,
      },
      steps: {
        value: stepModifier,
        avgRecentSteps: Math.round(avgRecentSteps),
        avgBaselineSteps: Math.round(avgBaselineSteps),
        label: stepLabel,
      },
      cardio: {
        value: cardioModifier,
        avgRecentCardio: Math.round(avgRecentCardio),
        label: cardioLabel,
      },
      adaptation: {
        value: adaptationModifier,
        deficitStreakWeeks: deficitStreak,
        label: adaptationLabel,
      },
    },
    insight: `Your real TDEE right now is ~${Math.round(dynamicTDEE)} cal/day. This accounts for your current activity levels, stress load, and training volume.`,
    weightChangeKg: parseFloat(weightChangeKg.toFixed(2)),
    daysAnalyzed: Math.round(daysElapsed),
    insulinSensitivity: user?.biologicalProfile?.insulinSensitivity || 'normal'
  };
}

module.exports = {
  calculateAdaptiveTDEE,
  calculateAdaptiveTDEEForRange,
  calculateSmoothTrend,
  calculateMetabolicMap
};
