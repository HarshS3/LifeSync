# DailyLifeState (derived day model)

DailyLifeState is a derived, non-user-edited representation of one user-day.

## What it is

- One document per `{ user, dayKey: "YYYY-MM-DD" }`
- Derived deterministically from existing collections (logs, habits, symptoms, labs, journal)
- Stores normalized signals + per-signal confidence
- Stores an internal `summaryState` label used for reflections/UX gating
- Symptoms/labs are context only (never interpreted medically)
- Reflection/journal is context only (never determines `summaryState`)

## How to recompute (hook points)

Recompute the relevant day when any of these writes happen:

- Fitness: `POST /api/logs/fitness`
- Nutrition: `POST /api/logs/nutrition`
- Mental: `POST /api/logs/mental` (and back-compat `POST /api/logs/mental/:userId`)
- Habits: `POST /api/habits/toggle`, `POST /api/habits/note`
- Symptoms: `POST/PATCH/DELETE /api/symptoms`
- Labs: `POST/PATCH/DELETE /api/labs`
- Journal: `POST /api/journal`

Recommended pattern:

- Route-level fire-and-forget recompute (fast path): compute dayKey from the payload date (or use today)
- On-demand recompute when reading DailyLifeState if missing

## Implementation files

- Model: `server/models/DailyLifeState.js`
- Compute: `server/services/dailyLifeState/computeDailyLifeState.js`
- Upsert: `server/services/dailyLifeState/upsertDailyLifeState.js`
