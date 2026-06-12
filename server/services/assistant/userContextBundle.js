/**
 * userContextBundle
 *
 * Returns a compact, structured snapshot of the user's *derived* signals so the
 * AI assistant can ground its replies in real data instead of generic LLM knowledge.
 *
 * Includes:
 *   - today's DailyLifeState (summaryState label + per-signal value/confidence)
 *   - top active PatternMemory rows (last 7 days, confidence ≥ 0.55)
 *   - active LongTermGoal + Habit lists (names + streaks)
 *   - last 24h logs (nutrition totals, last workout summary, last MentalLog)
 *
 * Cached in-memory for 60s per user. The bundle is small (a few KB serialized);
 * the cache exists to avoid repeated DB hits when a chat session sends multiple
 * turns in quick succession.
 */

const DailyLifeState = require('../../models/DailyLifeState');
const PatternMemory = require('../../models/PatternMemory');
const { LongTermGoal } = require('../../models/LongTermGoal');
const { Habit } = require('../../models/Habit');
const { NutritionLog, MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const { dayKeyFromDate } = require('../dailyLifeState/dayKey');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // userId -> { expiresAt, bundle }

function cacheGet(userId) {
  const entry = cache.get(String(userId));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(String(userId));
    return null;
  }
  return entry.bundle;
}

function cachePut(userId, bundle) {
  cache.set(String(userId), { expiresAt: Date.now() + CACHE_TTL_MS, bundle });
}

function summarizeSignal(s) {
  if (!s || typeof s.value !== 'number') return null;
  return { value: Math.round(s.value * 100) / 100, confidence: Math.round((s.confidence || 0) * 100) / 100 };
}

async function buildUserContextBundle(userId) {
  if (!userId) return null;
  const cached = cacheGet(userId);
  if (cached) return cached;

  const now = new Date();
  const dayKey = dayKeyFromDate(now);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [dls, patterns, goals, habits, todayNutrition, lastWorkout, recentMental] = await Promise.all([
    DailyLifeState.findOne({ user: userId, dayKey }).lean().catch(() => null),
    PatternMemory.find({
      user: userId,
      status: 'active',
      confidence: { $gte: 0.55 },
      lastObserved: { $gte: sevenDaysAgo },
    }).sort({ confidence: -1, lastObserved: -1 }).limit(5).lean().catch(() => []),
    LongTermGoal.find({ user: userId, isActive: true }).select('name category goalType currentStreak targetDays').limit(5).lean().catch(() => []),
    Habit.find({ user: userId, isActive: true }).select('name streak frequency category').limit(8).lean().catch(() => []),
    NutritionLog.findOne({ user: userId, date: { $gte: oneDayAgo } }).sort({ date: -1 }).lean().catch(() => null),
    Workout.findOne({ user: userId, date: { $gte: oneDayAgo } }).sort({ date: -1 }).lean().catch(() => null),
    MentalLog.findOne({ user: userId, date: { $gte: oneDayAgo } }).sort({ date: -1 }).lean().catch(() => null),
  ]);

  const bundle = {
    dayKey,
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
  };

  cachePut(userId, bundle);
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

  if (bundle.patterns.length) {
    const pStr = bundle.patterns
      .map((p) => `[${(p.conditions || []).join('+')} → ${p.effect}, conf ${p.confidence}, n=${p.supportCount}]`)
      .join(' ');
    lines.push(`Active patterns (last 7d): ${pStr}`);
  }

  if (bundle.longTermGoals.length) {
    const gStr = bundle.longTermGoals.map((g) => `${g.name} (${g.goalType}, streak ${g.currentStreak}/${g.targetDays})`).join('; ');
    lines.push(`Active long-term goals: ${gStr}.`);
  }

  if (bundle.habits.length) {
    const hStr = bundle.habits.map((h) => `${h.name} (streak ${h.streak})`).join('; ');
    lines.push(`Active habits: ${hStr}.`);
  }

  const r = bundle.recent;
  if (r.nutritionTotals) {
    const n = r.nutritionTotals;
    lines.push(`Today's nutrition (${n.mealCount} meal${n.mealCount === 1 ? '' : 's'}): ${n.calories} kcal, ${n.protein}g P, ${n.carbs}g C, ${n.fat}g F, ${n.fiber}g fiber, ${n.waterMl}ml water.`);
  }
  if (r.lastWorkout) {
    const w = r.lastWorkout;
    const ago = w.date ? Math.round((Date.now() - new Date(w.date).getTime()) / (60 * 60 * 1000)) : null;
    lines.push(`Last workout: "${w.name}", ${w.exerciseCount} exercises, ${ago != null ? `${ago}h ago` : 'recent'}.`);
  }
  if (r.lastMental) {
    const m = r.lastMental;
    const parts = [];
    if (m.moodScore) parts.push(`mood ${m.moodScore}/10`);
    if (m.stressLevel) parts.push(`stress ${m.stressLevel}/10`);
    if (m.energyLevel) parts.push(`energy ${m.energyLevel}/10`);
    if (m.sleepHours) parts.push(`sleep ${m.sleepHours}h`);
    if (parts.length) lines.push(`Last wellness check-in: ${parts.join(', ')}.`);
  }

  if (lines.length === 0) return null;
  return lines.join('\n');
}

function clearCache(userId) {
  if (userId) cache.delete(String(userId));
  else cache.clear();
}

module.exports = { buildUserContextBundle, renderBundleAsText, clearCache };
