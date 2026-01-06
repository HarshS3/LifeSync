# LifeSync AI Assistant: Conservatism → Helpfulness (Architecture Change Summary)

## The Core Problem

The assistant was **over-conservative**, producing reflection-only responses even when user context existed:

```
User:  "Why am I always tired?"
LLM:   "What feels most important about that question?"  ← Not helpful!
```

## The Solution: Two-Layer Explanation Model

### Layer 1: Confidence-Based Explanation
- **Level 1 (low confidence):** Use any available data, but phrase as tentative
  - "Based on limited data so far, your last sleep was 6h. This can cause fatigue."
  - Always includes uncertainty language: "may", "so far", "I notice"
  
- **Level 2 (medium confidence):** Requires patterns across multiple days
  - "Your energy often dips when stress is high"
  - Language: "often", "tends to"
  
- **Level 3 (high confidence):** Requires PatternMemory/IdentityMemory (identity claims)
  - "Sleep is a keystone habit for you"
  - Still gated by explicit user intent

### Layer 2: Reflective Follow-Up
- Always end with exactly one gentle question
- Never ask without first providing value
- Example: "...which suggests it may be situational. What feels most connected?"

## Consent Model Clarification

```
┌─────────────────────────────────────────────────┐
│ Insight Gatekeeper Decision: "reflect"          │
├─────────────────────────────────────────────────┤
│ OLD: Just ask a reflective question             │
│ NEW: Explanation (Level 1) + reflective question│
│                                                 │
│ → Allows early helpfulness without breaking    │
│   consent on high-confidence claims             │
└─────────────────────────────────────────────────┘
```

## Implementation Flow

```
User Message
    ↓
Gatekeeper Decision
    ├─ "silent" → generic LLM
    ├─ "reflect" → NEW: buildLowConfidenceExplanation() + reflective question
    └─ "insight" → deterministic identity claim (high-confidence only)
```

## New Code in aiRoutes.js

### Helper 1: buildLowConfidenceExplanation()
```javascript
// Extracts tentative observations from:
// - Profile (diet type, conditions, etc.)
// - Latest logs (sleep, stress, energy, mood, activity)
// - DailyLifeState (if available)
//
// Returns: "Based on limited data so far: [observations]. [question]?"
// Or null if no relevant data exists
```

### Helper 2: buildReflectiveInsight()
```javascript
// Wraps explanation with optional reflective follow-up
// If explanation exists: use it
// Otherwise: fallback to soft reflection acknowledging limited data
```

## System Prompt Changes

### baseGuardrails() now includes:
```javascript
'Use user context (profile, logs, patterns) when relevant to questions. Always state uncertainty if confidence is low.'
'CONFIDENCE LADDER: Level 1 (low): "based on limited data...", Level 2 (medium): "often...", Level 3 (high): identity claims only'
'NEVER provide reflection-only answers. Always combine explanation (even tentative) with reflective follow-up.'
'Never ask a clarifying question without first providing useful context-aware insight or observation.'
```

### Generic LLM system prompt now:
```javascript
'Use user context (profile + recent logs) to provide helpful, personalized answers.'
'If confidence is low (e.g., limited logs), state uncertainty explicitly: "Based on limited data...", "So far...", "May..."'
'Never ask a clarifying question without first providing useful context-aware insight or observation.'
```

### Therapy mode now mandates:
```javascript
'Always combine contextual observation with reflection. Never respond with reflection-only.'
'Example: "From what I see so far, stress hasn\'t aligned with heavy physical load, which suggests it may be situational. What feels most present?"'
```

## Safety Guarantees MAINTAINED

✅ Medical diagnosis & prescriptions still prohibited  
✅ Red-flag detection still runs every request  
✅ Auth-scoped access (logs only with user token)  
✅ High-confidence identity claims still require explicit "why" question  
✅ Gatekeeper still gates based on DailyLifeState + PatternMemory + IdentityMemory  

## Test Scenarios

| User Input | Before | After |
|---|---|---|
| "Why am I so tired?" | "What feels most important?" | "Sleep was 6h, stress 7/10. Both affect fatigue. What feels most connected?" |
| "I feel stressed." (therapy) | "What's most important about that?" | "From what I see, stress hasn't aligned with heavy activity, so it may be situational. What feels present?" |
| "Tell me about my sleep." | "Here's what I can say..." | "Based on recent logs: average 6.5h, varies by 1-2h. What's your goal?" |
| "Do I have a sleep pattern?" (no explicit why) | "I'd need more data" | Forward to normal Q&A + context |
| "Why do I always feel low energy?" | [gated] | "Over 5 days, low energy often coincided with high stress. What drives the stress?" |

## Documentation

→ Updated [docs/ai-assistant.md](docs/ai-assistant.md) section 6 (Insight Gatekeeper)  
→ Created [CHANGELOG_CONSERVATISM_FIX.md](CHANGELOG_CONSERVATISM_FIX.md) for detailed reference  

## Backward Compatibility

✅ **Zero API changes**  
✅ **No database migrations**  
✅ **No client changes needed**  
✅ **Existing gatekeeper still works, just used more thoughtfully**  

All changes are prompt/composition-level (safe and reversible).
