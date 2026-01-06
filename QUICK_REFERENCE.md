# Quick Reference: AI Assistant Conservatism Fix

## What Changed?

The assistant now provides **explanation + reflection** instead of **reflection-only**, even with limited data.

## Key Files Modified

### 1. `server/services/assistant/prompts.js`
- **baseGuardrails():** Added confidence ladder + "never reflection-only" rule
- **therapyPrompt():** Added "always combine observation with reflection"

### 2. `server/routes/aiRoutes.js`
- **buildLowConfidenceExplanation():** NEW — builds tentative explanations from context
- **buildReflectiveInsight():** NEW — wraps explanation with reflective question
- Response composition logic: When gatekeeper returns `reflect`, now uses both helpers

### 3. `docs/ai-assistant.md`
- Section 6: Updated heading, confidence ladder, response composition examples

## How It Works (Simple Version)

```
User asks "Why am I tired?"
    ↓
System checks: do we have any recent sleep/stress data?
    ↓ YES
buildLowConfidenceExplanation() → "Based on limited data so far, sleep was 6h..."
buildReflectiveInsight() → adds question: "...What feels most connected?"
    ↓ NO
buildReflectiveInsight() → fallback: "I don't have enough data yet. What feels..."
```

## Confidence Levels Explained

| Level | Confidence | Language | Example |
|-------|-----------|----------|---------|
| 1 | Low (minimal data) | "Based on limited data...", "May...", "So far..." | "Sleep was 6h, which can cause fatigue." |
| 2 | Medium (3+ days pattern) | "Often", "Tends to" | "Your energy often dips when stress is high." |
| 3 | High (PatternMemory) | Still hedged | "Sleep appears to be a keystone habit for you." |

**Key:** All levels use uncertainty language. No absolute claims.

## Consent Model

- **Level 1 (low confidence explanations):** No special consent needed. User just needs to be authenticated.
- **Level 3 (identity claims):** Requires explicit "why/pattern" question from user.

This allows early helpfulness while protecting privacy of identity-level insights.

## Testing Locally

### Before (old behavior):
```
POST /api/ai/chat
Body: { "message": "Why am I so tired?" }
Response: { "reply": "What feels most important about that question?" }
```

### After (new behavior):
```
POST /api/ai/chat
Body: { "message": "Why am I so tired?" }
Response: { "reply": "Based on limited data so far, your last sleep was 6h and stress was at 7/10. Both can cause fatigue. What feels most connected?" }
```

## Rollback Plan

If needed, revert these changes:
1. Remove `buildLowConfidenceExplanation()` and `buildReflectiveInsight()` from aiRoutes.js
2. Restore old prompts.js (remove confidence ladder references)
3. Change response composition back to single `buildDeterministicReflectQuestion()`

All changes are pure code/prompt (no schema changes).

## What's NOT Changed

- Safety triage (still runs, still detects red flags)
- Gatekeeper logic (still reads DailyLifeState, PatternMemory, IdentityMemory)
- Medical RAG requirements
- Chat ingestion
- Auth/privacy model
- Provider abstraction

## Monitoring

Look for:
1. **Response length increase:** Expect ~50% more characters per response
2. **Explanation frequency:** Every "reflect" decision should now produce explanation + question
3. **Uncertainty language:** Every response with limited data should include "may", "so far", "based on limited data"

## Questions?

See:
- [CHANGELOG_CONSERVATISM_FIX.md](CHANGELOG_CONSERVATISM_FIX.md) — detailed changes
- [docs/ai-assistant.md](docs/ai-assistant.md) — full architecture documentation
- [ARCHITECTURE_CHANGES.md](ARCHITECTURE_CHANGES.md) — visual summary
