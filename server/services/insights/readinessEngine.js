const { MentalLog, NutritionLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');

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

  const [recentMental, workoutsLast28, todayNutrition] = await Promise.all([
    MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).lean(),
    Workout.find({ user: userId, date: { $gte: twentyEightDaysAgo } }).sort({ date: 1 }).lean(),
    NutritionLog.findOne({ user: userId, date: { $gte: todayStart } }).lean(),
  ]);

  const workoutsLast7 = workoutsLast28.filter(w => new Date(w.date) >= sevenDaysAgo);

  // Calculate days since last rest day
  let daysSinceRestDay = 0;
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0];
    const workedOutThatDay = workoutsLast7.some(w => new Date(w.date).toISOString().split('T')[0] === checkDateStr);
    if (!workedOutThatDay) break;
    daysSinceRestDay++;
  }

  // ── 1. SLEEP SCORE (20% weight) ─────────────────────────────
  const recentSleepLogs = recentMental.filter(l => l.sleepHours != null);
  const avgSleep = recentSleepLogs.length > 0
    ? recentSleepLogs.reduce((s, l) => s + l.sleepHours, 0) / recentSleepLogs.length
    : 7;
  const sleepHoursScore = Math.max(0, Math.min(10,
    avgSleep < 6  ? (avgSleep - 4) * 2.5
    : avgSleep < 8 ? 5 + (avgSleep - 6) * 2.5
    : avgSleep <= 9 ? 10 - (avgSleep - 8) * 2
    : Math.max(0, 8 - (avgSleep - 9) * 3)
  ));
  const recentQualityLogs = recentMental.filter(l => l.sleepQuality != null);
  const avgQuality = recentQualityLogs.length > 0 ? recentQualityLogs.reduce((s, l) => s + l.sleepQuality, 0) / recentQualityLogs.length : 6;
  const sleepScore = (sleepHoursScore * 0.6) + (avgQuality * 0.4);

  // ── 2. RECOVERY METRICS (RHR) (15% weight) ────────────────────
  const recentRhrLogs = recentMental.filter(l => l.restingHeartRate != null);
  let rhrScore = 7;
  let avgRhr = null;
  if (recentRhrLogs.length > 0) {
    avgRhr = recentRhrLogs.reduce((s, l) => s + l.restingHeartRate, 0) / recentRhrLogs.length;
    rhrScore = Math.max(1, Math.min(10, 10 - (avgRhr - 55) * 0.3));
  }

  // ── 3. ENERGY SCORE (15% weight) ────────────────────────────
  const recentEnergyLogs = recentMental.filter(l => l.energyLevel != null);
  const avgEnergy = recentEnergyLogs.length > 0 ? recentEnergyLogs.reduce((s, l) => s + l.energyLevel, 0) / recentEnergyLogs.length : 7;
  const energyScore = avgEnergy;

  // ── 4. STRESS SCORE (10% weight, inverted) ──────────────────
  const recentStressLogs = recentMental.filter(l => l.stressLevel != null);
  const avgStress = recentStressLogs.length > 0 ? recentStressLogs.reduce((s, l) => s + l.stressLevel, 0) / recentStressLogs.length : 4;
  const stressScore = Math.max(1, Math.min(10, 11 - avgStress));

  // ── 5. NUTRITION/FUEL SCORE (20% weight) ───────────────────────
  // New: Adjust readiness based on today's fuel intake
  let fuelScore = 7; // Neutral start
  let fuelDetail = 'Awaiting today\'s nutrition data.';
  if (todayNutrition) {
    const calories = todayNutrition.dailyTotals?.calories || 0;
    const carbs = todayNutrition.dailyTotals?.carbs || 0;
    const protein = todayNutrition.dailyTotals?.protein || 0;

    // Check if user has eaten enough for their baseline
    // Simple heuristic: if it's afternoon and they haven't eaten much, fuel is low
    const hour = now.getHours();
    if (hour > 12 && calories < 800) {
      fuelScore = 3;
      fuelDetail = 'Glycogen stores may be low. Energy output could be compromised.';
    } else if (carbs < 50 && hour > 10) {
      fuelScore = 5;
      fuelDetail = 'Low carb intake detected. High-intensity performance may suffer.';
    } else if (calories > 1500) {
      fuelScore = 10;
      fuelDetail = 'Well fueled for a high-intensity session.';
    } else {
      fuelScore = 8;
      fuelDetail = 'Moderate fueling detected.';
    }
  }
  const nutritionWeight = 0.2;

  // ── 6. TRAINING LOAD SCORE (20% weight) ───────
  const [user] = await Promise.all([
    require('../../models/User').findById(userId).select('weight biologicalProfile').lean()
  ]);
  const userWeight = user?.biologicalProfile?.weight || user?.weight || 75;

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
  if (volumeRatio > 1.6 && readinessScore < 6) {
    overtTrainingRisk = 'high';
    overtTrainingDetail = `Training volume is ${Math.round(volumeRatio * 100)}% of baseline, but readiness is low. Take 2-3 rest days.`;
  } else if (volumeRatio > 1.4 || readinessScore < 5) {
    overtTrainingRisk = 'moderate';
    overtTrainingDetail = volumeRatio > 1.4 ? `Volume spike detected. Prioritize sleep and protein.` : `Recovery indicators are below threshold.`;
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
      trainingLoad: { score: Math.round(trainingLoadScore * 10) / 10, volumeRatio: Math.round(volumeRatio * 100) / 100, daysSinceRestDay, weight: '20%' },
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
      exerciseHistory[name].push({ date, maxWeight, totalVolume });
    });
  });

  const cutoff14d = new Date();
  cutoff14d.setDate(cutoff14d.getDate() - 14);

  Object.entries(exerciseHistory).forEach(([name, sessions]) => {
    if (sessions.length < 4) return;
    sessions.sort((a, b) => a.date - b.date);

    const recent = sessions.slice(-3);
    const older = sessions.slice(0, -3);

    const recentMaxWeight = Math.max(...recent.map(s => s.maxWeight));
    const olderMaxWeight = Math.max(...older.map(s => s.maxWeight));
    const recentMaxVolume = Math.max(...recent.map(s => s.totalVolume));
    const olderMaxVolume = Math.max(...older.map(s => s.totalVolume));

    // Stagnation if recent best <= older best over last 3 sessions
    if (olderMaxWeight > 0 && recentMaxWeight <= olderMaxWeight && recentMaxVolume <= olderMaxVolume) {
      alerts.push({
        exercise: name,
        currentBest: recentMaxWeight,
        sessionsStagnated: recent.length,
        suggestion: `Plateau detected. Try 'Micro-loading' (add 1kg) or changing the rep range (e.g. from 5 to 8 reps) to break the adaptation lock for ${name}.`
      });
    }
  });

  return alerts;
}

module.exports = { calculateReadiness };

