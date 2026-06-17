const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateLLMReply } = require('../aiClient');
const { runHealthTriage } = require('../services/safety/healthTriageEngine');
const { applyTriageGate } = require('../services/safety/triageRenderer');
const { detectAssistantMode } = require('../services/assistant/router');
const { buildSystemPrompt } = require('../services/assistant/prompts');
const { buildUserContextBundle, renderBundleAsText, clearCache: clearUserContextCache } = require('../services/assistant/userContextBundle');
const { getOrCreateThread, appendTurn, toLLMHistory, listThreads, archiveThread } = require('../services/assistant/chatThreadService');
const { fetchTextbookRag } = require('../services/ragClient');
const { selectTopInsights } = require('../services/insightSelector/crossDomainInsightSelector');
const { ingestFromChat } = require('../services/chatIngestion/ingestFromChat');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');
const { buildMorningBrief } = require('../services/assistant/morningBrief');

// ── Light intent helpers used in the chat path ────────────────────────────────

function normalizeForIntent(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGreetingOnly(message) {
  const s = normalizeForIntent(message);
  if (!s) return false;
  return /^(hi|hello|hey|yo|hola|sup|good\s+(morning|afternoon|evening))$/.test(s);
}

// Stripping markdown from LLM output. The model is instructed not to emit it,
// but Gemini and Llama leak ** _ # - * frequently. Plain-text UIs render the
// raw tokens otherwise.
function stripMarkdown(text) {
  if (!text) return text;
  return String(text)
    // bold **/__ and italics * / _ — strip the markers, keep the text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/(?<![a-zA-Z0-9_])_([^_\n]+)_(?![a-zA-Z0-9_])/g, '$1')
    // headers at line start
    .replace(/^#{1,6}\s+/gm, '')
    // list bullets at line start (- * +) followed by space
    .replace(/^\s*[-*+]\s+/gm, '')
    // numbered lists like "1. " at line start
    .replace(/^\s*\d+\.\s+/gm, '')
    // links [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // inline code `text` → text
    .replace(/`([^`]+)`/g, '$1')
    // code fences (rare in chat)
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '');
}

const router = express.Router();

// Helper to extract user from token (used by chat + threads endpoints)
const getUserFromToken = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[AI Auth] JWT_SECRET is not defined in environment variables');
      return null;
    }
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select('-password');
    return user;
  } catch (err) {
    console.log('[AI Auth] Token verification failed:', err.message);
    return null;
  }
};

// Render the top cross-domain insights as a compact text block. Returns null
// if no insights pass the relevance/confidence bar.
function renderInsightsAsText(insights) {
  if (!Array.isArray(insights) || insights.length === 0) return null;
  const lines = ['Top cross-domain insights:'];
  insights.forEach((ins, i) => {
    const impact = ins.impact ? `${ins.impact}` : 'moderate';
    const detail = ins.detail ? ` — ${ins.detail}` : '';
    const action = ins.action ? ` | action: ${ins.action}` : '';
    lines.push(`${i + 1}. ${ins.title} [${impact}, score ${ins.score ?? 'n/a'}]${detail}${action}`);
  });
  return lines.join('\n');
}

// Find the most recent assistant turn's persisted risk level so we can
// suppress duplicate triage prepending.
function priorRiskFromThread(thread) {
  if (!thread?.turns) return null;
  for (let i = thread.turns.length - 1; i >= 0; i--) {
    const t = thread.turns[i];
    if (t.role === 'assistant' && t.meta?.riskLevel) return t.meta.riskLevel;
  }
  return null;
}

// ─── Main chat endpoint ──────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, threadId } = req.body;

    // --- Input validation ---
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });
    }
    if (threadId && (typeof threadId !== 'string' || threadId.length > 100)) {
      return res.status(400).json({ error: 'Invalid threadId.' });
    }

    const mode = detectAssistantMode({ message });

    // Auth (greetings are allowed without sign-in).
    const user = await getUserFromToken(req);
    const userId = user?._id;

    if (!userId && !isGreetingOnly(message)) {
      return res.status(401).json({
        error: 'Authentication required',
        reply: 'Please sign in to your LifeSync account so I can provide personalized insights and log your progress.',
      });
    }

    console.log(`[AI Chat] mode=${mode} userId=${userId || 'public'} msgLen=${message.length}`);

    // --- Greeting fast path (no LLM, no thread persistence) ---
    if (isGreetingOnly(message)) {
      const greeting = userId
        ? `Hi ${user?.name?.split(' ')[0] || 'there'} — how can I support you today?`
        : 'Hi! How can I support you today?';
      return res.json({
        message, mode, reply: greeting,
        safety: { risk_level: 'none' },
        threadId: null,
      });
    }

    // --- Chat ingestion (auth-gated) ---
    let chatIngestion = { ingested: false, dayKey: null, updates: [], foodIngestion: null };
    if (userId) {
      try {
        chatIngestion = await ingestFromChat({ userId, message });
        console.log(`[AI Chat] ingestion handled=${chatIngestion?.foodIngestion?.handled || false} logged=${chatIngestion?.foodIngestion?.foodLogged || false}`);
        if (chatIngestion?.ingested) {
          // Bust the bundle cache SYNCHRONOUSLY so the very same turn sees fresh data,
          // not just future turns. triggerDailyLifeStateRecompute ALSO clears the cache
          // but it's setImmediate-deferred, which leaves a race window.
          try { clearUserContextCache(userId); } catch (_) {}
          triggerDailyLifeStateRecompute({ userId, date: new Date(), reason: 'chat_ingestion' });
        }
      } catch (e) {
        console.error('[Ingestion Error]', e.message || e);
        chatIngestion = { ingested: false, dayKey: null, updates: [], foodIngestion: null, error: 'ingestion_failed' };
      }
    }

    // --- Short-circuit: nutrition agent handled the message ---
    if (chatIngestion?.foodIngestion?.handled && chatIngestion?.foodIngestion?.agentReply) {
      return res.json({
        message,
        mode: 'nutrition',
        reply: chatIngestion.foodIngestion.agentReply,
        foodLogged: chatIngestion.foodIngestion.foodLogged || false,
        committedMealId: chatIngestion.foodIngestion.committedMealId || null,
        safety: { risk_level: 'none' },
        threadId: null,
      });
    }

    // --- Safety triage runs FIRST so it can gate the LLM ---
    const safety = runHealthTriage({ message, user });

    // --- Optional textbook RAG for medical mode ---
    let rag = null;
    if (mode === 'medical') {
      try {
        rag = await fetchTextbookRag({
          question: message,
          userProfile: user ? {
            age: user.age, gender: user.gender,
            allergies: user.allergies, conditions: user.conditions, medications: user.medications,
          } : null,
          allowedScope: 'medical-textbook',
        });
      } catch (e) {
        console.log('[AI Chat] RAG service unavailable:', e.message);
        rag = null;
      }
    }

    // Default to RAG-required for medical guidance unless explicitly disabled.
    const ragRequiredForMedical = String(process.env.MEDICAL_REQUIRE_RAG || '1').trim() !== '0';
    const ragOk = !!(rag?.ok && Array.isArray(rag?.citations) && rag.citations.length > 0
      && typeof rag?.confidence === 'number' && rag.confidence >= 0.25);

    if (mode === 'medical' && ragRequiredForMedical && !ragOk) {
      const fallback =
        'I can\'t answer medical questions safely right now because the textbook reference service isn\'t available or didn\'t find relevant citations. ' +
        'Rather than guess, here\'s how I can help: tell me your key symptoms, timeline, and any meds/conditions, and I\'ll help you organize what to track and what to ask a clinician.';
      const gated = applyTriageGate(fallback, safety);
      return res.json({
        message, mode, reply: gated.reply, safety, threadId: null,
        triageSuppressed: gated.suppressed,
      });
    }

    // --- Build grounded context (mode-aware bundle) ---
    let userContextText = null;
    if (userId) {
      try {
        const bundle = await buildUserContextBundle(userId, { mode });
        userContextText = renderBundleAsText(bundle);
      } catch (e) {
        console.warn('[AI Chat] userContextBundle failed:', e.message);
      }
    }

    // --- Pull top cross-domain insights and append to grounding ---
    // The chat used to be blind to the dashboard's insight engine. This wires
    // the same `selectTopInsights` the dashboard hero card uses.
    let insightsText = null;
    if (userId) {
      try {
        const insights = await selectTopInsights(userId, { limit: 3 });
        insightsText = renderInsightsAsText(insights);
      } catch (e) {
        console.warn('[AI Chat] selectTopInsights failed:', e.message);
      }
    }

    // Combine bundle + insights into one user-context block.
    const groundingParts = [userContextText, insightsText].filter(Boolean);
    const userContextCombined = groundingParts.length ? groundingParts.join('\n\n') : null;

    // --- System prompt with USER_PROFILE + USER_CONTEXT + TEXTBOOK_RAG ---
    const systemPrompt = buildSystemPrompt({
      mode,
      userContext: userContextCombined,
      ragContext: ragOk ? rag?.ragContext : null,
      user,
    });

    // --- Persistent thread: load + append user turn BEFORE calling LLM ---
    let thread = null;
    let effectiveHistory = [];
    let priorRisk = null;
    if (userId) {
      try {
        thread = await getOrCreateThread({ userId, threadId });
        priorRisk = priorRiskFromThread(thread);
        await appendTurn({ thread, role: 'user', content: message, meta: { mode } });
        effectiveHistory = toLLMHistory(thread, { excludeMessage: message });
      } catch (e) {
        console.warn('[AI Chat] thread load/append failed:', e.message);
      }
    }

    // --- LLM call ---
    let llmReply = await generateLLMReply({
      message,
      systemPrompt,
      history: effectiveHistory,
    });

    if (!llmReply) {
      llmReply = 'The AI service is currently unavailable. Please try again in a few seconds.';
    }

    llmReply = stripMarkdown(llmReply);

    // --- Triage gate: only prepend block on first occurrence/escalation ---
    const gated = applyTriageGate(llmReply, safety, { priorRiskLevel: priorRisk });
    const finalReply = gated.reply;

    // Persist assistant turn (matches what the user actually saw on screen).
    if (thread) {
      try {
        await appendTurn({
          thread,
          role: 'assistant',
          content: finalReply,
          meta: {
            mode,
            riskLevel: safety.risk_level,
            triageSuppressed: gated.suppressed,
            triageBlockShown: gated.blockShown,
          },
        });
      } catch (e) {
        console.warn('[AI Chat] thread append (assistant) failed:', e.message);
      }
    }

    // --- Slim response shape: only fields the client actually needs. ---
    return res.json({
      message,
      mode,
      reply: finalReply,
      safety,
      threadId: thread ? String(thread._id) : null,
      triageSuppressed: gated.suppressed,
      foodLogged: false,
      committedMealId: null,
      memorySnapshot: {
        contextGrounded: Boolean(userContextCombined),
        ragGrounded: Boolean(ragOk),
        threadTurnCount: thread ? thread.turns.length : 0,
      },
    });
  } catch (err) {
    console.error('[AI Chat] handler error:', err.message || err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

// ─── Morning brief endpoint ──────────────────────────────────────────────────
// Returns a proactive 3-line summary the mobile chat can render as the first
// AI turn of the day. Computes deterministically from existing engines —
// no LLM call required, low latency.
router.get('/morning-brief', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user?._id) return res.status(401).json({ error: 'Authentication required' });
    const brief = await buildMorningBrief({ userId: user._id, user });
    res.json(brief);
  } catch (err) {
    console.error('[AI MorningBrief] error:', err.message || err);
    res.status(500).json({ error: 'Failed to build morning brief' });
  }
});

// ─── Conversational Nutrition Agent ──────────────────────────────────────────
router.post('/nutrition-agent', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('[NutritionAgent] JWT_SECRET is not set; refusing to verify token.');
        return res.status(500).json({ error: 'Server misconfiguration' });
      }
      const decoded = jwt.verify(token, secret);
      userId = decoded.userId;
    } catch (e) {
      console.log('NutritionAgent auth failed:', e.message);
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required for Nutrition Agent' });
  }

  // Single-instance in-memory sessions. Sufficient for self-use and small deploys;
  // would need Redis/Mongo for horizontal scale.
  if (!global.agentSessions) {
    global.agentSessions = {};
  }

  const SESSION_TTL_MS = 15 * 60 * 1000;
  const nowTs = Date.now();

  Object.keys(global.agentSessions).forEach(id => {
    if (nowTs - global.agentSessions[id].lastActive > SESSION_TTL_MS) {
      delete global.agentSessions[id];
    }
  });

  let agentId = sessionId;

  if (!agentId || !global.agentSessions[agentId] || global.agentSessions[agentId].userId !== userId) {
    agentId = `session_${userId}_${nowTs}`;
    const { NutritionAgentSession } = require('../services/nutritionAI/nutritionAgent');
    global.agentSessions[agentId] = await NutritionAgentSession.create(userId);
    global.agentSessions[agentId].userId = userId;
  }

  const agent = global.agentSessions[agentId];
  agent.lastActive = nowTs;

  try {
    const result = await agent.handleVoiceInput(message);

    if (result.isComplete) {
      delete global.agentSessions[agentId];
    }

    return res.json({
      reply: result.audioResponseText,
      isComplete: result.isComplete,
      sessionId: agentId,
      foodLogged: result.foodLogged || false,
      committedMealId: result.committedMealId || null,
    });
  } catch (err) {
    console.error('[NutritionAgent] Error:', err);
    delete global.agentSessions[agentId];
    return res.status(500).json({ error: err.message });
  }
});

// ─── Chat thread management ─────────────────────────────────────────────────

router.get('/threads', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user?._id) return res.status(401).json({ error: 'Authentication required' });
    const threads = await listThreads(user._id, { limit: Math.min(Number(req.query.limit) || 20, 50) });
    res.json({ threads });
  } catch (err) {
    console.error('[AI Threads] list error:', err);
    res.status(500).json({ error: 'Failed to list chat threads' });
  }
});

router.get('/threads/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user?._id) return res.status(401).json({ error: 'Authentication required' });
    const ChatThread = require('../models/ChatThread');
    const thread = await ChatThread.findOne({ _id: req.params.id, user: user._id }).lean();
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    res.json(thread);
  } catch (err) {
    console.error('[AI Threads] get error:', err);
    res.status(500).json({ error: 'Failed to fetch chat thread' });
  }
});

router.delete('/threads/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user?._id) return res.status(401).json({ error: 'Authentication required' });
    const archived = await archiveThread({ userId: user._id, threadId: req.params.id });
    if (!archived) return res.status(404).json({ error: 'Thread not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[AI Threads] archive error:', err);
    res.status(500).json({ error: 'Failed to archive thread' });
  }
});

module.exports = router;
