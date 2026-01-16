# Chat Assistant — Essence (Brief)

This is the shortest practical explanation of how the LifeSync chat assistant works: **what comes in → what happens → what goes out**.

Full reference (all details, payloads, edge cases):

- [docs/ai-assistant.md](ai-assistant.md)

---

## Core idea

- The server does **deterministic routing + safety + gating** first.
- The LLM (Gemini/Groq/OpenAI) is used mainly to **render** an answer using provided context.
- Cross-day “insight speech” is constrained: default is **silence / gentle reflection**, not advice.

---

## Main endpoints

- `POST /api/ai/chat` (auth optional)
	- Used for normal chat.
- `POST /api/chat-ingestion/preview` (auth required)
- `POST /api/chat-ingestion/commit` (auth required)
	- Used by voice-confirm UI to show what would be logged, then optionally write it.
- `POST /api/stt` (auth required)
	- Server speech-to-text fallback when browser STT isn’t available.

---

## End-to-end flow (text chat)

1) Client (`ChatPanel.jsx`) sends `{ message, history, skipIngestion? }` to `POST /api/ai/chat`.
2) Server (`aiRoutes.js`) optionally resolves the user from JWT.
3) Deterministic steps (no external calls):
	 - Mode routing (`general|medical|therapy|fitness`)
	 - Safety triage
	 - If authenticated: optional chat ingestion (writes a small set of high-confidence signals)
	 - If authenticated: insight gatekeeper (decides `silent|reflect|insight`)
4) Context fetch (auth-only): recent logs + profile.
5) Medical-only: optional textbook RAG call.
6) LLM call (usually 1) unless a deterministic fast-path answers without LLM.
7) Post-processing: limits questions, ensures “explanation before question”, appends triage only if risk is non-low.

---

## Voice flow (essence)

1) Try browser speech recognition first (no server call).
2) If not available: record audio and upload to `POST /api/stt`.
3) If authenticated: preview ingestion → user confirms → commit ingestion.
4) Send the transcript to `POST /api/ai/chat` with `skipIngestion: true` (prevents double-logging).

---

## External call counts (per message)

Typical:

- Authenticated, non-medical: **LLM 1**
- Medical: **RAG 1 + LLM 1**
- Deterministic fast-paths (greeting, profile field answers): **LLM 0**

Worst case:

- If `LLM_PROVIDER=auto`, provider fallback can cause **up to 3 LLM calls** (tries multiple providers until one succeeds).
- If medical + `MEDICAL_REQUIRE_RAG=1` and no citations: **RAG 1, LLM 0** (safe early return).

---

## Key knobs (most important)

- `LLM_PROVIDER=auto|gemini|groq|openai|none`
- `AI_CHAT_SIMPLE_GEMINI=1` (forces simple Gemini response path)
- `MEDICAL_REQUIRE_RAG=1` (forces citation-backed medical answers)
- `AI_SERVICE_URL` + `AI_SERVICE_TIMEOUT_MS` (RAG service)

