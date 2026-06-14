/**
 * Diagnostic Engine — "Why do I feel like this?"
 *
 * Produces a ranked list of root causes when the user is underperforming.
 * Each cause has: a title, a mechanism (the WHY in plain language),
 * a confidence score, and a same-day protocol.
 *
 * Data sources: last 7 days of nutrition, sleep, training load, stress.
 * Only runs when there is something to diagnose (readiness < 7 or
 * recovery debt > 4). Returns empty causes otherwise.
 */

const { NutritionLog, MentalLog, WeightLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');
const { calculateDailyTargets } = require('../nutritionEngine');
const { calculateAdaptiveTDEE } = require('../nutritionPipeline/adaptiveTdeeEngine');
const { EXERCISE_METADATA } = require('../../constants/exerciseMetadata');

function dayKey(d) {
  return new Date(d).toLocaleDateString('en-CA');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function workoutVolume(workout) {
  let vol = 0, sets = 0;
  (workout.exercises || []).forEach(e => {
    (e.sets || []).forEach(s => {
      sets++;
      if (s.weight && s.reps) vol += s.weight * s.reps;
    });
  });
  return { vol, sets };
}

async function computeDiagnostic(userId) {
  const since7 = daysAgo(7);
  const since3 = daysAgo(3);
  const todayStart = daysAgo(0);

  const [user, nutLogs, mentalLogs, workouts, weights] = await Promise.all([
    User.findById(userId).select('biologicalProfile weight height gender dob clinicalTargets').lean(),
    NutritionLog.find({ user: userId, date: { $gte: since7 } }).select('date dailyTotals').lean(),
    MentalLog.find({ user: userId, date: { $gte: since7 } }).select('date sleepHours sleepQuality stressLevel energyLevel moodScore').lean(),
    Workout.find({ user: userId, date: { $gte: since7 } }).select('date exercises updatedAt').lean(),
    WeightLog.find({ user: userId, date: { $gte: since7 } }).select('date weightKg').lean(),
  ]);

  // ── Resolve targets ────────────────────────────────────────────────────────
  let calTarget = user?.clinicalTargets?.targets?.calories;
  let proteinTarget = user?.clinicalTargets?.targets?.protein;
  if (!calTarget) {
    const toNum = v => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const profile = user?.biologicalProfile || {};
    const ep = {
      ...profile,
      biologicalSex: profile.biologicalSex || user?.gender,
      heightCm: toNum(profile.heightCm) ?? toNum(user?.height),
      weightKg: toNum(profile.weightKg) ?? toNum(user?.weight),
      dob: profile.dob || user?.dob,
    };
    const calc = calculateDailyTargets(ep);
    calTarget = calc?.targets?.calories || 2000;
    proteinTarget = calc?.targets?.protein || 120;
  }

  // ── Sleep analysis ─────────────────────────────────────────────────────────
  const recentMental = mentalLogs.filter(m => new Date(m.date) >= since3);
  const avgSleep = recentMental.filter(m => m.sleepHours != null).length > 0
    ? recentMental.filter(m => m.sleepHours != null).reduce((s, m) => s + m.sleepHours, 0)
      / recentMental.filter(m => m.sleepHours != null).length
    : null;
  const avgStress = recentMental.filter(m => m.stressLevel != null).length > 0
    ? recentMental.filter(m => m.stressLevel != null).reduce((s, m) => s + m.stressLevel, 0)
      / recentMental.filter(m => m.stressLevel != null).length
    : null;

  // ── Nutrition deficit analysis ─────────────────────────────────────────────
  const validNutLogs = nutLogs.filter(l => (l.dailyTotals?.calories || 0) > 500);
  const recent3NutLogs = nutLogs.filter(l => new Date(l.date) >= since3 && (l.dailyTotals?.calories || 0) > 500);
  const avgCalRecent = recent3NutLogs.length > 0
    ? recent3NutLogs.reduce((s, l) => s + (l.dailyTotals.calories || 0), 0) / recent3NutLogs.length
    : null;
  const avgProteinRecent = recent3NutLogs.length > 0
    ? recent3NutLogs.reduce((s, l) => s + (l.dailyTotals.protein || 0), 0) / recent3NutLogs.length
    : null;

  const daysUnderCalTarget = recent3NutLogs.filter(l => (l.dailyTotals?.calories || 0) < calTarget * 0.85).length;
  const daysUnderProtein = recent3NutLogs.filter(l => (l.dailyTotals?.protein || 0) < proteinTarget * 0.75).length;

  // ── Training load analysis ─────────────────────────────────────────────────
  const recentWorkouts = workouts.filter(w => new Date(w.date) >= since3);
  const olderWorkouts = workouts.filter(w => new Date(w.date) < since3);

  const recentVol = recentWorkouts.reduce((s, w) => s + workoutVolume(w).vol, 0);
  const olderAvgVol = olderWorkouts.length > 0
    ? olderWorkouts.reduce((s, w) => s + workoutVolume(w).vol, 0) / Math.max(1, olderWorkouts.length)
    : 0;
  const volumeSpike = olderAvgVol > 0 ? recentVol / olderAvgVol : 0;

  const consecutiveTrainingDays = (() => {
    let streak = 0;
    const wDays = new Set(workouts.map(w => dayKey(w.date)));
    for (let i = 0; i < 7; i++) {
      if (wDays.has(dayKey(daysAgo(i)))) streak++;
      else break;
    }
    return streak;
  })();

  // Last recovery day
  const daysSinceRest = (() => {
    const wDays = new Set(workouts.map(w => dayKey(w.date)));
    for (let i = 0; i < 7; i++) {
      if (!wDays.has(dayKey(daysAgo(i)))) return i;
    }
    return 7;
  })();

  // ── Build causes ──────────────────────────────────────────────────────────
  const causes = [];

  // 1. Sustained caloric deficit
  if (daysUnderCalTarget >= 2 && avgCalRecent != null) {
    const deficitAmount = Math.round(calTarget - avgCalRecent);
    const severity = deficitAmount > 600 ? 'high' : deficitAmount > 300 ? 'moderate' : 'low';
    causes.push({
      id: 'caloric_deficit',
      title: `${daysUnderCalTarget} of last 3 days under-fueled`,
      mechanism: `You averaged ${Math.round(avgCalRecent)} kcal — ${deficitAmount} below target. Sustained deficit elevates cortisol, suppresses thyroid hormone (T3), and reduces muscle glycogen. The result is fatigue, reduced motivation, and weaker training performance.`,
      confidence: severity === 'high' ? 0.85 : severity === 'moderate' ? 0.70 : 0.50,
      severity,
      protocol: `Eat at maintenance today (${calTarget} kcal). Don't try to compensate with a bigger deficit — it compounds the problem. Prioritise carbs at breakfast to reload glycogen.`,
      data: { avgCalRecent: Math.round(avgCalRecent), calTarget, deficitAmount, daysUnderCalTarget },
    });
  }

  // 2. Sleep debt
  if (avgSleep != null && avgSleep < 6.5) {
    const debt = Math.round((7.5 - avgSleep) * 60);
    causes.push({
      id: 'sleep_debt',
      title: `Averaging ${avgSleep.toFixed(1)}h sleep (last 3 days)`,
      mechanism: `You're ${debt} minutes short of the recovery minimum per night. Sleep deprivation reduces growth hormone secretion (peaks during deep sleep), elevates morning cortisol, impairs insulin sensitivity, and degrades reaction time and mood — all within 2 consecutive short nights.`,
      confidence: 0.90,
      severity: avgSleep < 5.5 ? 'high' : 'moderate',
      protocol: `Sleep debt doesn't fully resolve in one night — but it improves. Aim for 8h tonight. Avoid caffeine after 2pm. Magnesium glycinate (200-400mg) 30 min before bed reduces sleep latency and improves deep sleep quality.`,
      data: { avgSleep: parseFloat(avgSleep.toFixed(1)), debtMinutes: debt },
    });
  }

  // 3. Training overreach
  if (consecutiveTrainingDays >= 4 || daysSinceRest >= 5) {
    causes.push({
      id: 'overreach',
      title: `${daysSinceRest} days without a rest day`,
      mechanism: `Muscle repair requires 48–72h per muscle group. Without rest days, residual micro-damage accumulates — interleukin-6 (IL-6) and TNF-alpha remain elevated, creating systemic fatigue and reduced force production. This is not weakness — it's biology.`,
      confidence: 0.75,
      severity: daysSinceRest >= 6 ? 'high' : 'moderate',
      protocol: `Take a full rest day today or do light active recovery (20-min walk). Protein + sleep are the repair inputs — make sure both are covered. Training again with accumulated damage produces diminishing returns and injury risk.`,
      data: { consecutiveTrainingDays, daysSinceRest },
    });
  }

  // 4. Training spike (sudden volume increase)
  if (volumeSpike > 1.5 && recentVol > 0) {
    causes.push({
      id: 'volume_spike',
      title: `Training volume spiked ${Math.round(volumeSpike * 100 - 100)}% vs your baseline`,
      mechanism: `Sudden volume increases (>10% week-over-week) overwhelm your recovery capacity. DOMS (delayed onset muscle soreness) peaks 24-48h post-session. Your nervous system needs more recovery time after high-volume weeks than your motivation suggests.`,
      confidence: 0.65,
      severity: volumeSpike > 2.0 ? 'high' : 'moderate',
      protocol: `Reduce volume by 30-40% in next session — don't skip, but don't add load. Protein synthesis is already running. You're recovering. Eating enough and sleeping are the levers now, not more training.`,
      data: { volumeSpike: parseFloat(volumeSpike.toFixed(2)) },
    });
  }

  // 5. High stress
  if (avgStress != null && avgStress >= 7) {
    causes.push({
      id: 'high_stress',
      title: `High stress (avg ${avgStress.toFixed(1)}/10, last 3 days)`,
      mechanism: `Chronic psychological stress elevates cortisol, which directly breaks down muscle protein (gluconeogenesis), suppresses immune function, disrupts sleep architecture, and promotes fat storage around the abdomen. Stress and training compete for the same recovery resources.`,
      confidence: 0.70,
      severity: avgStress >= 8.5 ? 'high' : 'moderate',
      protocol: `On high-stress days, reduce training intensity by 20-30% — hard training with high cortisol is catabolic. Sleep matters more right now than any single workout. Eat at maintenance, not a deficit.`,
      data: { avgStress: parseFloat(avgStress.toFixed(1)) },
    });
  }

  // 6. Protein insufficiency
  if (daysUnderProtein >= 2 && avgProteinRecent != null && proteinTarget) {
    const gap = Math.round(proteinTarget - avgProteinRecent);
    if (!causes.find(c => c.id === 'caloric_deficit')) { // don't double-report with deficit
      causes.push({
        id: 'protein_low',
        title: `Protein averaging ${Math.round(avgProteinRecent)}g — ${gap}g below target`,
        mechanism: `Inadequate protein (< ~1.6g/kg bodyweight for active adults) limits muscle protein synthesis. Without sufficient leucine signalling, the body cannot repair training-induced damage efficiently, leading to persistent soreness and slower recovery between sessions.`,
        confidence: 0.65,
        severity: gap > 40 ? 'moderate' : 'low',
        protocol: `Add one protein-dense food to each of today's meals. Breakfast is the most-missed. A 40g protein breakfast (eggs + yogurt, or 200g paneer) meaningfully shifts the day's total.`,
        data: { avgProteinRecent: Math.round(avgProteinRecent), proteinTarget, gap },
      });
    }
  }

  // Sort by confidence × severity
  const sevWeight = { high: 1.0, moderate: 0.6, low: 0.3 };
  causes.sort((a, b) => (b.confidence * sevWeight[b.severity]) - (a.confidence * sevWeight[a.severity]));

  const topCauses = causes.slice(0, 3);

  // ── Compound protocol (most important actions) ────────────────────────────
  const compoundProtocol = [];
  if (causes.find(c => c.id === 'sleep_debt')) compoundProtocol.push('Sleep 8h tonight — this is non-negotiable above everything else.');
  if (causes.find(c => c.id === 'caloric_deficit')) compoundProtocol.push(`Eat ${calTarget} kcal today — no further deficit.`);
  if (causes.find(c => c.id === 'overreach' || c.id === 'volume_spike')) compoundProtocol.push('Rest today or light walk only.');
  if (causes.find(c => c.id === 'protein_low')) compoundProtocol.push(`Hit ${proteinTarget}g protein today — start with a 40g breakfast.`);
  if (causes.find(c => c.id === 'high_stress')) compoundProtocol.push('Reduce training intensity today. Cortisol + hard training = net negative.');

  return {
    hasDiagnosis: topCauses.length > 0,
    topCauses,
    compoundProtocol: compoundProtocol.slice(0, 3),
    context: {
      avgSleep: avgSleep != null ? parseFloat(avgSleep.toFixed(1)) : null,
      avgStress: avgStress != null ? parseFloat(avgStress.toFixed(1)) : null,
      avgCalRecent: avgCalRecent != null ? Math.round(avgCalRecent) : null,
      daysUnderCalTarget,
      daysSinceRest,
      dataQuality: validNutLogs.length >= 3 && mentalLogs.length >= 2 ? 'good' : 'partial',
    },
  };
}

module.exports = { computeDiagnostic };
