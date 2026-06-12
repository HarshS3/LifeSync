/**
 * commitmentService — single home for streak/log logic on Commitment + CommitmentLog.
 *
 * The kind-specific bits (status counters for long_term_goal, completion bool for habit)
 * are interpreted by `dayCounts` so streak math is uniform.
 */

const { Commitment, CommitmentLog } = require('../../models/Commitment');

function normalizeDate(d) {
  const out = new Date(d || Date.now());
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Does this log represent a "kept" day for streak purposes?
 *   - habit:           completed === true
 *   - long_term_goal:  status in ('success', 'partial')  (relapse breaks; skip is neutral but doesn't extend)
 */
function isKeptDay({ kind, log }) {
  if (kind === 'habit') return Boolean(log?.completed);
  if (kind === 'long_term_goal') return log?.status === 'success' || log?.status === 'partial';
  return false;
}

function isBreakingDay({ kind, log }) {
  if (kind === 'habit') return false; // missing days break, but we evaluate by presence
  if (kind === 'long_term_goal') return log?.status === 'relapse';
  return false;
}

async function recomputeStreak(commitmentId) {
  const c = await Commitment.findById(commitmentId);
  if (!c) return null;

  // Walk backwards from today to find the current streak.
  const today = normalizeDate(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  // Pull recent logs (we don't need the whole history for current streak).
  const recent = await CommitmentLog.find({ commitment: commitmentId })
    .sort({ date: -1 })
    .limit(400)
    .lean();

  if (recent.length === 0) {
    c.currentStreak = 0;
    await c.save();
    return c;
  }

  // For long_term_goal: simple — relapse resets, success/partial extends, skip does nothing.
  // For habit: extend per consecutive completed day starting from today/yesterday backwards.
  let streak = 0;
  let cursor = today;

  if (c.kind === 'long_term_goal') {
    // Sort desc by date, count consecutive non-relapse days starting from the most recent log.
    const sorted = recent.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const log of sorted) {
      if (isBreakingDay({ kind: c.kind, log })) break;
      if (isKeptDay({ kind: c.kind, log })) streak++;
      // skip days don't extend or break — keep walking
    }
  } else {
    // habit: walk consecutive days backwards. Allow today missing if yesterday is kept.
    const byDay = new Map();
    for (const l of recent) byDay.set(normalizeDate(l.date).getTime(), l);

    const todayLog = byDay.get(today.getTime());
    const yesterdayLog = byDay.get(yesterday.getTime());

    if (!isKeptDay({ kind: c.kind, log: todayLog }) && !isKeptDay({ kind: c.kind, log: yesterdayLog })) {
      streak = 0;
    } else {
      cursor = isKeptDay({ kind: c.kind, log: todayLog }) ? today : yesterday;
      while (true) {
        const log = byDay.get(cursor.getTime());
        if (!isKeptDay({ kind: c.kind, log })) break;
        streak++;
        cursor = new Date(cursor); cursor.setDate(cursor.getDate() - 1);
      }
    }
  }

  c.currentStreak = streak;
  if (streak > c.longestStreak) c.longestStreak = streak;
  await c.save();
  return c;
}

async function listActive(userId, { kind } = {}) {
  const filter = { user: userId, isActive: true };
  if (kind) filter.kind = kind;
  return Commitment.find(filter).sort({ createdAt: -1 }).lean();
}

async function createCommitment(userId, data) {
  if (!data?.kind) throw Object.assign(new Error('kind is required'), { status: 400 });
  if (!data?.name) throw Object.assign(new Error('name is required'), { status: 400 });
  return Commitment.create({ ...data, user: userId });
}

async function updateCommitment(userId, id, patch) {
  return Commitment.findOneAndUpdate({ _id: id, user: userId }, patch, { new: true });
}

async function archiveCommitment(userId, id) {
  return Commitment.findOneAndUpdate({ _id: id, user: userId }, { isActive: false }, { new: true });
}

/**
 * Upsert a daily log. Recomputes streak afterwards and (for long_term_goal) bumps totalRelapses.
 */
async function upsertLog({ userId, commitmentId, date, payload }) {
  const c = await Commitment.findOne({ _id: commitmentId, user: userId });
  if (!c) throw Object.assign(new Error('Commitment not found'), { status: 404 });

  const normalized = normalizeDate(date);
  const update = { user: userId, commitment: commitmentId, date: normalized, ...payload };
  const log = await CommitmentLog.findOneAndUpdate(
    { user: userId, commitment: commitmentId, date: normalized },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (c.kind === 'long_term_goal' && payload?.status === 'relapse') {
    c.totalRelapses = (c.totalRelapses || 0) + 1;
    await c.save();
  }

  await recomputeStreak(commitmentId);
  return CommitmentLog.findById(log._id).populate('commitment').lean();
}

async function listLogs({ userId, commitmentId, start, end, limit = 90 }) {
  const filter = { user: userId };
  if (commitmentId) filter.commitment = commitmentId;
  if (start || end) {
    filter.date = {};
    if (start) filter.date.$gte = normalizeDate(start);
    if (end) filter.date.$lte = normalizeDate(end);
  }
  return CommitmentLog.find(filter).sort({ date: -1 }).limit(limit).populate('commitment').lean();
}

module.exports = {
  listActive,
  createCommitment,
  updateCommitment,
  archiveCommitment,
  upsertLog,
  listLogs,
  recomputeStreak,
};
