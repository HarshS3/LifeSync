/**
 * userContextBundle
 *
 * Returns a compact, structured snapshot of the user's *derived* signals so the
 * AI assistant can ground its replies in real data instead of generic LLM knowledge.
 *
 * Includes (always):
 *   - today's DailyLifeState (summaryState label + per-signal value/confidence)
 *   - active IdentityMemory claims (sleep_keystone, training_overreach, etc.)
 *   - top active PatternMemory rows (last 7 days, confidence ≥ 0.55)
 *   - active LongTermGoal + Habit lists (names + streaks)
 *   - last 24h logs (nutrition totals, last workout summary, last MentalLog)
 *
 * Includes (mode-specific) when buildUserContextBundle is called with `mode`:
 *   - fitness: last 7 workouts with PR-relevant detail
 *   - medical: recent symptoms + last lab abnormals
 *   - therapy: 7-day mood/stress/sleep trend
 *
 * Cached in-memory for 60s per user. The bundle is small (a few KB serialized);
 * the cache exists to avoid repeated DB hits when a chat session sends multiple
 * turns in quick succession. Cached entries are invalidated by
 * triggerDailyLifeStateRecompute and by direct clearCache calls.
 */

const DailyLifeState = require('../../models/DailyLifeState');
const PatternMemory = require('../../models/PatternMemory');
const IdentityMemory = require('../../models/IdentityMemory');
const { LongTermGoal } = require('../../models/LongTermGoal');
const { Habit } = require('../../models/Habit');
const { NutritionLog, MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const SymptomLog = require('../../models/SymptomLog');
const LabReport = require('../../models/LabReport');
const { dayKeyFromDate } = require('../dailyLifeState/dayKey');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // userId|mode -> { expiresAt, bundle }

function cacheKey(userId, mode) {
  return `${String(userId)}|${mode || 'general'}`;
}

function cacheGet(userId, mode) {
  const entry = cache.get(cacheKey(userId, mode));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(cacheKey(userId, mode));
    return null;
  }
  return entry.bundle;
}

function cachePut(userId, mode, bundle) {
  cache.set(cacheKey(userId, mode), { expiresAt: Date.now() + CACHE_TTL_MS, bundle });
}

function summarizeSignal(s) {
  if (!s || typeof s.value !== 'number') return null;
  return { value: Math.round(s.value * 100) / 100, confidence: Math.round((s.confidence || 0) * 100) / 100 };
}

async function buildUserContextBundle(userId, { mode = 'general' } = {}) {
  if (!userId) return null;
  const cached = cacheGet(userId, mode);
  if (cached) return cached;

  const now = new Date();
  const dayKey = dayKeyFromDate(now);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseQueries = [
    DailyLifeState.findOne({ user: userId, dayKey }).lean().catch(() => null),
    PatternMemory.find({
      user: userId,
      status: 'active',
      confidence: { $gte: 0.55 },
      lastObserved: { $gte: sevenDaysAgo },
    }).sort({ confidence: -1, lastObserved: -1 }).limit(5).lean().catch(() => []),
    IdentityMemory.find({
      user: userId,
      status: 'active',
      confidence: { $gte: 0.6 },
    }).sort({ confidence: -1, lastReinforced: -1 }).limit(4).lean().catch(() => []),
    LongTermGoal.find({ user: userId, isActive: true }).select('name category goalType currentStreak targetDays').limit(5).lean().catch(() => []),
    Habit.find({ user: userId, isActive: true }).select('name streak frequency category').limit(8).lean().catch(() => []),
    NutritionLog.findOne({ user: userId, date: { $gte: oneDayAgo } }).sort({ date: -1 }).lean().catch(() => null),
    Workout.findOne({ user: userId, date: { $gte: oneDayAgo } }).sort({ date: -1 }).lean().catch(() => null),
    MentalLog.findOne({ user: userId, date: { $gte: oneDayAgo } }).sort({ date: -1 }).lean().catch(() => null),
  ];

  // Mode-specific queries — only fetched when relevant.
  const fitnessQuery = mode === 'fitness'
    ? Workout.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).limit(7).lean().catch(() => [])
    : Promise.resolve([]);
  const medicalSymptomsQuery = mode === 'medical'
    ? SymptomLog.find({ user: userId }).sort({ date: -1 }).limit(8).lean().catch(() => [])
    : Promise.resolve([]);
  const medicalLabsQuery = mode === 'medical'
    ? LabReport.find({ user: userId }).sort({ date: -1 }).limit(2).lean().catch(() => [])
    : Promise.resolve([]);
  const therapyMentalQuery = mode === 'therapy'
    ? MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: 1 }).lean().catch(() => [])
    : Promise.resolve([]);

  const [
    dls, patterns, identity, goals, habits, todayNutrition, lastWorkout, recentMental,
    weekWorkouts, weekSymptoms, recentLabs, weekMental,
  ] = await Promise.all([...baseQueries, fitnessQuery, medicalSymptomsQuery, medicalLabsQuery, therapyMentalQuery]);

  const bundle = {
    dayKey,
    mode,
    dailyLifeState: dls ? {
      summaryState: dls.summaryState?.label || 'unknown',
      summaryConfidence: Math.round((dls.summaryState?.confidence || 0) * 100) / 100,
      reasons: (dls.summaryState?.reasons || []).slice(0, 3),
      readiness: typeof dls.metrics?.readinessScore === 'number' ? Math.round(dls.metrics.readinessScore * 10) / 10 : null,
      signals: {
        sleep: summarizeSignal(dls.signals?.sleep),
        stress: summarizeSignal(dls.signals?.stress),
        energy: summarizeSignal(dls.signals?.energy),
        nutrition: summarizeSignal(dls.signals?.nutrition),
        trainingLoad: summarizeSignal(dls.signals?.trainingLoad),
        mood: summarizeSignal(dls.signals?.mood),
      },
    } : null,
    identity: identity.map((i) => ({
      key: i.identityKey,
      claim: i.claim,
      confidence: Math.round(i.confidence * 100) / 100,
      stability: Math.round((i.stabilityScore || 0) * 100) / 100,
    })),
    patterns: patterns.map((p) => ({
      conditions: p.conditions || [],
      effect: p.effect,
      confidence: Math.round(p.confidence * 100) / 100,
      supportCount: p.supportCount,
      window: p.window,
    })),
    longTermGoals: goals.map((g) => ({
      name: g.name,
      category: g.category,
      goalType: g.goalType,
      currentStreak: g.currentStreak || 0,
      targetDays: g.targetDays,
    })),
    habits: habits.map((h) => ({
      name: h.name,
      streak: h.streak || 0,
      frequency: h.frequency,
      category: h.category,
    })),
    recent: {
      nutritionTotals: todayNutrition ? {
        calories: Math.round(todayNutrition.dailyTotals?.calories || 0),
        protein: Math.round(todayNutrition.dailyTotals?.protein || 0),
        carbs: Math.round(todayNutrition.dailyTotals?.carbs || 0),
        fat: Math.round(todayNutrition.dailyTotals?.fat || 0),
        fiber: Math.round(todayNutrition.dailyTotals?.fiber || 0),
        mealCount: todayNutrition.meals?.length || 0,
        waterMl: todayNutrition.waterIntake || 0,
      } : null,
      lastWorkout: lastWorkout ? {
        name: lastWorkout.name,
        date: lastWorkout.date,
        durationSec: lastWorkout.duration || 0,
        exerciseCount: (lastWorkout.exercises || []).length,
      } : null,
      lastMental: recentMental ? {
        moodScore: recentMental.moodScore || null,
        stressLevel: recentMental.stressLevel || null,
        energyLevel: recentMental.energyLevel || null,
        sleepHours: recentMental.sleepHours || null,
      } : null,
    },
    modeData: {
      // Fitness: surface 7-day workout volume + PR progress
      weekWorkouts: weekWorkouts.map((w) => {
        const totalVol = (w.exercises || []).reduce((sum, ex) =>
          sum + ((ex.sets || []).reduce((s, st) => s + ((st.reps || 0) * (st.weight || 0)), 0)), 0);
        return {
          name: w.name || 'session',
          date: w.date,
          exerciseCount: (w.exercises || []).length,
          totalVolume: Math.round(totalVol),
        };
      }),
      // Medical: symptoms + abnormal labs
      symptoms: weekSymptoms.map((s) => ({
        name: s.symptomName,
        severity: s.severity,
        date: s.date,
        notes: s.notes ? String(s.notes).slice(0, 80) : null,
      })),
      labs: recentLabs.map((l) => ({
        panelName: l.panelName,
        date: l.date,
        abnormal: (l.results || [])
          .filter((r) => r && (r.flag === 'high' || r.flag === 'low'))
          .slice(0, 6)
          .map((r) => ({ name: r.name, value: r.value, unit: r.unit, flag: r.flag })),
      })),
      // Therapy: 7-day mood/stress/sleep arc
      moodArc: weekMental.map((m) => ({
        date: m.date,
        mood: m.moodScore || null,
        stress: m.stressLevel || null,
        sleep: m.sleepHours || null,
      })),
    },
  };

  cachePut(userId, mode, bundle);
  return bundle;
}

/**
 * Render the bundle as a compact text block suitable for inclusion in a system prompt.
 * Returns null if the bundle is empty / has no useful signals.
 */
function renderBundleAsText(bundle) {
  if (!bundle) return null;
  const lines = [];

  if (bundle.dailyLifeState) {
    const dls = bundle.dailyLifeState;
    lines.push(`Today (${bundle.dayKey}): summaryState=${dls.summaryState} (conf ${dls.summaryConfidence}); readiness=${dls.readiness ?? 'n/a'}.`);
    const sig = dls.signals;
    const sigParts = [];
    if (sig.sleep) sigParts.push(`sleep ${sig.sleep.value}/1.0`);
    if (sig.stress) sigParts.push(`stress ${sig.stress.value}/1.0`);
    if (sig.energy) sigParts.push(`energy ${sig.energy.value}/1.0`);
    if (sig.nutrition) sigParts.push(`nutrition ${sig.nutrition.value}/1.0`);
    if (sig.trainingLoad) sigParts.push(`training-load ${sig.trainingLoad.value}/1.0`);
    if (sigParts.length) lines.push(`Normalized signals: ${sigParts.join(', ')}.`);
    if (dls.reasons.length) lines.push(`Reasons: ${dls.reasons.join('; ')}.`);
  } else {
    lines.push(`Today (${bundle.dayKey}): no DailyLifeState yet (insufficient data).`);
  }

  if (bundle.identity?.length) {
    const iStr = bundle.identity
      .map((i) => `${i.key} (conf ${i.confidence}, stable ${i.stability}): ${i.claim}`)
      .join(' | ');
    lines.push(`Identity claims: ${iStr}.`);
  }

  if (bundle.patterns?.length) {
    const pStr = bundle.patterns
      .map((p) => `[${(p.conditions || []).join('+')} → ${p.effect}, conf ${p.confidence}, n=${p.supportCount}]`)
      .join(' ');
    lines.push(`Active patterns (last 7d): ${pStr}`);
  }

  if (bundle.longTermGoals?.length) {
    const gStr = bundle.longTermGoals.map((g) => `${g.name} (${g.goalType}, streak ${g.currentStreak}/${g.targetDays})`).join('; ');
    lines.push(`Active long-term goals: ${gStr}.`);
  }

  if (bundle.habits?.length) {
    const hStr = bundle.habits.map((h) => `${h.name} (streak ${h.streak})`).join('; ');
    lines.push(`Active habits: ${hStr}.`);
  }

  const r = bundle.recent;
  if (r?.nutritionTotals) {
    const n = r.nutritionTotals;
    lines.push(`Today's nutrition (${n.mealCount} meal${n.mealCount === 1 ? '' : 's'}): ${n.calories} kcal, ${n.protein}g P, ${n.carbs}g C, ${n.fat}g F, ${n.fiber}g fiber, ${n.waterMl}ml water.`);
  }
  if (r?.lastWorkout) {
    const w = r.lastWorkout;
    const ago = w.date ? Math.round((Date.now() - new Date(w.date).getTime()) / (60 * 60 * 1000)) : null;
    lines.push(`Last workout: "${w.name}", ${w.exerciseCount} exercises${ago != null ? `, ${ago}h ago` : ''}.`);
  }
  if (r?.lastMental) {
    const m = r.lastMental;
    const parts = [];
    if (m.moodScore) parts.push(`mood ${m.moodScore}/10`);
    if (m.stressLevel) parts.push(`stress ${m.stressLevel}/10`);
    if (m.energyLevel) parts.push(`energy ${m.energyLevel}/10`);
    if (m.sleepHours) parts.push(`sleep ${m.sleepHours}h`);
    if (parts.length) lines.push(`Last wellness check-in: ${parts.join(', ')}.`);
  }

  // Mode-specific sections
  const md = bundle.modeData || {};

  if (bundle.mode === 'fitness' && md.weekWorkouts?.length) {
    const wStr = md.weekWorkouts
      .map((w) => `${new Date(w.date).toISOString().slice(0, 10)} ${w.name} (${w.exerciseCount}ex, vol ${w.totalVolume})`)
      .join(' | ');
    lines.push(`Last 7 workouts: ${wStr}.`);
  }

  if (bundle.mode === 'medical') {
    if (md.symptoms?.length) {
      const sStr = md.symptoms.slice(0, 5)
        .map((s) => {
          const day = s.date ? new Date(s.date).toISOString().slice(0, 10) : 'unknown';
          return `${day}: ${s.name} (sev ${s.severity ?? 'n/a'}${s.notes ? ` — ${s.notes}` : ''})`;
        })
        .join(' | ');
      lines.push(`Recent symptoms: ${sStr}.`);
    }
    if (md.labs?.length && md.labs[0].abnormal?.length) {
      const lab = md.labs[0];
      const day = lab.date ? new Date(lab.date).toISOString().slice(0, 10) : 'unknown';
      const ab = lab.abnormal.map((r) => `${r.name}: ${r.value}${r.unit || ''} (${r.flag})`).join(', ');
      lines.push(`Latest labs (${lab.panelName || 'panel'}, ${day}) abnormal: ${ab}.`);
    }
  }

  if (bundle.mode === 'therapy' && md.moodArc?.length) {
    const arc = md.moodArc
      .filter((m) => m.mood || m.stress || m.sleep)
      .slice(-7)
      .map((m) => {
        const day = m.date ? new Date(m.date).toISOString().slice(5, 10) : '?';
        const parts = [];
        if (m.mood) parts.push(`m${m.mood}`);
        if (m.stress) parts.push(`s${m.stress}`);
        if (m.sleep) parts.push(`sl${m.sleep}h`);
        return `${day}[${parts.join('/')}]`;
      })
      .join(' ');
    if (arc) lines.push(`7-day mood/stress/sleep arc: ${arc}.`);
  }

  if (lines.length === 0) return null;
  return lines.join('\n');
}

function clearCache(userId) {
  if (userId) {
    // Clear all mode entries for this user
    const prefix = `${String(userId)}|`;
    for (const k of cache.keys()) {
      if (k.startsWith(prefix)) cache.delete(k);
    }
  } else {
    cache.clear();
  }
}

module.exports = { buildUserContextBundle, renderBundleAsText, clearCache };
