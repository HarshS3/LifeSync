/**
 * chatThreadService — server-side persistence for AI chat history.
 *
 * Replaces the previous "client sends last 10 turns" pattern. The mobile/web
 * client now opens a thread and the server stores the full ordered turn list,
 * trimming to MAX_TURNS verbatim and summarizing the rest into `summary`.
 *
 * Summarization itself is NOT yet wired (it will use the LLM client). For now,
 * older turns are simply truncated past MAX_TURNS — visible turns stay accurate;
 * earlier context is dropped rather than fabricated.
 */

const ChatThread = require('../../models/ChatThread');

const MAX_TURNS = 50;

async function getOrCreateThread({ userId, threadId }) {
  if (!userId) throw new Error('userId is required');

  if (threadId) {
    const existing = await ChatThread.findOne({ _id: threadId, user: userId });
    if (existing) return existing;
  }

  // Default: fall back to the most recent active thread, or create a new one.
  const recent = await ChatThread.findOne({ user: userId, isActive: true }).sort({ lastActiveAt: -1 });
  if (recent) return recent;

  return ChatThread.create({
    user: userId,
    title: new Date().toISOString().slice(0, 10),
    turns: [],
    summary: '',
    lastActiveAt: new Date(),
  });
}

async function appendTurn({ thread, role, content, meta }) {
  if (!thread || !role || !content) return thread;
  thread.turns.push({ role, content: String(content).slice(0, 8000), createdAt: new Date(), meta: meta || {} });
  thread.lastActiveAt = new Date();

  if (thread.turns.length > MAX_TURNS) {
    // Drop oldest turns past MAX_TURNS. Future: summarize the dropped chunk into thread.summary.
    const drop = thread.turns.length - MAX_TURNS;
    thread.turns.splice(0, drop);
  }

  await thread.save();
  return thread;
}

/**
 * Returns the recent turn slice in the {role, content} shape generateLLMReply expects.
 * Excludes the most recent user message if `excludeLast` is true (caller is about to
 * send it as the new user prompt).
 */
function toLLMHistory(thread, { excludeLast = false } = {}) {
  if (!thread || !Array.isArray(thread.turns)) return [];
  const turns = thread.turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .map((t) => ({ role: t.role, content: t.content }));
  return excludeLast ? turns.slice(0, -1) : turns;
}

async function listThreads(userId, { limit = 20 } = {}) {
  return ChatThread.find({ user: userId, isActive: true })
    .sort({ lastActiveAt: -1 })
    .select('_id title summary lastActiveAt createdAt')
    .limit(limit)
    .lean();
}

async function archiveThread({ userId, threadId }) {
  return ChatThread.findOneAndUpdate(
    { _id: threadId, user: userId },
    { $set: { isActive: false } },
    { new: true }
  );
}

module.exports = { getOrCreateThread, appendTurn, toLLMHistory, listThreads, archiveThread, MAX_TURNS };
