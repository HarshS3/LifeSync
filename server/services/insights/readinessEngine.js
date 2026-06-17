const { MentalLog, NutritionLog, StepsLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User_select = 'weight biologicalProfile clinicalTargets dailyCalorieTarget trainingExperience height gender dob';

/**
 * ═══════════════════════════════════════════════════════════════
 * TRAINING INTELLIGENCE ENGINE (v2 - Macro-Aware)
 * ═══════════════════════════════════════════════════════════════
 *
 * Computes a daily Readiness Score (1-10) and surfaces:
 *   1. Readiness Score — push hard / train light / rest
 *   2. Stagnation Alerts — smarter plateau detection
 *   3. Overtraining Risk — accumulated fatigue
 *   4. Fueling Status — how today's macros impact performance
 */
async function calculateReadiness(userId) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const twentyEightDaysAgo = new Date(now);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const [recentMental, workoutsLast28, todayNutrition, user, todaySteps] = await Promise.all([
    MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).lean(),
    Workout.find({ user: userId, date: { $gte: twentyEightDaysAgo } }).sort({ date: 1 }).lean(),
    NutritionLog.findOne({ user: userId, date: { $gte: todayStart } }).lean(),
    require('../../models/User').findById(userId).select(User_select).lean(),
    StepsLog.findOne({ user: userId, date: { $gte: todayStart } }).lean(),
  ]);

  const workoutsLast7 = workoutsLast28.filter(w => new Date(w.date) >= sevenDaysAgo);

  // Calculate days since last rest day
  let daysSinceRestDay = 0;
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toLocaleDateString('en-CA');
    const workedOutThatDay = workoutsLast7.some(w => new Date(w.date).toLocaleDateString('en-CA') === checkDateStr);
    if (!workedOutThatDay) break;
    daysSinceRestDay++;
  }

  // ── Recency-weighted average: entries sorted desc by date (most recent first)
  // Weight decays linearly: most recent = weight N, oldest = weight 1
  const weightedAvg = (logs, field, fallback) => {
    const valid = logs.filter(l => l[field] != null);
    if (valid.length === 0) return fallback;
    const n = valid.length;
    let weightedSum = 0;
    let totalWeight = 0;
    valid.forEach((l, i) => {
      const w = n - i; // most recent gets weight n, oldest gets weight 1
      weightedSum += l[field] * w;
      totalWeight += w;
    });
    return weightedSum / totalWeight;
  };

  // ── 1. SLEEP SCORE (20% weight) ─────────────────────────────
  const avgSleep = weightedAvg(recentMental, 'sleepHours', 7);
  const sleepHoursScore = Math.max(0, Math.min(10,
    avgSleep < 6  ? (avgSleep - 4) * 2.5
    : avgSleep < 8 ? 5 + (avgSleep - 6) * 2.5
    : avgSleep <= 9 ? 10 - (avgSleep - 8) * 2
    : Math.max(0, 8 - (avgSleep - 9) * 3)
  ));
  const avgQuality = weightedAvg(recentMental, 'sleepQuality', 6);
  const sleepScore = (sleepHoursScore * 0.6) + (avgQuality * 0.4);

  // ── 2. RECOVERY METRICS (RHR) (15% weight) ────────────────────
  const recentRhrLogs = recentMental.filter(l => l.restingHeartRate != null);
  let rhrScore = 7;
  let avgRhr = null;
  if (recentRhrLogs.length > 0) {
    avgRhr = weightedAvg(recentMental, 'restingHeartRate', null);
    if (avgRhr != null) rhrScore = Math.max(1, Math.min(10, 10 - (avgRhr - 55) * 0.3));
  }

  // ── 3. ENERGY SCORE (15% weight) ────────────────────────────
  const avgEnergy = weightedAvg(recentMental, 'energyLevel', 7);
  const energyScore = avgEnergy;

  // ── 4. STRESS SCORE (10% weight, inverted) ──────────────────
  const avgStress = weightedAvg(recentMental, 'stressLevel', 4);
  const stressScore = Math.max(1, Math.min(10, 11 - avgStress));

  // ── 5. NUTRITION/FUEL SCORE (20% weight) ───────────────────────
  // Priority for calorie target:
  //   1. clinicalTargets.targets.calories  — most accurate (computed from full profile + adaptive TDEE)
  //   2. dailyCalorieTarget                — stored preference
  //   3. biologicalProfile-derived estimate via PAL formula  — better than bodyweight*32
  //   4. bodyweight * 32 fallback          — last resort only
  const userBodyWeight = user?.biologicalProfile?.weightKg || user?.biologicalProfile?.weight || user?.weight || 75;
  const storedTarget = user?.clinicalTargets?.targets?.calories || user?.dailyCalorieTarget;
  let calsTarget;
  if (storedTarget && storedTarget > 800) {
    calsTarget = storedTarget;
  } else {
    // Derive from profile if possible (avoids systematic overestimate from bodyweight*32)
    const { calculateDailyTargets } = require('../nutritionEngine');
    const profile = user?.biologicalProfile || {};
    const toNum = v => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const ep = {
      ...profile,
      biologicalSex: profile.biologicalSex || user?.gender,
      heightCm: toNum(profile.heightCm) ?? toNum(user?.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user?.weight),
      dob: profile.dob || user?.dob,
    };
    const calc = calculateDailyTargets(ep);
    calsTarget = calc?.targets?.calories || Math.round(userBodyWeight * 32);
  }
  const calsFloor = Math.round(calsTarget * 0.55); // < 55% of *personalized* target = genuinely underfueled
  const trainingToday = workoutsLast7.some(w => new Date(w.date) >= todayStart);
  const trainingPhase = user?.biologicalProfile?.trainingPhase;
  const isDeficitPhase = trainingPhase === "cut" || trainingPhase === "recomp";
  const adjustedCalsTarget = (isDeficitPhase && trainingToday) ? calsTarget + 200 : calsTarget;
  const adjustedCalsFloor = Math.round(adjustedCalsTarget * 0.55);

  let fuelScore = 7;
  let fuelDetail = 'Awaiting today\'s nutrition data.';
  if (todayNutrition) {
    const calories = todayNutrition.dailyTotals?.calories || 0;
    const carbs = todayNutrition.dailyTotals?.carbs || 0;

    if (calories === 0) {
      fuelScore = 7;
      fuelDetail = 'No nutrition logged yet today.';
    } else if (calories < adjustedCalsFloor) {
      fuelScore = 3;
      fuelDetail = `Calorie intake (${calories} kcal) is low for your body weight. Glycogen stores may be depleted.${isDeficitPhase && trainingToday ? ' Training day in a cut/recomp — recovery nutrition is critical.' : ''}`;
    } else if (carbs < 40) {
      fuelScore = 5;
      fuelDetail = 'Very low carb intake. High-intensity or explosive performance may suffer.';
    } else if (calories >= adjustedCalsTarget) {
      fuelScore = 10;
      fuelDetail = (isDeficitPhase && trainingToday) ? 'Well fueled for training day recovery.' : 'Well fueled for a high-intensity session.';
    } else {
      fuelScore = Math.round(5 + 5 * ((calories - adjustedCalsFloor) / (adjustedCalsTarget - adjustedCalsFloor)));
      fuelDetail = 'Moderate fueling detected.';
    }
  }
  const nutritionWeight = 0.2;

  // ── 6. TRAINING LOAD SCORE (20% weight) ───────
  const userWeight = userBodyWeight;

  const calcVolume = (ws) => ws.reduce((total, w) => {
    return total + (w.exercises || []).reduce((ex, e) =>
      ex + (e.sets || []).reduce((s, set) => {
        const effectiveWeight = (set.weight && set.weight > 0) ? set.weight : userWeight;
        return s + effectiveWeight * (set.reps || 0);
      }, 0), 0);
  }, 0);

  const workoutsOlder = workoutsLast28.filter(w => new Date(w.date) < sevenDaysAgo);
  const recentVolume = calcVolume(workoutsLast7);
  const avgWeeklyBaseVolume = workoutsOlder.length > 0 ? calcVolume(workoutsOlder) / 3 : recentVolume;
  const volumeRatio = avgWeeklyBaseVolume > 0 ? recentVolume / avgWeeklyBaseVolume : 1;
  let trainingLoadScore = volumeRatio > 1.4 ? Math.max(1, 10 - (volumeRatio - 1.4) * 8) : 10;
  if (daysSinceRestDay > 3) trainingLoadScore = Math.max(1, trainingLoadScore - (daysSinceRestDay - 3) * 1.5);

  // Steps modifier: NEAT load matters.
  // High steps on a rest day (>= 8k) = active recovery → small positive bump.
  // High steps on a heavy training day (>= 12k) = extra load → small penalty.
  const stepsToday = todaySteps?.stepsCount || 0;
  let stepsDetail = null;
  if (stepsToday >= 8000 && !trainingToday) {
    trainingLoadScore = Math.min(10, trainingLoadScore + 0.5);
    stepsDetail = `${stepsToday.toLocaleString()} steps — active recovery bonus applied.`;
  } else if (stepsToday >= 12000 && trainingToday) {
    trainingLoadScore = Math.max(1, trainingLoadScore - 0.5);
    stepsDetail = `${stepsToday.toLocaleString()} steps on top of a training session — cumulative load elevated.`;
  }

  // ── 7. COMPOSITE READINESS SCORE ────────────────────────────
  const rawScore = (sleepScore * 0.2) + (rhrScore * 0.15) + (energyScore * 0.15) + (stressScore * 0.1) + (fuelScore * 0.2) + (trainingLoadScore * 0.2);
  const readinessScore = Math.round(Math.max(1, Math.min(10, rawScore)) * 10) / 10;

  // ── 8. RECOMMENDATION ───────────────────────────────────────
  let recommendation, status, color;
  if (readinessScore >= 8) {
    status = 'push_hard'; color = '#22c55e';
    recommendation = `You are primed to perform. ${fuelDetail} Push for progressive overload today.`;
  } else if (readinessScore >= 6) {
    status = 'train_normal'; color = '#3b82f6';
    recommendation = `Solid readiness. ${fuelDetail} Train at your standard intensity.`;
  } else if (readinessScore >= 4) {
    status = 'train_light'; color = '#f59e0b';
    recommendation = `Below-average readiness. ${fuelDetail} Consider dropping intensity by 20%.`;
  } else {
    status = 'rest'; color = '#ef4444';
    recommendation = `Low readiness — rest recommended. ${fuelDetail} A hard session risks injury.`;
  }

  // ── 9. STAGNATION DETECTION ─────────────────────────────────
  const stagnationAlerts = detectStagnation(workoutsLast28);

  // ── 10. OVERTRAINING RISK ────────────────────────────────────
  let overtTrainingRisk = 'low';
  let overtTrainingDetail = 'Training load is balanced relative to your recovery.';
  const userExperience = user?.trainingExperience || "intermediate";
  const isBeginnerUser = userExperience === "beginner" || userExperience === "novice";
  const overtHighThreshold = isBeginnerUser ? 1.4 : 1.6;
  const overtModThreshold = isBeginnerUser ? 1.2 : 1.4;
  if (volumeRatio > overtHighThreshold && readinessScore < 6) {
    overtTrainingRisk = 'high';
    overtTrainingDetail = `Training volume is ${Math.round(volumeRatio * 100)}% of baseline, but readiness is low. Take 2-3 rest days.`;
  } else if (volumeRatio > overtModThreshold || readinessScore < 5) {
    overtTrainingRisk = 'moderate';
    overtTrainingDetail = volumeRatio > overtModThreshold ? `Volume spike detected. Prioritize sleep and protein.` : `Recovery indicators are below threshold.`;
  } else if (daysSinceRestDay >= 5) {
    overtTrainingRisk = 'moderate';
    overtTrainingDetail = `You have trained ${daysSinceRestDay} days in a row. Consider a rest day.`;
  }

  return {
    readinessScore, status, color, recommendation,
    components: {
      sleep: { score: Math.round(sleepScore * 10) / 10, avgHours: Math.round(avgSleep * 10) / 10, quality: Math.round(avgQuality * 10) / 10, weight: '20%' },
      rhr: { score: Math.round(rhrScore * 10) / 10, avgRhr: avgRhr ? Math.round(avgRhr) : 'No Data', weight: '15%' },
      energy: { score: Math.round(energyScore * 10) / 10, avgRating: Math.round(avgEnergy * 10) / 10, weight: '15%' },
      stress: { score: Math.round(stressScore * 10) / 10, avgRating: Math.round(avgStress * 10) / 10, weight: '10%' },
      fuel: { score: Math.round(fuelScore * 10) / 10, detail: fuelDetail, weight: '20%' },
      trainingLoad: { score: Math.round(trainingLoadScore * 10) / 10, volumeRatio: Math.round(volumeRatio * 100) / 100, daysSinceRestDay, stepsToday, stepsDetail, weight: '20%' },
    },
    stagnationAlerts,
    overtraining: { risk: overtTrainingRisk, detail: overtTrainingDetail },
  };
}

/**
 * Detects stagnation with better logic:
 * - Checks for both weight and volume plateaus.
 * - Suggests specific "interventions" based on the type of stagnation.
 */
function detectStagnation(workouts) {
  const exerciseHistory = {};
  const alerts = [];

  workouts.forEach(w => {
    const date = new Date(w.date);
    (w.exercises || []).forEach(ex => {
      if (!ex.name) return;
      const name = ex.name;
      if (!exerciseHistory[name]) exerciseHistory[name] = [];
      const maxWeight = Math.max(...(ex.sets || []).map(s => s.weight || 0));
      const totalVolume = (ex.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
      // Capture RPE: average of completed sets with RPE logged
      const rpeSets = (ex.sets || []).filter(s => s.rpe != null && s.rpe > 0);
      const avgRpe = rpeSets.length ? rpeSets.reduce((s, set) => s + set.rpe, 0) / rpeSets.length : null;
      exerciseHistory[name].push({ date, maxWeight, totalVolume, avgRpe });
    });
  });

  Object.entries(exerciseHistory).forEach(([name, sessions]) => {
    if (sessions.length < 4) return;
    sessions.sort((a, b) => a.date - b.date);

    const recent = sessions.slice(-3);
    const older = sessions.slice(0, -3);

    const recentMaxWeight = Math.max(...recent.map(s => s.maxWeight));
    const olderMaxWeight = Math.max(...older.map(s => s.maxWeight));
    const recentMaxVolume = Math.max(...recent.map(s => s.totalVolume));
    const olderMaxVolume = Math.max(...older.map(s => s.totalVolume));

    // Weight+volume plateau
    if (olderMaxWeight > 0 && recentMaxWeight <= olderMaxWeight && recentMaxVolume <= olderMaxVolume) {
      const recentRpeVals = recent.filter(s => s.avgRpe).map(s => s.avgRpe);
      const olderRpeVals = older.filter(s => s.avgRpe).map(s => s.avgRpe);
      const recentAvgRpe = recentRpeVals.length ? recentRpeVals.reduce((a,b) => a+b, 0) / recentRpeVals.length : null;
      const olderAvgRpe = olderRpeVals.length ? olderRpeVals.reduce((a,b) => a+b, 0) / olderRpeVals.length : null;
      const hasRpeData = recentRpeVals.length >= 2;

      let cause, suggestion;
      if (hasRpeData && recentAvgRpe !== null && olderAvgRpe !== null && recentAvgRpe > olderAvgRpe + 1.0) {
        cause = "overreaching";
        suggestion = "RPE on " + name + " has risen to " + recentAvgRpe.toFixed(1) + " at the same weights. Reduce volume 30% for one week before attempting to progress.";
      } else {
        cause = "adaptation_lock";
        suggestion = "Adaptation lock on " + name + ". Try adding 1 rep per set for 2 sessions, then add 2.5kg. Or swap to a close variation (paused reps, tempo change) to re-sensitise.";
      }
      alerts.push({ exercise: name, currentBest: recentMaxWeight, sessionsStagnated: recent.length, cause, type: cause === "overreaching" ? "rpe_creep" : "plateau", suggestion });
      return; // one alert per exercise
    }

    // RPE creep: weight is stable or rising but RPE is trending up — early overreaching signal,
    // distinct from a plateau (you're still lifting the same weight, it's just costing more).
    const recentRpes = recent.map(s => s.avgRpe).filter(r => r != null);
    const olderRpes = older.map(s => s.avgRpe).filter(r => r != null);
    if (recentRpes.length >= 2 && olderRpes.length >= 1) {
      const avgRecentRpe = recentRpes.reduce((a, b) => a + b, 0) / recentRpes.length;
      const avgOlderRpe = olderRpes.reduce((a, b) => a + b, 0) / olderRpes.length;
      if (avgRecentRpe >= avgOlderRpe + 1.5 && recentMaxWeight >= olderMaxWeight * 0.95) {
        alerts.push({
          exercise: name,
          type: 'rpe_creep',
          avgRecentRpe: Math.round(avgRecentRpe * 10) / 10,
          avgOlderRpe: Math.round(avgOlderRpe * 10) / 10,
          suggestion: `RPE on ${name} has risen from avg ${Math.round(avgOlderRpe * 10) / 10} to ${Math.round(avgRecentRpe * 10) / 10} at similar weights — early overreaching signal. Consider a deload set or reduced volume this session.`,
        });
      }
    }
  });

  return alerts;
}

module.exports = { calculateReadiness };

