# LifeSync AI Assistant — Remaining Work

This document tracks the work that's been deferred after the 2026-06 audit + refactor pass. The assistant is in a solid working state for personal daily use; everything below is "make it feel best-in-class" polish.

> Last updated: 2026-06-13 — after a 13-task refactor that wired RAG into the prompt, surfaced cross-domain insights in chat, added IdentityMemory + USER_PROFILE grounding blocks, fixed the bundle cache race, deduped triage blocks, restructured the system prompt, dropped dead code, and built the morning brief endpoint.

---

## Daily-use wins (do these next)

### Streaming responses (~3.5–5 hours)
**Why it matters:** every chat turn currently waits 3–9s for the full response, then dumps it. Whoop AI / ChatGPT / Levels all stream tokens. This is the single biggest perceptual upgrade.

**What it requires:**
- **Server (`server/aiClient.js` + `server/routes/aiRoutes.js`):**
  - Split `generateLLMReply` into a streaming variant (`generateLLMReplyStream`) supporting Gemini SSE + Groq SSE (their formats differ — Gemini sends `data: {candidates: [...]}`, Groq sends OpenAI-compatible `data: {choices: [{delta: ...}]}`).
  - In `/chat`, after triage prepend, switch the response to SSE (`Content-Type: text/event-stream`). Write triage block first, stream LLM tokens as they arrive, persist final reply on close (NOT during stream — the assistant turn must match what the user actually saw).
  - Greeting fast-path stays non-streaming (it's a single line).
  - Nutrition agent short-circuit stays non-streaming (already has structured reply).
  - Urgent triage suppression: never stream — return the safety-only block as a single response.
- **Mobile (`App/app/(tabs)/chat.js`):**
  - Add `react-native-sse` to deps (the React Native EventSource polyfill).
  - Replace the `api.post('/ai/chat')` call with EventSource subscribed to `/api/ai/chat?stream=1`.
  - Append tokens to an in-flight bubble's text as they arrive.
  - Handle errors mid-stream (network drop, provider failover) — fall back to the partial text + show retry.
- **Web (`client/src/components/ChatPanel.jsx`):**
  - Same approach using browser `EventSource`. Web fetch streaming is also viable but EventSource is simpler.

**Edge cases to design for:**
- Network drops mid-stream → save the partial text, mark turn as `incomplete: true` in meta.
- Both providers fail mid-stream → degrade to the non-streaming retry path with the same message.
- User sends a new message while streaming → cancel the in-flight stream, start the new one.
- Mid-stream markdown (`**` partial tokens) → buffer until line break before stripping.

**Files to touch:**
- `server/aiClient.js`
- `server/routes/aiRoutes.js` (chat handler)
- `App/app/(tabs)/chat.js`
- `client/src/components/ChatPanel.jsx`
- `App/package.json` (add `react-native-sse`)

---

### Mobile TTS playback (~30–45 min)
**Why it matters:** voice-in / text-out is a half-experience. When the user dictates a message, hearing the reply read back makes the assistant feel like an actual conversation partner.

**What it requires:**
- `expo-speech` is already in Expo SDK — just import.
- Add a "voice mode" toggle in chat header (persists in AsyncStorage).
- After each AI reply, when voice mode is on, call `Speech.speak(text, { language: 'en-IN', rate: 1.0 })`.
- Auto-enable voice mode when the user sent the previous message via STT (voice-in → voice-out as default).
- Stop button on assistant bubble while speaking; tap to interrupt via `Speech.stop()`.
- Strip markdown + skip the triage prepend block (already prefixed, would be jarring to hear robotically).
- Clean up speech on screen unmount + when a new message arrives.

**Skip for v1:**
- Voice selection UI (default Indian English voice is fine).
- Speed/pitch controls.
- Web TTS (browser has `speechSynthesis` but desktop chat is less natural for voice).

**Files to touch:**
- `App/app/(tabs)/chat.js`
- (no server changes)

---

## When scaling to other users — token & cost optimizations

At self-use volume (~100 chat turns/day, single user) input tokens cost ~$8/year on Gemini Flash. Don't optimize. **Trigger to revisit:** 100+ daily active chat users, or per-user accumulated memory that won't fit in context.

### Graph-backed memory (Graphiti / Neo4j / Mem0 / Zep)
- Replace the full `userContextBundle` dump with retrieval — pull only nodes connected to the current question.
- Expected: 50–70% input-token reduction on context, 40–60% on insights block.
- Cost: 2–4 weeks integration, embedding pipeline maintenance, added retrieval latency, silent-failure risk if retrieval misses relevant context.

### Conversation summarization
- `ChatThread.summary` field exists but is never written. After 50 turns oldest are dropped silently.
- Summarize dropped chunk via Gemini Flash (cheap call) into `thread.summary`. Saves 30–50% on history tokens at 50+ turn threads.
- ~3 hours.

### Tool-calling for retrieval (do this BEFORE graph)
- Replace pre-stuffed bundle with on-demand tool calls: `get_logs(domain, start, end)`, `get_pattern(key)`, `get_goal(name)`.
- Gives most of graph's token savings (60–80% on routine turns) AND makes the assistant feel smarter ("what did I eat last Wednesday?").
- 2–3 days. Highest ROI scaling move.

### Ensemble / dual-retrieval
- One agent retrieves from PatternMemory (correlations), another from IdentityMemory (long-term claims), then a synthesizer composes the reply.
- Worth it only when retrieval starts missing context the static bundle catches today.
- 1 week.

### Order of operations when scaling
1. **Tool-calling** — biggest single lever, also a UX win.
2. **Conversation summarization** — cheap fix for long threads.
3. **Rate limiting** (already noted below) — protect the bill.
4. **Graph memory** — only if 1–3 aren't enough, or accumulated user history exceeds 50k tokens.
5. **Ensemble retrieval** — only if single-source retrieval starts failing.

---

## Future polish (when shipping to other users)

These are flagged in the audit but are NOT blockers for personal daily use. Pick up when the user base grows.

### Rate limiting
- `express-rate-limit` is imported in `server/index.js` but never wired (the comment `// ... (existing rate limiters)` is the entire implementation).
- For a single user, no risk. For users-at-large, add a per-user limiter on `/api/ai/*` — e.g. 30 req/min, 200 req/hour, keyed on `req.user?._id ?? req.ip`.
- 1 hour of work.

### Persist NutritionAgentSession state
- `aiRoutes.js` currently keeps voice nutrition agent sessions in `global.agentSessions`. Single-instance only — breaks under horizontal scaling.
- Move to Mongo collection or Redis with TTL.
- 2–3 hours.

### Thread-list UI
- Server has `GET /threads`, `GET /threads/:id`, `DELETE /threads/:id` (already wired).
- Mobile chat has no UI to switch threads or start a new one — it's a single endless conversation today.
- Add a drawer/sidebar with thread list, "new thread" button.
- ~2 hours.

### Inline image drop on web chat
- Mobile already supports inline meal photos (chat.js handleImageResult).
- Web has a separate `PhotoLogFlow` modal but no inline drag-drop / paste.
- Add a drop-zone over the message list like ChatGPT.
- ~1 day.

### Tool-calling LLM for retrieval
- Right now `userContextBundle` pre-stuffs a fixed snapshot of the last 24h. The LLM cannot answer "what did I eat last Wednesday?" because it has no tool to fetch with.
- Move chat to a Groq/OpenAI tool-calling loop with `get_logs(domain, start_date, end_date)`, `get_pattern(key)`, `get_goal(name)`.
- This is the single change that closes the gap to ChatGPT-with-tools.
- 2–3 days. Significant scope.

### Cross-thread summarization
- `ChatThread.summary` field exists but is never written. After 50 turns, oldest are dropped silently.
- When slicing past `MAX_TURNS=50`, summarize the dropped chunk via a cheap Gemini Flash call into `thread.summary`.
- ~3 hours.

### Smarter mode router
- `detectAssistantMode` is keyword-counting. Mistakes happen on edge cases like "back pain after deadlifts" → fitness mode (no triage emphasis) when medical might be safer.
- Either weight medical higher when red flags are present, or use the LLM as a router with a tiny classifier prompt.
- ~2 hours.

### Citation chips in chat UI
- Like Levels AI's "Why this prediction?" expander.
- When the assistant references a pattern/insight from `<USER_CONTEXT>`, show a small chip the user can tap to see what data backed the answer.
- Requires structured output from the LLM (e.g. `[ref:pattern-001]` markers) and a chip-renderer in the UI.
- ~1 day server + 1 day mobile UI.

### Markdown rendering instead of stripping
- Currently the server strips all markdown so plain-text UIs render clean.
- A nicer approach: render markdown with `react-native-markdown-display` on mobile and `react-markdown` on web.
- Lets the assistant use bullets/headers/links naturally.
- ~3 hours.

---

## Done in this pass (2026-06-13)

For historical context, this audit pass completed the following 11 fixes:

1. ✅ Stripped JWT secret fallback in `/nutrition-agent` (was hardcoded as `'lifesync-secret-key-change-in-production'`).
2. ✅ Redacted user message content + email/name from server logs.
3. ✅ Server-derived `explicitInsightRequest` instead of trusting client flag.
4. ✅ Killed `SIMPLE_GEMINI_MODE` toggle — single chat path. Reduced `aiRoutes.js` from 1555 → ~600 lines.
5. ✅ `appendTurn` no longer drops empty content (saves `[empty response]` placeholder).
6. ✅ `toLLMHistory` excludes user message by content match instead of blind `slice(-1)`.
7. ✅ Triage block deduplicated into one renderer + only prepends on first occurrence/escalation.
8. ✅ `userContextBundle` cache invalidated synchronously on chat ingestion (race fixed).
9. ✅ Triage now actually GATES the LLM (suppresses on urgent, prepends on elevated/moderate).
10. ✅ Slim `memorySnapshot` — no internal mode toggles or DB error strings leaked to client.
11. ✅ RAG context now flows into the LLM prompt via `<TEXTBOOK_RAG>` block (was fetched-then-discarded).
12. ✅ `selectTopInsights` wired into chat grounding — chat sees the dashboard's insight engine.
13. ✅ IdentityMemory + USER_PROFILE block added to grounding. LLM can personalize by name/diet/allergies.
14. ✅ Mode-aware bundle: fitness sees 7-day workouts + volumes, medical sees symptoms + abnormal labs, therapy sees mood/stress/sleep arc.
15. ✅ System prompt restructured into numbered sections (PERSONALITY/GROUNDING/CONFIDENCE/STYLE/SAFETY) — better instruction-following.
16. ✅ Dead code removed: `MemorySummary`, `WardrobeItem`, `riskRank`, `decideInsight`, `buildInsightPayload`, `buildSupplementAdvice`, `dayKeyFromDate`, 7 unused intent helpers, `debugAiInsight`, `explicitInsightRequest` echo.
17. ✅ Markdown stripper now handles `**`, `__`, `*`, `_`, `#`, bullets, numbered lists, links, inline code, code fences.
18. ✅ Client `history` payload dropped — server owns full thread via `threadId`. Removed bandwidth waste from mobile + web.
19. ✅ Morning brief service + `GET /api/ai/morning-brief` endpoint built. Returns deterministic 3-line briefing (state + insight + action). No LLM call required.

---

## Files modified in this pass

```
server/services/assistant/prompts.js              # Restructured system prompt
server/services/assistant/userContextBundle.js    # IdentityMemory, mode-aware queries, multi-key cache
server/services/assistant/morningBrief.js         # NEW — proactive briefing
server/services/safety/triageRenderer.js          # Dedup gating, prior-risk suppression
server/services/dailyLifeState/triggerDailyLifeStateRecompute.js  # Lazy clearCache call
server/routes/aiRoutes.js                         # Full rewrite: 1555 → ~470 lines
server/services/assistant/chatThreadService.js    # appendTurn empty-content + excludeMessage
App/app/(tabs)/chat.js                            # Drop client history payload
client/src/components/ChatPanel.jsx               # Drop client history payload
.claude/settings.json                             # Project-shared permission allowlist
```

## Files NOT touched (intentionally)

- `server/services/insightSelector/crossDomainInsightSelector.js` — already correct, just newly used.
- `server/services/safety/healthTriageEngine.js` — works fine; the renderer was the issue.
- `server/services/assistant/router.js` — keyword-counting mode detection. Flagged but skipped — works for current self-use.
- `server/services/insightGatekeeper/*` — not in the chat path anymore (was never effectively wired).
- `server/services/chatIngestion/ingestFromChat.js` — works as designed.
- `server/aiClient.js` — touched only by the streaming task; deferred.
- All `server/seed*.js` scripts.
- All mobile UI components other than chat.js.
- All web client components other than ChatPanel + Dashboard.
