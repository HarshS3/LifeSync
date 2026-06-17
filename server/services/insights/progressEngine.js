const { WeightLog, NutritionLog, MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');

/**
 * Analyzes multi-domain progress to surface "Perspective Shift" narratives —
 * cross-domain stories that aren't visible from any single metric.
 *
 * All narratives are deterministic, computed from real logs. To add a new one,
 * write an analyzer that returns { title, text, type } | null and add it to
 * ANALYZERS below.
 */
async function analyzeProgressNarrative(userId) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [weights, workouts, nutrition, mental, user] = await Promise.all([
    WeightLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }).lean(),
    Workout.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }).lean(),
    NutritionLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }).lean(),
    MentalLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }).lean(),
    // TASK 9: Fetch user data for dynamic protein target
    User.findById(userId).select('weight biologicalProfile clinicalTargets').lean(),
  ]);

  // TASK 9: Compute dynamic protein target from clinicalTargets or 1.6g/kg body weight
  const dynamicProteinTarget = user?.clinicalTargets?.targets?.protein
    || Math.round((user?.biologicalProfile?.weightKg || user?.weight || 70) * 1.6);

  const ctx = { weights, workouts, nutrition, mental, fourteenDaysAgo, now, proteinTarget: dynamicProteinTarget };

  const ANALYZERS = [
    scaleVsStrength,
    monthlyZoomOut,
    trainingConsistency,
    sleepRecoveryPattern,
    proteinAdherence,
    weightTrendNarrative,
  ];

  const narratives = [];
  for (const fn of ANALYZERS) {
    try {
      const out = fn(ctx);
      if (out) narratives.push(out);
    } catch (err) {
      console.warn('[progressEngine] analyzer failed:', fn.name, err.message);
    }
  }

  return {
    isScaleStalled: detectScaleStalled(weights),
    narratives,
    timeframes: {
      '7d': trend(weights.slice(-7)),
      '30d': trend(weights),
    },
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────
function trend(arr) {
  if (arr.length < 2) return 0;
  return arr[arr.length - 1].weightKg - arr[0].weightKg;
}

function detectScaleStalled(weights) {
  if (weights.length < 7) return false;
  const recent = weights.slice(-7);
  return Math.abs(recent[recent.length - 1].weightKg - recent[0].weightKg) < 0.3;
}

// Computes max-weight-lifted-per-exercise in two windows and returns the
// exercise with the largest % gain. Skips bodyweight (initial = 0) to avoid
// division by zero / nonsense % gains.
function bestStrengthGain(workouts, fourteenDaysAgo) {
  const earlyMax = {}; // exerciseName -> max weight in early window
  const lateMax = {};

  for (const w of workouts) {
    const isLate = new Date(w.date) >= fourteenDaysAgo;
    const target = isLate ? lateMax : earlyMax;
    for (const ex of w.exercises || []) {
      const max = Math.max(0, ...(ex.sets || []).map(s => Number(s.weight) || 0));
      if (max <= 0) continue;
      target[ex.name] = Math.max(target[ex.name] || 0, max);
    }
  }

  let best = null;
  for (const name of Object.keys(lateMax)) {
    const initial = earlyMax[name];
    const current = lateMax[name];
    if (!initial || initial <= 0) continue; // need a real prior baseline
    if (current <= initial) continue;
    const gainPct = ((current - initial) / initial) * 100;
    if (gainPct > 50) continue; // sanity cap — anything beyond 50% in 14 days is noise
    if (!best || gainPct > best.gainPct) best = { name, initial, current, gainPct };
  }
  return best;
}

// ── analyzers ────────────────────────────────────────────────────────────────
function scaleVsStrength({ weights, workouts, fourteenDaysAgo }) {
  if (!detectScaleStalled(weights)) return null;
  const gain = bestStrengthGain(workouts, fourteenDaysAgo);
  if (!gain) {
    return {
      title: 'Metabolic Consolidation',
      text: 'Your weight has held flat for the past week. This often precedes a "whoosh" — water retention drops and the scale catches up. Stay consistent on training and protein.',
      type: 'adaptation',
    };
  }
  return {
    title: 'Scale is flat, but strength is up',
    text: `Weight has barely moved this week, but your ${gain.name} max went from ${gain.initial}kg to ${gain.current}kg — a ${gain.gainPct.toFixed(1)}% gain in two weeks. Classic body recomposition: fat down, muscle up.`,
    type: 'recomposition',
  };
}

function monthlyZoomOut({ weights }) {
  if (weights.length < 14) return null;
  const first = weights[0].weightKg;
  const last = weights[weights.length - 1].weightKg;
  const diff = last - first;
  if (Math.abs(diff) < 0.5) return null;
  const direction = diff < 0 ? 'down' : 'up';
  return {
    title: 'Zoom out: the 30-day view',
    text: `Day-to-day weight is noisy — ±0.5kg swings mean nothing. But you're ${Math.abs(diff).toFixed(1)}kg ${direction} over 30 days, across ${weights.length} weigh-ins. That's a real signal.`,
    type: 'monthly_view',
  };
}

function trainingConsistency({ workouts, now }) {
  if (workouts.length < 3) return null;

  // Count distinct training days in the last 14 / prior 14
  const last14Cutoff = new Date(now); last14Cutoff.setDate(last14Cutoff.getDate() - 14);
  const recentDays = new Set();
  const priorDays = new Set();
  for (const w of workouts) {
    const dayKey = new Date(w.date).toDateString();
    if (new Date(w.date) >= last14Cutoff) recentDays.add(dayKey);
    else priorDays.add(dayKey);
  }
  const recent = recentDays.size;
  const prior = priorDays.size;
  if (recent === 0) return null;

  if (prior > 0 && recent > prior) {
    const delta = recent - prior;
    return {
      title: 'Training frequency rising',
      text: `${recent} sessions in the last 14 days vs ${prior} in the prior 14 — ${delta} more day${delta === 1 ? '' : 's'} of work. Consistency is what compounds; volume matters less than showing up.`,
      type: 'training_volume',
    };
  }
  if (recent >= 8) {
    return {
      title: 'High training frequency',
      text: `${recent} training days in 14 — averaging ${(recent / 2).toFixed(1)}/week. Make sure recovery (sleep, calories, rest days) keeps pace, or you'll be paying interest on this volume in 3–4 weeks.`,
      type: 'training_volume',
    };
  }
  return null;
}

function sleepRecoveryPattern({ mental }) {
  const slept = mental.filter(m => Number.isFinite(m.sleepHours)).map(m => m.sleepHours);
  if (slept.length < 7) return null;

  const avg = slept.reduce((s, x) => s + x, 0) / slept.length;
  const debtDays = slept.filter(h => h < 6.5).length;

  if (debtDays >= 5) {
    return {
      title: 'Sleep debt accumulating',
      text: `You averaged ${avg.toFixed(1)}h of sleep with ${debtDays} nights below 6.5h in the last 30 days. Sleep debt blunts every other lever — strength, mood, glucose control, fat loss — more than any nutrition tweak.`,
      type: 'sleep_debt',
    };
  }
  if (avg >= 7.5) {
    return {
      title: 'Recovery foundation is solid',
      text: `Averaging ${avg.toFixed(1)}h of sleep across ${slept.length} nights logged. This is the single biggest input to readiness — keep the routine you have.`,
      type: 'sleep_strong',
    };
  }
  return null;
}

function proteinAdherence({ nutrition, proteinTarget }) {
  const days = nutrition
    .map(n => n.dailyTotals?.protein)
    .filter(p => Number.isFinite(p) && p > 0);
  if (days.length < 7) return null;

  const avg = days.reduce((s, x) => s + x, 0) / days.length;
  // TASK 9: Use dynamic per-user target instead of hardcoded 130g
  const target = proteinTarget;
  const onTargetDays = days.filter(p => p >= target * 0.9).length;
  const ratio = onTargetDays / days.length;

  if (ratio >= 0.7) {
    return {
      title: 'Protein target hit consistently',
      text: `Averaging ${avg.toFixed(0)}g of protein across ${days.length} logged days, hitting ≥${Math.round(target * 0.9)}g on ${onTargetDays} of them (${Math.round(ratio * 100)}%). This is what's protecting muscle while you're in a deficit.`,
      type: 'protein_strong',
    };
  }
  if (ratio < 0.3 && days.length >= 10) {
    return {
      title: 'Protein intake running low',
      text: `Average ${avg.toFixed(0)}g/day vs a ${target}g target — only ${onTargetDays} of ${days.length} logged days hit it. Low protein during training accelerates muscle loss and slows strength progress.`,
      type: 'protein_low',
    };
  }
  return null;
}

function weightTrendNarrative({ weights }) {
  if (weights.length < 7) return null;
  const first = weights[0].weightKg;
  const last = weights[weights.length - 1].weightKg;
  const diff = last - first;

  if (diff < -0.3 && diff > -3) {
    const weeklyRate = (diff / weights.length) * 7;
    return {
      title: 'Sustainable downward trend',
      text: `Down ${Math.abs(diff).toFixed(1)}kg over ${weights.length} weigh-ins — ${Math.abs(weeklyRate).toFixed(2)}kg/week. This is the sustainable zone; faster losses tend to come back, this won't.`,
      type: 'weight_loss',
    };
  }
  return null;
}

module.exports = { analyzeProgressNarrative };
