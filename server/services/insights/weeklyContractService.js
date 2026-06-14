/**
 * Weekly Contract Service
 *
 * Auto-proposes 3 targets for the coming week based on what this week's
 * data actually shows — not generic advice. Each target is:
 *   - Specific and measurable (a number, not a vibe)
 *   - Grounded in a gap from actual logs
 *   - Slightly above current behavior (10-15% stretch, not a fantasy)
 *
 * Scoring runs Friday evening: compare actual week data against committed targets.
 */

const WeeklyContract = require('../../models/WeeklyContract');
const { NutritionLog, MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');
const { computeWeeklyMacroAggregation, getISOWeek } = require('../nutritionAggregation/weeklyAggregator');
const { calculateDailyTargets } = require('../nutritionEngine');

function weekKeyFromDate(date = new Date()) {
  const w = getISOWeek(date);
  return `${w.year}-W${String(w.week).padStart(2, '0')}`;
}

function nextWeekKey(currentWeekKey) {
  const [year, week] = currentWeekKey.split('-W').map(Number);
  let nw = week + 1, ny = year;
  if (nw > 52) { nw = 1; ny++; }
  return `${ny}-W${String(nw).padStart(2, '0')}`;
}

function prevWeekKey(currentWeekKey) {
  const [year, week] = currentWeekKey.split('-W').map(Number);
  let pw = week - 1, py = year;
  if (pw < 1) { pw = 52; py--; }
  return `${py}-W${String(pw).padStart(2, '0')}`;
}

async function getWeekDateRange(weekKey) {
  // Reuse from weeklyAggregator logic — same Sunday-start week
  const [year, week] = weekKey.split('-W').map(Number);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearStartDay = yearStart.getUTCDay();
  const week1Start = new Date(yearStart);
  week1Start.setUTCDate(yearStart.getUTCDate() - yearStartDay);
  const weekStart = new Date(week1Start);
  weekStart.setUTCDate(week1Start.getUTCDate() + (week - 1) * 7);
  weekStart.setUTCHours(-5, -30, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(18, 29, 59, 999);
  return { weekStart, weekEnd };
}

/**
 * Generate proposed targets for the NEXT week based on THIS week's data.
 */
async function proposeTargets(userId, thisWeekKey) {
  const user = await User.findById(userId).select('biologicalProfile weight height gender dob clinicalTargets').lean();
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

  // Get this week's macro aggregation
  const macros = await computeWeeklyMacroAggregation(userId, thisWeekKey);
  const { weekStart, weekEnd } = await getWeekDateRange(thisWeekKey);

  // Get this week's workout count
  const workoutCount = await Workout.countDocuments({ user: userId, date: { $gte: weekStart, $lte: weekEnd } });

  // Get this week's logging consistency
  const nutLogs = await NutritionLog.find({ user: userId, date: { $gte: weekStart, $lte: weekEnd } }).select('date dailyTotals').lean();
  const daysLogged = nutLogs.filter(l => (l.dailyTotals?.calories || 0) > 500).length;
  const avgProtein = macros.weeklyAverages?.protein || 0;
  const avgCalories = macros.weeklyAverages?.calories || 0;

  const targets = [];

  // ── Target 1: Nutrition logging consistency ────────────────────────────────
  // If they logged < 6 days, target is to log more. Always nutrition-first.
  if (daysLogged < 6) {
    const targetDays = Math.min(7, daysLogged + 2);
    targets.push({
      domain: 'nutrition',
      metric: 'days_logged',
      label: `Log meals on ${targetDays} days`,
      why: `You logged ${daysLogged} of 7 days this week. More logged days = better data and better decisions. This is the foundation everything else builds on.`,
      targetValue: targetDays,
      unit: 'days',
    });
  }

  // ── Target 2: Protein consistency ─────────────────────────────────────────
  // Most impactful single nutrition metric for body composition.
  if (avgProtein < proteinTarget * 0.90) {
    const gap = Math.round(proteinTarget - avgProtein);
    const stretchTarget = Math.round(avgProtein + Math.min(gap * 0.6, 25)); // 60% of gap, max +25g
    targets.push({
      domain: 'nutrition',
      metric: 'avg_protein_g',
      label: `Average ${stretchTarget}g protein per day`,
      why: `This week you averaged ${Math.round(avgProtein)}g — ${gap}g below your ${proteinTarget}g target. Closing this gap is the single highest-leverage nutrition change for your goal.`,
      targetValue: stretchTarget,
      unit: 'g/day',
    });
  } else if (avgProtein >= proteinTarget * 0.90) {
    // Protein is good — push calories or a different metric
    if (avgCalories < calTarget * 0.85 || avgCalories > calTarget * 1.15) {
      const direction = avgCalories < calTarget * 0.85 ? 'hit' : 'stay at';
      targets.push({
        domain: 'nutrition',
        metric: 'avg_calories',
        label: `${direction} ${calTarget} kcal average`,
        why: avgCalories < calTarget * 0.85
          ? `You averaged ${Math.round(avgCalories)} kcal — ${Math.round(calTarget - avgCalories)} below target. Sustained under-eating elevates cortisol and slows recovery.`
          : `You averaged ${Math.round(avgCalories)} kcal — ${Math.round(avgCalories - calTarget)} above target. Tighter consistency this week.`,
        targetValue: calTarget,
        unit: 'kcal/day',
      });
    }
  }

  // ── Target 3: Training or wellness ────────────────────────────────────────
  // Prioritise training if they've been inconsistent; wellness if stress was high.
  const mentalLogs = await MentalLog.find({ user: userId, date: { $gte: weekStart, $lte: weekEnd } }).select('stressLevel').lean();
  const avgStress = mentalLogs.length > 0
    ? mentalLogs.filter(m => m.stressLevel != null).reduce((s, m) => s + m.stressLevel, 0)
      / Math.max(1, mentalLogs.filter(m => m.stressLevel != null).length)
    : 0;

  if (workoutCount < 3) {
    const targetWorkouts = Math.min(5, workoutCount + 2);
    targets.push({
      domain: 'training',
      metric: 'workouts',
      label: `Complete ${targetWorkouts} training sessions`,
      why: `You logged ${workoutCount} session${workoutCount !== 1 ? 's' : ''} this week. Consistent training is the other half of body composition — nutrition alone won't get there.`,
      targetValue: targetWorkouts,
      unit: 'sessions',
    });
  } else if (avgStress >= 7) {
    targets.push({
      domain: 'wellness',
      metric: 'check_in_days',
      label: 'Log readiness on 5+ days',
      why: `High stress week (avg ${avgStress.toFixed(1)}/10). Tracking readiness during high-stress periods helps calibrate training intensity and prevents overreach.`,
      targetValue: 5,
      unit: 'days',
    });
  } else {
    // Default: maintain training + add rest days if consecutive
    targets.push({
      domain: 'training',
      metric: 'workouts',
      label: `Complete ${workoutCount >= 4 ? workoutCount : workoutCount + 1} training sessions`,
      why: workoutCount >= 4
        ? `Good training volume this week. Maintain it — consistency over 8+ weeks is where adaptations lock in.`
        : `Building from ${workoutCount} sessions. One more session this week puts you in an optimal training frequency range.`,
      targetValue: workoutCount >= 4 ? workoutCount : workoutCount + 1,
      unit: 'sessions',
    });
  }

  // Ensure we have exactly 3, no duplicates
  const seen = new Set();
  const deduped = targets.filter(t => { const k = t.metric; if (seen.has(k)) return false; seen.add(k); return true; });
  return deduped.slice(0, 3);
}

/**
 * Get or create contract for a given week.
 * On first load for next week (Sunday), auto-proposes targets.
 */
async function getOrCreateContract(userId, forWeekKey) {
  let doc = await WeeklyContract.findOne({ user: userId, weekKey: forWeekKey });
  if (doc) return doc;

  // Auto-propose based on previous week's data
  const previousWeekKey = prevWeekKey(forWeekKey);
  const proposedTargets = await proposeTargets(userId, previousWeekKey).catch(() => []);

  doc = await WeeklyContract.create({
    user: userId,
    weekKey: forWeekKey,
    targets: proposedTargets,
    status: 'proposed',
  });
  return doc;
}

/**
 * User saves (possibly edited) contract — marks as active.
 */
async function saveContract(userId, weekKey, targets) {
  const doc = await WeeklyContract.findOneAndUpdate(
    { user: userId, weekKey },
    { $set: { targets, status: 'active', userEdited: true } },
    { new: true, upsert: true }
  );
  return doc;
}

/**
 * Score the contract for a completed week.
 * Compares actual metrics against targets.
 */
async function scoreContract(userId, weekKey) {
  const doc = await WeeklyContract.findOne({ user: userId, weekKey });
  if (!doc || doc.status === 'scored') return doc;

  const { weekStart, weekEnd } = await getWeekDateRange(weekKey);

  const [nutLogs, workouts, mentalLogs, macros] = await Promise.all([
    NutritionLog.find({ user: userId, date: { $gte: weekStart, $lte: weekEnd } }).select('date dailyTotals').lean(),
    Workout.countDocuments({ user: userId, date: { $gte: weekStart, $lte: weekEnd } }),
    MentalLog.countDocuments({ user: userId, date: { $gte: weekStart, $lte: weekEnd } }),
    computeWeeklyMacroAggregation(userId, weekKey).catch(() => null),
  ]);

  const daysLogged = nutLogs.filter(l => (l.dailyTotals?.calories || 0) > 500).length;
  const avgProtein = macros?.weeklyAverages?.protein || 0;
  const avgCalories = macros?.weeklyAverages?.calories || 0;

  const actuals = {
    days_logged: daysLogged,
    avg_protein_g: Math.round(avgProtein),
    avg_calories: Math.round(avgCalories),
    workouts,
    check_in_days: mentalLogs,
  };

  let metCount = 0;
  const scoredTargets = doc.targets.map(t => {
    const actual = actuals[t.metric] ?? null;
    const met = actual != null ? actual >= t.targetValue : null;
    if (met) metCount++;
    return { ...t.toObject(), actualValue: actual, met };
  });

  doc.targets = scoredTargets;
  doc.score = metCount;
  doc.status = 'scored';
  doc.scoredAt = new Date();
  await doc.save();
  return doc;
}

module.exports = { getOrCreateContract, saveContract, scoreContract, weekKeyFromDate, nextWeekKey, prevWeekKey };
