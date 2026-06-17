/**
 * Daily Intelligence Engine
 *
 * Computes the 3-component Day Profile every time a user opens the nutrition page:
 *   1. Yesterday's Debt   — what happened that your body is still processing
 *   2. Today's Plan       — what's scheduled that you need to fuel for
 *   3. Current State      — where you are right now in the day
 *
 * Returns:
 *   - mode: 'fueling' | 'recovering' | 'cutting' | 'maintaining' | 'bulking'
 *   - dynamicTarget: { calories, protein, carbs, fat } adjusted for today
 *   - targetDelta: difference vs static target with reason
 *   - actions: time-sensitive actions for right now (max 2)
 *   - insight: top cross-domain insight for today
 *   - recoveryDebt: compound debt score if sleep + underfuel + hard session stacked
 *   - dietPhase: from metabolic map
 */

const Workout = require('../../models/Workout');
const { NutritionLog, MentalLog } = require('../../models/Logs');
const User = require('../../models/User');
const { EXERCISE_METADATA } = require('../../constants/exerciseMetadata');
const { calculateAdaptiveTDEE, calculateMetabolicMap } = require('./adaptiveTdeeEngine');
const { calculateDailyTargets } = require('../nutritionEngine');
const { selectTopInsights } = require('../insightSelector/crossDomainInsightSelector');

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesNow() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function dayKey(d) {
  return new Date(d).toLocaleDateString('en-CA');
}

function isToday(d) {
  return dayKey(d) === dayKey(new Date());
}

function isYesterday(d) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dayKey(d) === dayKey(y);
}

// Estimate workout intensity score 0–1 from sets/volume
function workoutIntensity(workout) {
  if (!workout) return 0;
  let totalSets = 0;
  let totalVolume = 0;
  (workout.exercises || []).forEach(e => {
    (e.sets || []).forEach(s => {
      totalSets++;
      if (s.weight && s.reps) totalVolume += s.weight * s.reps;
    });
  });
  // Normalise: 20 sets + 5000kg volume = intensity 1.0
  return Math.min(1.0, (totalSets / 20) * 0.5 + (totalVolume / 5000) * 0.5);
}

// ── Core engine ───────────────────────────────────────────────────────────────

async function computeDailyIntelligence(userId) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [user, todayLog, yesterdayLog, recentWorkouts, recentMental, topInsights] = await Promise.all([
    User.findById(userId).select('biologicalProfile clinicalTargets bodyComposition labMarkers weight height gender dob').lean(),
    NutritionLog.findOne({ user: userId, date: { $gte: todayStart } }).lean(),
    NutritionLog.findOne({ user: userId, date: { $gte: yesterdayStart, $lt: todayStart } }).lean(),
    Workout.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).lean(),
    MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).lean(),
    selectTopInsights(userId, { limit: 3 }).catch(() => []),
  ]);

  const profile = user?.biologicalProfile || {};
  const toNum = v => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
  const effectiveProfile = {
    ...profile,
    biologicalSex: profile.biologicalSex || user?.gender,
    heightCm: toNum(profile.heightCm) ?? toNum(user?.height),
    weightKg: toNum(profile.weightKg) ?? toNum(user?.weight),
    dob: profile.dob || user?.dob,
  };

  // ── 1. YESTERDAY'S DEBT ───────────────────────────────────────────────────
  const yesterdayWorkout = recentWorkouts.find(w => isYesterday(w.date));
  const yesterdayIntensity = workoutIntensity(yesterdayWorkout);
  const yesterdayCalories = yesterdayLog?.dailyTotals?.calories || 0;

  // Get static target for comparison
  let staticTargets = user?.clinicalTargets?.targets;
  if (!staticTargets && effectiveProfile.biologicalSex) {
    const calc = calculateDailyTargets(effectiveProfile, null, null, toNum(user?.bodyComposition?.bmrKcal));
    staticTargets = calc?.targets;
  }
  const targetCals = staticTargets?.calories || 2000;

  // Deficit score: how far under target were they yesterday?
  // null = no log (missing day should not count as a deficit)
  const yesterdayDeficit = yesterdayCalories > 0 ? Math.max(0, targetCals - yesterdayCalories) : null;

  // Sleep data from mental logs — only use if fresh (within 2 days)
  const lastMental = recentMental[0];
  const mentalDaysAgo = lastMental?.date
    ? Math.floor((Date.now() - new Date(lastMental.date).getTime()) / 86400000)
    : 999;
  const sleepDataFresh = mentalDaysAgo <= 2;
  // If stale, treat sleep as neutral (7h) to avoid adding phantom debt
  const lastSleep = sleepDataFresh ? (lastMental?.sleepHours ?? 7) : 7;
  const lastStress = sleepDataFresh ? (lastMental?.stressLevel ?? 5) : 5;

  // Consecutive hard days: count how many of the last 7 days had hard workouts (intensity > 0.6)
  // Each extra consecutive hard day beyond 2 multiplies debt (diminishing recovery capacity)
  const hardTrainingDaysLast7 = recentWorkouts.filter(w => {
    const age = Math.floor((now - new Date(w.date).getTime()) / 86400000);
    return age < 7 && workoutIntensity(w) > 0.6;
  }).length;
  const consecutiveFatigueBonus = Math.max(0, hardTrainingDaysLast7 - 2); // 0 for ≤2, 1 for 3, 2 for 4, etc.

  // Recovery debt = heavy session + underfuel + poor sleep + consecutive load compounding
  let debtScore = 0;
  if (yesterdayIntensity > 0.6) debtScore += 2;
  else if (yesterdayIntensity > 0.3) debtScore += 1;
  if (yesterdayDeficit != null && yesterdayDeficit > 400) debtScore += 2;
  else if (yesterdayDeficit != null && yesterdayDeficit > 200) debtScore += 1;
  if (lastSleep < 6) debtScore += 2;
  else if (lastSleep < 7) debtScore += 1;
  if (lastStress > 7) debtScore += 1;
  debtScore += consecutiveFatigueBonus; // +1 per hard day beyond 2 in last week
  const recoveryDebt = Math.min(10, debtScore); // 0–10

  // ── 2. TODAY'S PLAN ───────────────────────────────────────────────────────
  const todayWorkout = recentWorkouts.find(w => isToday(w.date));
  const todayIntensity = workoutIntensity(todayWorkout);
  const workoutCompletedMinutesAgo = todayWorkout
    ? Math.round((now - new Date(todayWorkout.updatedAt || todayWorkout.date)) / 60000)
    : null;

  // ── 3. CURRENT STATE ──────────────────────────────────────────────────────
  const todayCalories = todayLog?.dailyTotals?.calories || 0;
  const todayProtein = todayLog?.dailyTotals?.protein || 0;
  const todayCarbs = todayLog?.dailyTotals?.carbs || 0;
  const todayFiber = todayLog?.dailyTotals?.fiber || 0;
  const minsNow = minutesNow();
  const dayProgressFraction = Math.max(0.1, (minsNow - 360) / 840); // 6am–8pm window

  // ── Adaptive TDEE + metabolic map ────────────────────────────────────────
  let adaptiveTdee = null;
  let dietPhase = 'maintenance';
  let metabolicModifiers = null;
  if (profile.useAdaptiveTdee !== false) {
    try {
      const mapResult = await calculateMetabolicMap(userId, 60);
      if (mapResult?.status === 'success') {
        adaptiveTdee = mapResult.dynamicTDEE;
        dietPhase = mapResult.dietPhase || 'maintenance';
        metabolicModifiers = mapResult.modifiers;
      }
    } catch (_) {
      try {
        const ar = await calculateAdaptiveTDEE(userId, 30);
        if (ar.status === 'success') adaptiveTdee = ar.adaptiveTdee;
      } catch (_) {}
    }
  }

  const baseTdee = adaptiveTdee || targetCals;

  // ── Dynamic target for TODAY ───────────────────────────────────────────────
  // Adjust from base metabolic goal based on what happened yesterday + today's workout
  let dynamicCalDelta = 0;
  let dynamicProteinDelta = 0;
  let targetReason = [];

  // Compute how aggressive the current cut is — cap upward adjustments so we
  // don't inadvertently flip a legitimate deficit into maintenance or surplus.
  const baseDeficitDepth = baseTdee - targetCals; // positive = intentional deficit, negative = surplus
  const isAggressiveCut = baseDeficitDepth > 500; // >500 kcal/day cut = aggressive

  if (recoveryDebt >= 5) {
    // High recovery debt — push toward maintenance to protect muscle, but cap the bump
    // for users in an aggressive cut (they chose that deficit intentionally; don't erase it entirely)
    const rawMaintBump = Math.max(0, baseTdee - targetCals);
    dynamicCalDelta = isAggressiveCut ? Math.round(rawMaintBump * 0.6) : rawMaintBump;
    dynamicProteinDelta = 20;
    targetReason.push(`Recovery debt ${recoveryDebt}/10 — ${isAggressiveCut ? 'partial' : 'full'} maintenance bump to protect muscle`);
  }

  // Workout-day adjustments scale with training phase:
  // In aggressive cut, use smaller deltas (50% of normal) to avoid erasing the deficit.
  const phaseMultiplier = isAggressiveCut ? 0.5 : 1.0;

  if (todayIntensity > 0.6) {
    dynamicCalDelta += Math.round(150 * phaseMultiplier);
    dynamicProteinDelta += Math.round(15 * phaseMultiplier);
    targetReason.push(`Heavy session today — extra protein + carbs for repair${isAggressiveCut ? ' (reduced for cut phase)' : ''}`);
  } else if (todayIntensity > 0.3) {
    dynamicCalDelta += Math.round(75 * phaseMultiplier);
    dynamicProteinDelta += Math.round(8 * phaseMultiplier);
    targetReason.push(`Moderate session today — slight uptick for muscle synthesis${isAggressiveCut ? ' (reduced for cut phase)' : ''}`);
  }

  if (yesterdayIntensity > 0.6 && recoveryDebt < 5) {
    dynamicProteinDelta += Math.round(10 * phaseMultiplier);
    targetReason.push('Carry-over from yesterday\'s session — protein synthesis still elevated');
  }

  const dynamicTarget = {
    calories: Math.round(targetCals + dynamicCalDelta),
    protein: Math.round((staticTargets?.protein || 120) + dynamicProteinDelta),
    carbs: staticTargets?.carbs || 200,
    fat: staticTargets?.fat || 60,
    fiber: staticTargets?.fiber || 30,
  };

  const targetDelta = {
    calories: Math.round(dynamicCalDelta),
    protein: Math.round(dynamicProteinDelta),
    reason: targetReason.join('; ') || null,
  };

  // ── Mode detection ────────────────────────────────────────────────────────
  let mode = 'maintaining';
  if (recoveryDebt >= 6) mode = 'recovering';
  else if (todayIntensity > 0.4 || (todayWorkout && workoutCompletedMinutesAgo != null && workoutCompletedMinutesAgo < 90)) mode = 'fueling';
  else if (dietPhase === 'aggressive_cut' || dietPhase === 'moderate_cut') mode = 'cutting';
  else if (dietPhase === 'moderate_bulk' || dietPhase === 'aggressive_bulk') mode = 'bulking';

  // ── Time-sensitive actions ────────────────────────────────────────────────
  const actions = [];

  // Post-workout window (highest priority — narrow window)
  if (todayWorkout && workoutCompletedMinutesAgo != null && workoutCompletedMinutesAgo <= 90) {
    const proteinLogged = todayProtein;
    const proteinNeeded = Math.max(0, dynamicTarget.protein - proteinLogged);
    if (proteinNeeded > 20) {
      actions.push({
        priority: 1,
        type: 'post_workout',
        urgency: 'high',
        title: `Post-workout window — ${Math.round(90 - workoutCompletedMinutesAgo)} min left`,
        body: `You've logged ${Math.round(proteinLogged)}g protein. Need ${Math.round(proteinNeeded)}g more. Muscle synthesis peaks now — don't miss this window.`,
        suggestion: 'Greek yogurt (17g), paneer (14g/100g), or boiled eggs (6g each) are fast options.',
        windowClosesMins: Math.round(90 - workoutCompletedMinutesAgo),
      });
    }
  }

  // Pre-sleep protein check (after 8pm, protein gap exists)
  if (minsNow >= 1200 && minsNow < 1380) { // 8pm–11pm
    const targetProtein = dynamicTarget.protein;
    const proteinGap = targetProtein - todayProtein;
    if (proteinGap > 25) {
      const sleepTime = profile.defaultSleepTime || '22:30';
      actions.push({
        priority: 2,
        type: 'pre_sleep_protein',
        urgency: 'medium',
        title: 'Pre-sleep protein gap',
        body: `${Math.round(proteinGap)}g protein short before bed. Slow-digesting protein now feeds overnight muscle repair.`,
        suggestion: 'Cottage cheese or curd (casein protein) digests slowly over 5–7h during sleep. Better than whey right now.',
      });
    }
  }

  // Recovery debt warning (morning — no workout yet today)
  if (recoveryDebt >= 6 && !todayWorkout && minsNow < 720) {
    actions.push({
      priority: 3,
      type: 'recovery_debt',
      urgency: 'medium',
      title: `High recovery debt (${recoveryDebt}/10)`,
      body: `${lastSleep < 6.5 ? `Only ${lastSleep}h sleep + ` : ''}${yesterdayDeficit != null && yesterdayDeficit > 300 ? `${Math.round(yesterdayDeficit)} kcal under target yesterday + ` : ''}${yesterdayIntensity > 0.5 ? 'heavy session yesterday.' : 'accumulated fatigue.'}`,
      suggestion: `Eat at maintenance today (${baseTdee} kcal). Prioritise Magnesium + B vitamins. Light training only.`,
    });
  }

  // Stress-eating pre-emption (high stress day, afternoon)
  if (lastStress >= 7 && minsNow >= 720 && minsNow <= 1080) {
    const stressPattern = await checkStressEatingPattern(userId);
    if (stressPattern.hasPattern) {
      actions.push({
        priority: 4,
        type: 'stress_preempt',
        urgency: 'low',
        title: 'Stress-eating pattern detected',
        body: `High stress today (${lastStress}/10). Your pattern shows +${stressPattern.avgExtraKcal} kcal on high-stress days, mostly ${stressPattern.mainCategory || 'sugary foods'}.`,
        suggestion: 'Pre-log a high-protein snack now. Having food committed reduces impulse eating ~40%.',
      });
    }
  }

  // Calorie pacing (afternoon check)
  if (minsNow >= 720 && minsNow <= 1080) {
    const expectedByNow = dynamicTarget.calories * dayProgressFraction;
    const calorieGap = expectedByNow - todayCalories;
    if (calorieGap > 400 && todayCalories < 600) {
      actions.push({
        priority: 5,
        type: 'underfueling',
        urgency: 'low',
        title: 'Behind on fuel',
        body: `Only ${Math.round(todayCalories)} kcal logged by midday. Expected ~${Math.round(expectedByNow)} kcal at this point in the day.`,
        suggestion: 'Underfueling triggers cortisol and muscle catabolism. Eat a proper meal now.',
      });
    }
  }

  // Supplement timing hints (once per day, morning)
  if (minsNow < 600) {
    const suppTips = getSupplementTimingTips(todayLog);
    if (suppTips.length > 0) {
      actions.push({
        priority: 6,
        type: 'supplement_timing',
        urgency: 'low',
        title: 'Supplement timing',
        body: suppTips[0],
        suggestion: null,
      });
    }
  }

  // Sort by priority, keep top 2
  actions.sort((a, b) => a.priority - b.priority);
  const topActions = actions.slice(0, 2);

  // ── Pick best cross-domain insight ────────────────────────────────────────
  const topInsight = topInsights.length > 0 ? topInsights[0] : null;

  return {
    mode,
    dietPhase,
    recoveryDebt,
    dynamicTarget,
    targetDelta,
    actions: topActions,
    insight: topInsight ? {
      title: topInsight.title,
      detail: topInsight.detail,
      action: topInsight.action,
      kind: topInsight.kind,
      impact: topInsight.impact,
    } : null,
    metabolicModifiers,
    context: {
      todayCalories: Math.round(todayCalories),
      todayProtein: Math.round(todayProtein),
      todayWorkoutDone: !!todayWorkout,
      workoutCompletedMinsAgo: workoutCompletedMinutesAgo,
      lastSleep,
      lastStress,
      yesterdayDeficit: yesterdayDeficit != null ? Math.round(yesterdayDeficit) : null,
    },
  };
}

// ── Stress-eating pattern check ───────────────────────────────────────────────
async function checkStressEatingPattern(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [mentalLogs, nutritionLogs] = await Promise.all([
    MentalLog.find({ user: userId, date: { $gte: thirtyDaysAgo }, stressLevel: { $exists: true } }).lean(),
    NutritionLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).select('date dailyTotals').lean(),
  ]);

  if (mentalLogs.length < 5) return { hasPattern: false };

  const nutritionByDay = {};
  nutritionLogs.forEach(l => { nutritionByDay[dayKey(l.date)] = l.dailyTotals?.calories || 0; });

  const highStressDays = mentalLogs.filter(m => m.stressLevel >= 7).map(m => dayKey(m.date));
  const normalDays = mentalLogs.filter(m => m.stressLevel <= 4).map(m => dayKey(m.date));

  if (highStressDays.length < 3) return { hasPattern: false };

  const avgHighStress = highStressDays.reduce((s, d) => s + (nutritionByDay[d] || 0), 0) / highStressDays.length;
  const avgNormal = normalDays.reduce((s, d) => s + (nutritionByDay[d] || 0), 0) / Math.max(1, normalDays.length);

  const delta = avgHighStress - avgNormal;
  if (delta < 200) return { hasPattern: false };

  return { hasPattern: true, avgExtraKcal: Math.round(delta), mainCategory: 'sugar/processed foods' };
}

// ── Supplement timing tips ────────────────────────────────────────────────────
function getSupplementTimingTips(todayLog) {
  const tips = [];
  const supplements = todayLog?.supplements || [];

  const hasCreatine = supplements.some(s => /creatine/i.test(s.name || ''));
  const hasVitaminD = supplements.some(s => /vitamin.?d/i.test(s.name || ''));
  const hasMagnesium = supplements.some(s => /magnesium/i.test(s.name || ''));

  const hasFatMeal = (todayLog?.dailyTotals?.fat || 0) > 10;
  const hasCarbs = (todayLog?.dailyTotals?.carbs || 0) > 30;

  if (hasCreatine && !hasCarbs) {
    tips.push('Creatine absorbs best with carbs (insulin-dependent). Take it with your biggest carb meal.');
  }
  if (hasVitaminD && !hasFatMeal) {
    tips.push('Vitamin D is fat-soluble — take it with your fattiest meal for 40–50% better absorption.');
  }
  if (hasMagnesium) {
    tips.push('Magnesium before bed improves sleep quality and overnight recovery. Move your dose to 30 min before sleep.');
  }
  return tips;
}

module.exports = { computeDailyIntelligence };
