/**
 * morningBrief — proactive 3-line briefing the assistant can deliver as the
 * first turn of the day, instead of waiting for the user to ask.
 *
 * Composition (deterministic, no LLM call):
 *   1. State line   — today's DLS summaryState + readiness ("Recovery 7.2/10")
 *   2. Insight line — top 1-2 cross-domain insights from selectTopInsights
 *   3. Action line  — most relevant next step from goals/habits/insights
 *
 * Returns { brief: string, parts: { state, insight, action }, computedAt }.
 * Returns null brief when there's not enough data to say anything meaningful.
 */

const DailyLifeState = require('../../models/DailyLifeState');
const { LongTermGoal } = require('../../models/LongTermGoal');
const { Habit } = require('../../models/Habit');
const { selectTopInsights } = require('../insightSelector/crossDomainInsightSelector');
const { dayKeyFromDate } = require('../dailyLifeState/dayKey');

function timeOfDayGreeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function readinessTag(score) {
  if (score == null) return null;
  if (score >= 8) return 'high';
  if (score >= 6.5) return 'solid';
  if (score >= 5) return 'moderate';
  if (score >= 3.5) return 'low';
  return 'depleted';
}

function buildStateLine({ user, dls, greeting }) {
  const firstName = user?.name?.split(' ')[0] || 'there';
  if (!dls) {
    return `${greeting}, ${firstName} — not enough data yet to read today, but I'll learn as you log.`;
  }
  const readiness = typeof dls.metrics?.readinessScore === 'number'
    ? Math.round(dls.metrics.readinessScore * 10) / 10
    : null;
  const label = dls.summaryState?.label || 'unknown';
  const tag = readinessTag(readiness);

  if (label === 'depleted' || tag === 'depleted') {
    return `${greeting}, ${firstName} — you're running depleted (readiness ${readiness ?? 'low'}/10). Today calls for recovery, not a push.`;
  }
  if (label === 'overloaded') {
    return `${greeting}, ${firstName} — your load is high (readiness ${readiness ?? 'n/a'}/10). Easy day or rest is the high-leverage move.`;
  }
  if (label === 'recovering') {
    return `${greeting}, ${firstName} — you're recovering well (readiness ${readiness ?? 'n/a'}/10). Light-to-moderate work today should compound nicely.`;
  }
  if (label === 'stable') {
    return `${greeting}, ${firstName} — you're stable today (readiness ${readiness ?? 'n/a'}/10). Good window to push something hard.`;
  }
  return `${greeting}, ${firstName} — readiness ${readiness ?? 'n/a'}/10 (${label}).`;
}

function buildInsightLine(insights) {
  if (!Array.isArray(insights) || insights.length === 0) return null;
  const top = insights[0];
  if (!top?.title) return null;
  // Use the detail when concise, otherwise just the title.
  const detail = top.detail && top.detail.length < 180 ? top.detail : null;
  if (detail) return `Pattern to watch: ${top.title}. ${detail}`;
  return `Pattern to watch: ${top.title}.`;
}

function buildActionLine({ insights, habits, goals }) {
  // Prefer an actionable insight first.
  const firstAction = insights?.find((i) => i.action && i.action.trim());
  if (firstAction) return `Today's move: ${firstAction.action.trim()}`;

  // Fall back to habit / goal nudges.
  const goalNudge = goals?.find((g) => g.currentStreak > 0);
  if (goalNudge) {
    return `Today's move: keep your "${goalNudge.name}" streak alive (day ${goalNudge.currentStreak}${goalNudge.targetDays ? `/${goalNudge.targetDays}` : ''}).`;
  }

  const topHabit = habits?.find((h) => h.streak > 0);
  if (topHabit) {
    return `Today's move: don't break your "${topHabit.name}" streak (${topHabit.streak} days).`;
  }

  return null;
}

async function buildMorningBrief({ userId, user }) {
  if (!userId) return { brief: null, parts: {}, computedAt: new Date() };

  const dayKey = dayKeyFromDate(new Date());

  const [dls, insights, goals, habits] = await Promise.all([
    DailyLifeState.findOne({ user: userId, dayKey }).lean().catch(() => null),
    selectTopInsights(userId, { limit: 3 }).catch(() => []),
    LongTermGoal.find({ user: userId, isActive: true })
      .select('name currentStreak targetDays goalType')
      .sort({ currentStreak: -1 })
      .limit(3).lean().catch(() => []),
    Habit.find({ user: userId, isActive: true })
      .select('name streak')
      .sort({ streak: -1 })
      .limit(3).lean().catch(() => []),
  ]);

  const greeting = timeOfDayGreeting();
  const stateLine = buildStateLine({ user, dls, greeting });
  const insightLine = buildInsightLine(insights);
  const actionLine = buildActionLine({ insights, habits, goals });

  const parts = { state: stateLine, insight: insightLine, action: actionLine };
  const brief = [stateLine, insightLine, actionLine].filter(Boolean).join('\n\n');

  return {
    brief: brief || null,
    parts,
    insightsCount: Array.isArray(insights) ? insights.length : 0,
    computedAt: new Date(),
    dayKey,
  };
}

module.exports = { buildMorningBrief };
