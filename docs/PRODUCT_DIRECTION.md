# LifeSync — Product Direction (canonical decisions)

> Last finalized: **2026-06-12**. This is the single source of truth for *what we are building, what we are killing, and why*. Other docs (README, todo, code comments) should defer to this file when they disagree.

LifeSync ships on **two clients** by design — `client/` (React + Vite, web) and `App/` (Expo RN, mobile). Web is for desk-time analytics, deep review, lab/PDF uploads, configuration. Mobile is for in-the-moment logging. Both are first-class. Don't propose killing one as a "simplification."

---

## 1. Flagship — Cross-domain insight cards on the home screen

The one thing LifeSync does that nobody else does is **link food timing × training performance × wellness × glucose simulation × labs**, surfaced as a daily "Why your readiness is X today" hero card on the home screen.

**Status:** the signals exist (`correlationEngine`, `readinessEngine`, `insulinIntelligenceService`, `mealTimingEngine`, `computePatternMemory`); a textual `stateReflection` is already returned via header on `GET /api/daily-life-state/:dayKey` and consumed by `App/app/(tabs)/index.js` and the web Dashboard. The hole is **UI prominence** and **breadth** — one bounded string, not surfaced as a hero.

**Plan:**
- Build `services/insightSelector/crossDomainInsightSelector.js` that returns the **top-3** cross-domain insights for today, ranked by `recency × magnitude × actionability`.
- Promote `stateReflection` from a header field to a **hero card** at the top of the home screen on both `client/` and `App/`. Each insight is one-tap expandable to "show the data behind this."
- Levels charges $200/mo for *one* such link (food → glucose). Whoop charges $30/mo for one (sleep + HR → recovery). LifeSync should ship the network of them.

---

## 2. AI assistant — make it actually grounded

**Confirmed broken:** `server/services/assistant/prompts.js` `buildSystemPrompt({ mode })` only takes a mode string. The prompt text says "Use user context" but **no user context is ever injected**. The mobile chat (`App/app/(tabs)/chat.js`) sends only the last 10 message turns — never `DailyLifeState`, pattern memory, goals, or recent logs.

**Plan (four steps):**
1. **User context bundle service** — single endpoint/function that returns: today's `DailyLifeState`, last 7 days of `PatternMemory`, active `LongTermGoal`/`Habit` rows, last 24h of nutrition + workout + wellness logs. Cache for 60s.
2. **Inject into `buildSystemPrompt`** as a structured `<USER_CONTEXT>` block. Keep deterministic intent routing on top.
3. **Wire image-to-meal.** `chat.js` already imports `Camera` and `ImagePicker` — they're never sent anywhere. Add `POST /api/nutrition/from-image` (Gemini Vision → meal candidate → user confirms before persist).
4. **Persistent conversation memory.** Currently stateless past the 10-message slice. Add `ChatThread` collection, last 50 turns per thread, summarize-when-long pattern.

Result: assistant becomes "your app's coach with full context" instead of "ChatGPT with a wellness skin."

---

## 3. Reasoning layer — replace IdentityMemory with a causal hypothesis lifecycle

Keep `DailyLifeState` and `PatternMemory` (real, defensible — exponential decay, log saturation, non-consecutive day enforcement). The "raw logs → DailyLifeState → memory layers → reflections" architecture is **sound** — keep the bones.

**Drop `IdentityMemory`** as currently built (4 hardcoded archetypes + pre-written claim strings). Replace with a per-user **causal hypothesis tracker:**

- When a correlation surfaces (e.g., "low iron + tea-with-meals → fatigue"), persist it as an **open hypothesis** with `confidence`, `supportCount`, `refuteCount`, `lastEvaluatedAt`.
- Subsequent days' data either **confirms** (raises confidence) or **refutes** (lowers it). After 30 days untouched, archive.
- The `Hypothesis` model and `/api/nutrition/hypotheses/:id/feedback` endpoint already exist (`server/routes/nutritionRoutes.js:472`). **Extend, don't rebuild.** Generalize beyond food to all cross-domain links; wire the `feedback` array into the lifecycle (currently collected but unused).

This is what makes "memory" actually *learn* per user instead of fitting users into archetypes.

---

## 4. Wellness — stay minimal

Keep wellness; **do not expand to Whoop-style 20+ biometrics.** Asking too much causes abandonment.

**Why we keep it:** `readinessEngine` weights energy 15, stress 10, plus indirect sleep — that's a quarter to a third of the readiness score. Removing wellness would make readiness mostly RHR + fuel + load, which Whoop already does better.

**Concrete shape (matches the existing `todo.md` direction):**
- One slider on dashboard: overall readiness 1–10.
- Conditional follow-ups **only when score < 5** (mood / stress / sleep / hunger).
- Revisit in V2 once retention data exists.

---

## 5. Logging UX — nutrition

**Goal:** drop friction, raise meal data quality.

- **Surface meal-templates.** `GET /api/nutrition/meal-templates` (`nutritionRoutes.js:1492`) already returns top-15 frequent meals from the last 60 days; `/api/nutrition/saved-templates` lets the user save custom ones. Promote both to a "Quick log" row at the top of the nutrition screen.
- **Voice + image entry as primary.** Voice already wired via `chatIngestion`. Image-to-meal — add per §2.3.
- **Ingredient-level meal builder (rebuild `nutrition/recipes.js`).** Current state is search-only — `recipeService.searchRecipes` and `getRecipeByUrl` (`recipeRoutes.js`). Rebuild scope: user picks a dish → sees the **raw ingredients** (per-ingredient kcal + macro + micro) → can modify quantity, swap, add, or remove → saves the result as a **custom `MealTemplate`** whose totals reflect the modified ingredients. The math primitives exist (`calculateDailyTotals`, `evaluateMealInteractions`, `calculateEffectiveNutrients`); only the UI + persist-as-template glue is missing.

---

## 6. Logging UX — wellness

Per §4. Single readiness slider; expand only when `< 5`.

---

## 7. Monthly insights screen — make it real

**Status (`App/app/insights/monthly.js`):** functional, shallow. It hits `GET /reports/monthly` and renders **totals only** — workouts, total volume, avg cal/protein/sleep/weight, plus an "Email CSV" button that just `Alert`s. Title is literally "Monthly Data Archive."

**Rebuild scope:**
- Month-over-month deltas for every panel (calories trending up? volume down? weight ↘ but readiness ↘ too?).
- Run `correlationEngine` and `readinessEngine` over a 30-day window — the engines already exist; they're just never called at month scale.
- Narrative card: "your 3 best days had 8.2h sleep avg, 2.4 g/kg protein, sub-150 stress; your 5 worst had…"
- Wire the CSV export end-to-end (the `/reports/monthly?format=csv` path already returns CSV — `reportRoutes.js:46`).

This is one of the highest-leverage UI fixes — the data exists.

---

## 8. Data model fixes

In priority order:

1. **Kill `Goal` (legacy)** — `server/models/Logs.js:184` + `server/routes/goalRoutes.js`. Routes have **no auth middleware** and read `user` from request body — security hole. Migrate any existing rows to `LongTermGoal`, then delete model + route + README section.
2. **Delete `POST /api/logs/nutrition`** in `server/routes/logRoutes.js:107` — it bypasses every analytic layer (no `bioavailability`, no `proteinDistribution`, no `insulinIntelligence`, no per-meal totals). Migrate any caller to `POST /api/nutrition/logs` (`nutritionRoutes.js:658`). The legacy `GET /api/logs/nutrition` can stay as a thin alias if anything depends on it; verify with grep before deletion.
3. **Consolidate `Habit` + `LongTermGoal` → `Commitment`.** Both are "do/don't-do this on most days, track streaks." Polymorphic `kind: 'habit' | 'long_term_goal'`, shared `CommitmentLog` for daily entries. Streak computation moves to one service. Saves three screens of overlap.
4. **Add `meals[].mealTime: Date`** on `NutritionLog`. Currently only `time: String` ("19:30") + `mealType` enum exist (`models/Logs.js:24-25`). Insulin sim and meal-timing engine have to **infer** the absolute timestamp every read. One field at log time eliminates that.
5. **Drop the duplicated 38-nutrient enumeration** between `meals[].foods[]` and `dailyTotals` (`models/Logs.js:26-73, 99-137`). Move to a single `Mixed` map keyed by nutrient name (or a sub-document used in both places). Adding a 39th micro currently means editing two schema blocks **and** `DAILY_TOTAL_FIELDS` in `nutritionRoutes.js:71`.
6. **Add `confidence` and `source` per nutrient on `meals[].foods[]`.** Half-done in barcode flow (`_estimatedFields`, `estimationConfidence` — `BarcodeProduct` model). Not propagated to meal logs. Without this we can't tell the user "your iron number today is mostly LLM-estimated, treat with skepticism."
7. **Compound index `(user, date)` on `NutritionLog`** — date-range scans in monthly aggregation will get slow as data accumulates.
8. **Inventory** — `KitchenInventory` model + `nutrition/inventory.js` routes are slated for **removal.** Reason: people buy items daily without receipts; manual tracking will be abandoned. Receipt OCR is not a sufficient fix. Archive after migration of any existing rows.

---

## DailyLifeState — still the right architecture

The "raw logs → DailyLifeState → memory layers → reflections" model is sound. The problem isn't the architecture, it's that:
- The upper layers (`IdentityMemory`, `StateReflections`) are shallow — see §3.
- The output is hidden in a header field, not on the home screen — see §1.

**Better alternatives considered:** pure-LLM ("send every raw log to Claude on dashboard load, ask for insights"). Rejected — non-deterministic, expensive per call, can't be debugged, can't surface reliable longitudinal patterns. The current hybrid (deterministic compute → LLM only for narrative phrasing where allowed) is the correct model. Keep it.

---

## What this document is NOT

- A backlog. Order/priority is captured but task tracking happens in `todo.md` and code-level TODOs.
- A design spec. Each item above will get a separate implementation plan when picked up.
- A promise to ship. These are *decisions* — direction-of-march, not commitments.

When proposing new features, check this list first. If the feature isn't in the flagship/rebuild scope or doesn't unblock one of these, default to **"no, that's feature accretion."**
