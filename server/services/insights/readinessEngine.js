const { MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');

/**
 * ═══════════════════════════════════════════════════════════════
 * TRAINING INTELLIGENCE ENGINE
 * ═══════════════════════════════════════════════════════════════
 *
 * Computes a daily Readiness Score (1-10) and surfaces:
 *   1. Readiness Score — push hard / train light / rest
 *   2. Stagnation Alerts — no progressive overload in 3 weeks
 *   3. Overtraining Risk — accumulated fatigue vs recovery deficit
 *
 * Score breakdown (each component out of 10, weighted avg):
 *   - Sleep quality (40%)  — from MentalLog.sleepHours
 *   - Subjective energy (30%) — from MentalLog.energyLevel
 *   - Stress inverse (20%)    — from MentalLog.stressLevel (inverted)
 *   - Training load (10%)     — recent volume vs 4-week avg (penalty only)
 */
async function calculateReadiness(userId) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const twentyEightDaysAgo = new Date(now);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const [recentMental, workoutsLast28] = await Promise.all([
    MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).lean(),
    Workout.find({ user: userId, date: { $gte: twentyEightDaysAgo } }).sort({ date: 1 }).lean(),
  ]);

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

  // ── 1. SLEEP SCORE (25% weight) ─────────────────────────────
  // Optimal = 8h. Score scales 0-10 from sleep hours.
  const recentSleepLogs = recentMental.filter(l => l.sleepHours != null);
  const avgSleep = recentSleepLogs.length > 0
    ? recentSleepLogs.reduce((s, l) => s + l.sleepHours, 0) / recentSleepLogs.length
    : 7; // fallback
  // 4h → 0, 6h → 5, 8h → 10, 9h → 9 (too much sleep is also suboptimal)
  const sleepHoursScore = Math.max(0, Math.min(10,
    avgSleep < 6  ? (avgSleep - 4) * 2.5
    : avgSleep < 8 ? 5 + (avgSleep - 6) * 2.5
    : avgSleep <= 9 ? 10 - (avgSleep - 8) * 2
    : Math.max(0, 8 - (avgSleep - 9) * 3)
  ));

  const recentQualityLogs = recentMental.filter(l => l.sleepQuality != null);
  const avgQuality = recentQualityLogs.length > 0
    ? recentQualityLogs.reduce((s, l) => s + l.sleepQuality, 0) / recentQualityLogs.length
    : 6; // fallback

  const sleepScore = (sleepHoursScore * 0.6) + (avgQuality * 0.4);

  // ── 2. RECOVERY METRICS (RHR) (20% weight) ────────────────────
  const recentRhrLogs = recentMental.filter(l => l.restingHeartRate != null);
  let rhrScore = 10; // Default if no data
  let avgRhr = null;
  if (recentRhrLogs.length > 0) {
    avgRhr = recentRhrLogs.reduce((s, l) => s + l.restingHeartRate, 0) / recentRhrLogs.length;
    // Lower RHR is better for recovery. Assume baseline ~60 for a healthy active person.
    // Scales: < 55 → 10, 65 → 7, 75 → 4, > 85 → 1
    rhrScore = Math.max(1, Math.min(10, 10 - (avgRhr - 55) * 0.3));
  }

  // ── 3. ENERGY SCORE (20% weight) ────────────────────────────
  const recentEnergyLogs = recentMental.filter(l => l.energyLevel != null);
  const avgEnergy = recentEnergyLogs.length > 0
    ? recentEnergyLogs.reduce((s, l) => s + l.energyLevel, 0) / recentEnergyLogs.length
    : 5;
  const energyScore = avgEnergy; // already 1-10

  // ── 4. STRESS SCORE (15% weight, inverted) ──────────────────
  const recentStressLogs = recentMental.filter(l => l.stressLevel != null);
  const avgStress = recentStressLogs.length > 0
    ? recentStressLogs.reduce((s, l) => s + l.stressLevel, 0) / recentStressLogs.length
    : 5;
  const stressScore = 11 - avgStress; // 1 stress → 10 score, 10 stress → 1 score

  // ── 5. TRAINING LOAD SCORE (20% weight) ───────
  const calcVolume = (ws) => ws.reduce((total, w) => {
    return total + (w.exercises || []).reduce((ex, e) =>
      ex + (e.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);
  }, 0);

  const workoutsLast7 = workoutsLast28.filter(w => new Date(w.date) >= sevenDaysAgo);
  const workoutsOlder = workoutsLast28.filter(w => new Date(w.date) < sevenDaysAgo);

  const recentVolume = calcVolume(workoutsLast7);
  const avgWeeklyBaseVolume = workoutsOlder.length > 0
    ? calcVolume(workoutsOlder) / 3 // 3 older weeks
    : recentVolume;

  const volumeRatio = avgWeeklyBaseVolume > 0 ? recentVolume / avgWeeklyBaseVolume : 1;
  // Penalty: if this week volume is >1.4x normal, deduct from score
  let trainingLoadScore = volumeRatio > 1.4
    ? Math.max(1, 10 - (volumeRatio - 1.4) * 8)
    : 10;

  // Additional penalty for days without rest
  if (daysSinceRestDay > 3) {
    trainingLoadScore = Math.max(1, trainingLoadScore - (daysSinceRestDay - 3) * 1.5);
  }

  // ── 6. COMPOSITE READINESS SCORE ────────────────────────────
  const rawScore = (sleepScore * 0.25) + (rhrScore * 0.2) + (energyScore * 0.2) + (stressScore * 0.15) + (trainingLoadScore * 0.2);
  const readinessScore = Math.round(Math.max(1, Math.min(10, rawScore)) * 10) / 10;

  // ── 7. RECOMMENDATION ───────────────────────────────────────
  let recommendation, status, color;
  if (readinessScore >= 8) {
    status = 'push_hard';
    color = '#22c55e';
    recommendation = 'You are primed to perform. Push for progressive overload today — attempt new weights or higher reps on your key lifts.';
  } else if (readinessScore >= 6) {
    status = 'train_normal';
    color = '#3b82f6';
    recommendation = 'Solid readiness. Train at your standard intensity. Hit your planned sets without pushing limits today.';
  } else if (readinessScore >= 4) {
    status = 'train_light';
    color = '#f59e0b';
    recommendation = 'Below-average readiness. Train light — drop weight by 15-20%, focus on technique and blood flow. Skip heavy compound lifts.';
  } else {
    status = 'rest';
    color = '#ef4444';
    recommendation = 'Low readiness — active recovery or rest day recommended. A hard session now risks injury and deepens the deficit. Walk, stretch, sleep.';
  }

  // ── 8. STAGNATION DETECTION ─────────────────────────────────
  const stagnationAlerts = detectStagnation(workoutsLast28);

  // ── 9. OVERTRAINING RISK ────────────────────────────────────
  let overtTrainingRisk = 'low';
  let overtTrainingDetail = 'Training load is balanced relative to your recovery.';

  if (volumeRatio > 1.6 && readinessScore < 6) {
    overtTrainingRisk = 'high';
    overtTrainingDetail = `Training volume this week is ${Math.round(volumeRatio * 100)}% of your baseline, but your readiness is only ${readinessScore}/10. Classic overtraining pattern — take 2-3 rest days.`;
  } else if (volumeRatio > 1.4 || readinessScore < 5) {
    overtTrainingRisk = 'moderate';
    overtTrainingDetail = volumeRatio > 1.4
      ? `Volume spike detected (${Math.round(volumeRatio * 100)}% of baseline). Ensure you are sleeping 7.5h+ and hitting protein targets this week.`
      : `Recovery indicators are below threshold. Prioritize sleep and reduce stress before your next training day.`;
  } else if (daysSinceRestDay >= 5) {
    overtTrainingRisk = 'moderate';
    overtTrainingDetail = `You have trained ${daysSinceRestDay} days in a row without a rest day. Consider taking a recovery day soon to prevent central nervous system fatigue.`;
  }

  return {
    readinessScore,
    status,
    color,
    recommendation,
    components: {
      sleep: { score: Math.round(sleepScore * 10) / 10, avgHours: Math.round(avgSleep * 10) / 10, quality: Math.round(avgQuality * 10) / 10, weight: '25%' },
      rhr: { score: Math.round(rhrScore * 10) / 10, avgRhr: avgRhr ? Math.round(avgRhr) : 'No Data', weight: '20%' },
      energy: { score: Math.round(energyScore * 10) / 10, avgRating: Math.round(avgEnergy * 10) / 10, weight: '20%' },
      stress: { score: Math.round(stressScore * 10) / 10, avgRating: Math.round(avgStress * 10) / 10, weight: '15%' },
      trainingLoad: { score: Math.round(trainingLoadScore * 10) / 10, volumeRatio: Math.round(volumeRatio * 100) / 100, daysSinceRestDay, weight: '20%' },
    },
    stagnationAlerts,
    overtraining: { risk: overtTrainingRisk, detail: overtTrainingDetail },
    dataQuality: {
      sleepLogs: recentSleepLogs.length,
      qualityLogs: recentQualityLogs.length,
      rhrLogs: recentRhrLogs.length,
      energyLogs: recentEnergyLogs.length,
      stressLogs: recentStressLogs.length,
      workouts: workoutsLast7.length,
    }
  };
}

/**
 * Detects exercises with no progressive overload in the last 21 days.
 * Progressive overload = any workout where max weight OR volume > previous best.
 */
function detectStagnation(workouts) {
  const exerciseHistory = {}; // exerciseName → [{ date, maxWeight, totalVolume }]
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

  const cutoff21d = new Date();
  cutoff21d.setDate(cutoff21d.getDate() - 21);

  Object.entries(exerciseHistory).forEach(([name, sessions]) => {
    if (sessions.length < 3) return; // Need at least 3 sessions to detect stagnation

    // Sort chronologically
    sessions.sort((a, b) => a.date - b.date);

    const recent = sessions.filter(s => s.date >= cutoff21d);
    const older = sessions.filter(s => s.date < cutoff21d);

    if (recent.length < 2) return; // Not enough recent data

    const recentMaxWeight = Math.max(...recent.map(s => s.maxWeight));
    const olderMaxWeight = older.length > 0 ? Math.max(...older.map(s => s.maxWeight)) : 0;

    const recentMaxVolume = Math.max(...recent.map(s => s.totalVolume));
    const olderMaxVolume = older.length > 0 ? Math.max(...older.map(s => s.totalVolume)) : 0;

    const weightStagnated = olderMaxWeight > 0 && recentMaxWeight <= olderMaxWeight;
    const volumeStagnated = olderMaxVolume > 0 && recentMaxVolume <= olderMaxVolume;

    if (weightStagnated && volumeStagnated && recent.length >= 2) {
      alerts.push({
        exercise: name,
        currentBest: recentMaxWeight,
        previousBest: olderMaxWeight,
        sessionsStagnated: recent.length,
        suggestion: `Try adding 2.5kg or 1-2 extra reps. If you cannot progress, consider a deload week or technique review for ${name}.`
      });
    }
  });

  return alerts;
}

module.exports = { calculateReadiness };
