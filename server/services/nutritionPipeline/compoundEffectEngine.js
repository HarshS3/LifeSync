/**
 * Compound Effect Engine
 *
 * Projects body composition change at two trajectories:
 *   A. Current behavior  — actual avg intake, actual activity
 *   B. Target behavior   — hitting nutrition targets consistently
 *
 * Metric priority:
 *   1. Body fat % change  — if body fat % known
 *   2. Weight change      — if weight logs exist
 *   3. Calorie deficit projection only — fallback
 *
 * Math:
 *   - 7,700 kcal ≈ 1 kg fat
 *   - Protein synthesis: +10g/day above minimum ≈ +0.5g lean mass/day (simplified, capped)
 *   - Body fat change = (weight change) adjusted for estimated lean mass delta
 */

const { NutritionLog, WeightLog } = require('../../models/Logs');
const User = require('../../models/User');
const { calculateDailyTargets } = require('../nutritionEngine');
const { calculateAdaptiveTDEE } = require('./adaptiveTdeeEngine');

async function computeCompoundEffect(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [user, nutLogs, weightLogs] = await Promise.all([
    User.findById(userId).select('biologicalProfile weight height gender dob clinicalTargets bodyComposition').lean(),
    NutritionLog.find({ user: userId, date: { $gte: thirtyDaysAgo } })
      .select('date dailyTotals').lean(),
    WeightLog.find({ user: userId, date: { $gte: thirtyDaysAgo } })
      .select('date weightKg').sort({ date: 1 }).lean(),
  ]);

  // ── Resolve profile ────────────────────────────────────────────────────────
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
  const calTarget = user?.clinicalTargets?.targets?.calories || calc?.targets?.calories || 2000;
  const proteinTarget = user?.clinicalTargets?.targets?.protein || calc?.targets?.protein || 120;
  const metabolicGoal = profile.metabolicGoal || 'maintenance';
  const currentWeightKg = toNum(profile.weightKg) ?? toNum(user?.weight) ?? 75;
  const bodyFatPct = toNum(profile.bodyFatPercentage);
  const hasBodyFat = bodyFatPct != null && bodyFatPct > 5 && bodyFatPct < 60;

  // ── Adaptive TDEE ──────────────────────────────────────────────────────────
  let tdee = calTarget; // base fallback
  try {
    const ar = await calculateAdaptiveTDEE(userId, 30);
    if (ar.status === 'success') tdee = ar.adaptiveTdee;
  } catch (_) {}

  // ── Current behavior averages ──────────────────────────────────────────────
  const validLogs = nutLogs.filter(l => (l.dailyTotals?.calories || 0) > 500);
  if (validLogs.length < 5) {
    return {
      status: 'insufficient_data',
      message: 'Log at least 5 days of meals to see your compound projection.',
      daysLogged: validLogs.length,
    };
  }

  const avgCurrentCal = validLogs.reduce((s, l) => s + (l.dailyTotals.calories || 0), 0) / validLogs.length;
  const avgCurrentProtein = validLogs.reduce((s, l) => s + (l.dailyTotals.protein || 0), 0) / validLogs.length;

  // ── Trajectory calculations ────────────────────────────────────────────────
  // Daily caloric balance
  const currentDailyBalance = avgCurrentCal - tdee;   // negative = deficit
  const targetDailyBalance = calTarget - tdee;          // what target behavior achieves

  // Weight change rate (kg/day)
  const currentWeightChangePerDay = currentDailyBalance / 7700;
  const targetWeightChangePerDay = targetDailyBalance / 7700;

  // Lean mass synthesis boost from protein
  // Simplified: every 10g above 1.6g/kg baseline adds ~0.4g lean mass/day
  const minProtein = currentWeightKg * 1.6;
  const currentProteinBonus = Math.max(0, avgCurrentProtein - minProtein);
  const targetProteinBonus = Math.max(0, proteinTarget - minProtein);
  const currentLeanGainPerDay = Math.min(currentProteinBonus * 0.04, 0.05); // cap 50g lean/day
  const targetLeanGainPerDay = Math.min(targetProteinBonus * 0.04, 0.05);

  // Project forward at 30 / 90 / 180 days
  const project = (weightChangePerDay, leanGainPerDay, days) => {
    const totalWeightKg = weightChangePerDay * days;
    const leanMassKg = leanGainPerDay * days;
    const fatKg = totalWeightKg - leanMassKg;

    if (hasBodyFat) {
      const currentFatKg = currentWeightKg * (bodyFatPct / 100);
      const currentLeanKg = currentWeightKg - currentFatKg;
      const projectedFatKg = Math.max(currentFatKg + fatKg, currentFatKg * 0.7);
      const projectedLeanKg = currentLeanKg + leanMassKg;
      const projectedWeightKg = projectedFatKg + projectedLeanKg;
      const projectedBodyFatPct = (projectedFatKg / projectedWeightKg) * 100;
      return {
        weightKg: parseFloat(projectedWeightKg.toFixed(1)),
        fatKg: parseFloat(projectedFatKg.toFixed(1)),
        leanKg: parseFloat(projectedLeanKg.toFixed(1)),
        bodyFatPct: parseFloat(projectedBodyFatPct.toFixed(1)),
        fatChange: parseFloat(fatKg.toFixed(2)),
        leanChange: parseFloat(leanMassKg.toFixed(2)),
      };
    } else {
      return {
        weightKg: parseFloat((currentWeightKg + totalWeightKg).toFixed(1)),
        weightChange: parseFloat(totalWeightKg.toFixed(2)),
        leanChange: parseFloat(leanMassKg.toFixed(2)),
      };
    }
  };

  const horizons = [30, 90, 180];
  const currentTrajectory = horizons.map(d => ({ days: d, ...project(currentWeightChangePerDay, currentLeanGainPerDay, d) }));
  const targetTrajectory = horizons.map(d => ({ days: d, ...project(targetWeightChangePerDay, targetLeanGainPerDay, d) }));

  // ── Gap narrative ──────────────────────────────────────────────────────────
  const gap180Current = currentTrajectory[2];
  const gap180Target = targetTrajectory[2];

  let gapNarrative = '';
  let keyDelta = null;

  if (hasBodyFat) {
    const fatDiff = gap180Current.fatChange - gap180Target.fatChange;
    const leanDiff = gap180Target.leanChange - gap180Current.leanChange;
    if (metabolicGoal.includes('loss')) {
      keyDelta = { metric: 'fat', unit: 'kg', current: gap180Current.fatChange, target: gap180Target.fatChange };
      gapNarrative = fatDiff > 0.3
        ? `At current behavior, you'll lose ${Math.abs(gap180Current.fatChange).toFixed(1)}kg fat in 6 months. Hitting your targets: ${Math.abs(gap180Target.fatChange).toFixed(1)}kg. The difference is ${fatDiff.toFixed(1)}kg fat — roughly ${Math.round(fatDiff / 7 * 1000)}g per week.`
        : `Your current and target trajectories are close — you're eating near your targets. Small consistency improvements compound.`;
    } else {
      keyDelta = { metric: 'lean', unit: 'kg', current: gap180Current.leanChange, target: gap180Target.leanChange };
      gapNarrative = leanDiff > 0.2
        ? `At current protein intake, ${gap180Current.leanChange.toFixed(2)}kg lean mass gained in 6 months. At target protein: ${gap180Target.leanChange.toFixed(2)}kg. An extra ${Math.round(proteinTarget - avgCurrentProtein)}g protein/day is the entire difference.`
        : `Protein intake is on track. Keep the consistency.`;
    }
  } else {
    const weightDiff = gap180Current.weightChange - gap180Target.weightChange;
    keyDelta = { metric: 'weight', unit: 'kg', current: gap180Current.weightChange, target: gap180Target.weightChange };
    gapNarrative = Math.abs(weightDiff) > 0.5
      ? `At current intake, ${gap180Current.weightChange > 0 ? '+' : ''}${gap180Current.weightChange.toFixed(1)}kg in 6 months. At target: ${gap180Target.weightChange > 0 ? '+' : ''}${gap180Target.weightChange.toFixed(1)}kg. The gap is ${Math.abs(weightDiff).toFixed(1)}kg — driven by a ${Math.round(Math.abs(avgCurrentCal - calTarget))} kcal/day average difference.`
      : `Current and target trajectories are within 0.5kg over 6 months — you're very close to your targets.`;
  }

  return {
    status: 'success',
    metric: hasBodyFat ? 'body_fat' : 'weight',
    currentBehavior: {
      avgCalories: Math.round(avgCurrentCal),
      avgProtein: Math.round(avgCurrentProtein),
      dailyBalance: Math.round(currentDailyBalance),
    },
    targetBehavior: {
      calories: calTarget,
      protein: proteinTarget,
      dailyBalance: Math.round(targetDailyBalance),
    },
    currentTrajectory,
    targetTrajectory,
    keyDelta,
    gapNarrative,
    currentWeightKg,
    bodyFatPct: hasBodyFat ? bodyFatPct : null,
    metabolicGoal,
    daysLogged: validLogs.length,
    tdee: Math.round(tdee),
  };
}

module.exports = { computeCompoundEffect };
