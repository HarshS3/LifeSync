/**
 * Hypothesis lifecycle worker.
 *
 * Runs after a daily recompute. Right now its job is:
 *   1. Stamp lastEvaluatedAt on open hypotheses we touched.
 *   2. Archive hypotheses that have been untouched for STALE_DAYS days.
 *
 * Cross-domain hypothesis *generation* (turning a fresh PatternMemory match into
 * an open hypothesis) will be added by the cross-domain insight pipeline. This
 * module deliberately does not generate — it only manages the lifecycle of
 * hypotheses already in the collection so they don't accumulate forever.
 */

const Hypothesis = require('../../models/nutritionKnowledge/Hypothesis');

const STALE_DAYS = 30;

async function archiveStaleHypotheses(userId) {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  const filter = {
    user: userId,
    status: { $in: ['proposed', 'testing'] },
    $or: [
      { lastEvaluatedAt: { $lt: cutoff } },
      // Hypotheses never evaluated, created more than STALE_DAYS ago.
      { lastEvaluatedAt: null, createdAt: { $lt: cutoff } },
    ],
  };
  const res = await Hypothesis.updateMany(filter, {
    $set: { status: 'archived', lastEvaluatedAt: new Date() },
  });
  return res?.modifiedCount || 0;
}

async function evaluateHypothesesForDay({ userId, dayKey }) {
  if (!userId) return { archived: 0 };
  try {
    const archived = await archiveStaleHypotheses(userId);
    return { archived, dayKey };
  } catch (err) {
    console.warn('[hypothesisLifecycle] evaluate failed:', err.message);
    return { archived: 0, error: err.message };
  }
}

module.exports = { evaluateHypothesesForDay, archiveStaleHypotheses, STALE_DAYS };
