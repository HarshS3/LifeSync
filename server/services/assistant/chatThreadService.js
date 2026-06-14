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
  if (!thread || !role) return thread;
  // Persist even when content is empty so the transcript matches what the user
  // saw on screen — record an explicit placeholder so the LLM can see that a
  // turn happened and isn't confused on the next round.
  const safeContent = String(content || '').trim() || '[empty response]';
  thread.turns.push({ role, content: safeContent.slice(0, 8000), createdAt: new Date(), meta: meta || {} });
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
 *
 * `excludeMessage` lets the caller specify the *exact* user message they're
 * about to send so we strip it explicitly. This avoids the bug where a blind
 * `slice(-1)` could drop an assistant turn from a concurrent request instead
 * of the user turn we just appended.
 */
function toLLMHistory(thread, { excludeMessage = null } = {}) {
  if (!thread || !Array.isArray(thread.turns)) return [];
  const turns = thread.turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .map((t) => ({ role: t.role, content: t.content }));

  if (!excludeMessage) return turns;

  // Walk backwards and drop the most recent user turn whose content matches.
  // If we don't find a match (rare race), fall back to the unchanged history.
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === 'user' && turns[i].content === excludeMessage) {
      return turns.slice(0, i).concat(turns.slice(i + 1));
    }
  }
  return turns;
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
