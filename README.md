# LifeSync

LifeSync is a personal wellness + lifestyle tracking app (MERN-style) with an AI assistant and an “advanced nutrition” pipeline.

This README is intended to be a *developer handbook*: how the system is wired, what each module does, every API endpoint, and the data model behind it.

---

## Repository layout

```
client/     React + Vite + MUI (UI)
server/     Node.js + Express + MongoDB (API)
ai_service/ Optional Python microservice for Medical Textbook RAG
```

---

## Tech stack

- Client: React (Vite), Material UI
- Server: Node.js (Express), Mongoose (MongoDB)
- Optional AI: Groq or OpenAI chat completions via `server/aiClient.js`
- Optional RAG: FastAPI + Chroma + OpenAI embeddings via `ai_service/`

---

## Quick start (local)

### Prereqs

- Node.js 18+ (server uses global `fetch`)
- MongoDB running locally (or MongoDB Atlas URI)

### Start the server

```bash
cd server
npm install
```

Create `server/.env` (copy from `server/.env.example`):

```dotenv
MONGO_URI=mongodb://localhost:27017/lifesync
JWT_SECRET=your_jwt_secret

# Email reminders (optional)
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# AI (optional)
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=

# Textbook RAG microservice (optional)
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=2500
MEDICAL_REQUIRE_RAG=0
MEDICAL_SUPPLEMENT_ADVISOR=1

# Nutrition external provider (optional)
FATSECRET_CLIENT_ID=
FATSECRET_CLIENT_SECRET=
FATSECRET_TOKEN_URL=https://oauth.fatsecret.com/connect/token
FATSECRET_API_BASE=https://platform.fatsecret.com/rest/server.api

# Daily insights LLM narrative (optional)
DAILY_INSIGHTS_LLM=0
```

Run:

```bash
npm run dev
```

Server base URL (default): `http://localhost:5000`

Health check:

```text
GET /api/health
```

### Start the client

```bash
cd client
npm install
npm run dev
```

Client base URL (default): `http://localhost:5173`

Proxy behavior:

- By default the client uses relative `/api/...` calls.
- Vite dev server proxies `/api` → `http://localhost:5000` (see `client/vite.config.js`).

Optional: set a custom API base with `client/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

---

## Client modules (what’s in the UI)

Navigation is defined in `client/src/App.jsx` and uses an internal “section” router.

- Home: Dashboard (high-level overview + quick actions)
- Assistant: AI chat experience
- Profile: user profile + preferences used by AI/nutrition
- Training: gym/workout tracker
- Nutrition: daily nutrition logging + advanced nutrition analysis
- Wellness: daily mental/wellness check-in + journal
- Symptoms: symptom logging
- Labs: lab report logging
- Calendar: combined calendar views
- Habits: habit tracker + streaks + analytics
- Insights: centralized insights (nutrition daily insights, wellness insights)
- Style: wardrobe + outfit suggestions
- Reminders: reminder settings

Cross-screen “go to Insights” uses a global event:

```js
window.dispatchEvent(new CustomEvent('lifesync:navigate', { detail: { section: 'trends' } }))
```

---

## Authentication & authorization model

LifeSync uses JWT auth.

- Most protected endpoints require `Authorization: Bearer <token>`.
- Some legacy endpoints accept `:userId` in the path for back-compat.
- Some POST routes in `server/routes/logRoutes.js` are not wrapped in auth middleware but still *extract* a token to set the `user` field; without a token, they may create logs with a null/empty user (treat as an MVP shortcut).

JWT payload:

```json
{ "userId": "<mongo ObjectId>" }
```

---

## Data model (MongoDB schemas)

This section is a “field map” of the major collections used by the API.

### User (`server/models/User.js`)

Key fields:

- Identity: `name`, `email`, `password`
- Health: `conditions[]`, `allergies[]`, `medications[]`, `supplements[]`
- Diet: `dietType`, `avoidFoods[]`, `dailyCalorieTarget`, `dailyProteinTarget`, `hydrationGoal`
- Preferences: workouts, chronotype, style preferences
- Reminders: `reminders.{ email, push, reminderTimes, habitReminders, ... }`
- Subscription: `subscription.plan` etc.

### Logs (`server/models/Logs.js`)

- `FitnessLog`: `type`, `focus`, `intensity`, `fatigue`, `notes`, `date`
- `NutritionLog`: `meals[]` (foods + macros), `waterIntake`, `dailyTotals`, `notes`, `date`
- `MentalLog`: `mood`, `moodScore`, `stressLevel`, `energyLevel`, `bodyFeel`, `sleepHours`, `notes`
- `Goal`: legacy goal collection used by `/api/goals`

### Habits (`server/models/Habit.js`)

- `Habit`: `name`, `frequency`, `customDays`, `targetPerDay`, `category`, `streak`, `longestStreak`, `isActive`
- `HabitLog`: unique by `(user, habit, date)`; stores `completed`, `value`, `notes`

### Long-term goals (`server/models/LongTermGoal.js`)

- `LongTermGoal`: streak-style goals (abstain/build/reduce)
- `LongTermGoalLog`: daily status (`success|relapse|partial|skip`) + triggers/notes

### Journal (`server/models/JournalEntry.js`)

- `JournalEntry`: `text`, `date`

### Symptoms (`server/models/SymptomLog.js`)

- `SymptomLog`: `symptomName`, `severity (0-10)`, `notes`, `tags[]`, `date`

### Labs (`server/models/LabReport.js`)

- `LabReport`: `panelName`, `results[]`, `notes`, `source`, `date`
- Each result can include reference ranges; flags are computed if missing.

### Wardrobe/style (`server/models/Wardrobe.js`)

- `WardrobeItem`: `category`, `colors[]`, `occasions[]`, `seasons[]`, `favorite`, `imageUrl`, `notes`

### Daily Insights cache (`server/models/DailyInsight.js`)

Stores per-user per-day insight documents, computed from:

- Nutrition logs (that day)
- Nearby symptoms (±2 days)
- Nearby labs (±14 days)

The cached document contains:

- `nutrition.bullets[]`: actionable daily nutrition bullets
- `symptoms.items[]` and `labs.items[]`: “nearby evidence” context (non-causal)
- Optional `narrative` (LLM-generated but derived strictly from deterministic signals)

---

## Server architecture (high level)

The API server mounts routes in `server/index.js`:

```
/api/auth           Authentication
/api/users          Profile + subscription
/api/logs           Basic fitness/nutrition/mental logs
/api/gym            Gym workouts
/api/nutrition      Advanced nutrition tracker + pipeline
/api/habits         Habits + logs + analytics
/api/long-term-goals Long-term goal tracker
/api/journal        Journal
/api/symptoms       Symptoms
/api/labs           Labs
/api/style          Wardrobe + outfit suggestions
/api/ai             AI assistant
/api/insights       Daily insights cache endpoints
```

---

## API reference (complete)

All endpoints below are mounted under the server base URL (default `http://localhost:5000`).

### Conventions

- **Auth header**: `Authorization: Bearer <JWT>`
- **Dates**: Most date inputs accept an ISO date/time or `YYYY-MM-DD` and are normalized server-side to day boundaries where relevant.
- **Errors**: Many routes respond with `{ error: "..." }` on failure.

---

## API examples (curl)

Use these examples as copy/paste starting points.

### One-time setup (shell variables)

```bash
# Server base URL
BASE_URL=http://localhost:5000

# After login/register, set your token here
TOKEN="YOUR_JWT_HERE"

# Common auth header
AUTH_HEADER="Authorization: Bearer ${TOKEN}"
```

Notes:

- On Windows PowerShell, you can still use `curl`, but env var syntax differs. If you prefer, you can inline the token directly in the `Authorization` header.
- Responses below are representative examples; actual documents include MongoDB `_id`, timestamps, etc.

---

### Health

```bash
curl -s "$BASE_URL/api/health"
```

```json
{ "status": "ok", "service": "LifeSync API" }
```

---

### Auth (`/api/auth`)

#### `POST /api/auth/register`

```bash
curl -s -X POST "$BASE_URL/api/auth/register" \
	-H "Content-Type: application/json" \
	-d '{"name":"Aashish","email":"aashish@example.com","password":"secret123"}'
```

```json
{ "token": "<jwt>", "user": { "id": "...", "name": "Aashish", "email": "aashish@example.com" } }
```

#### `POST /api/auth/login`

```bash
curl -s -X POST "$BASE_URL/api/auth/login" \
	-H "Content-Type: application/json" \
	-d '{"email":"aashish@example.com","password":"secret123"}'
```

```json
{ "token": "<jwt>", "user": { "id": "...", "name": "Aashish", "email": "aashish@example.com" } }
```

#### `GET /api/auth/me`

```bash
curl -s "$BASE_URL/api/auth/me" -H "$AUTH_HEADER"
```

```json
{ "_id": "...", "name": "Aashish", "email": "aashish@example.com", "dietType": "omnivore", "createdAt": "..." }
```

#### `POST /api/auth/direct-reset`

```bash
curl -s -X POST "$BASE_URL/api/auth/direct-reset" \
	-H "Content-Type: application/json" \
	-d '{"email":"aashish@example.com","password":"newpass123"}'
```

```json
{ "message": "Password updated successfully" }
```

#### `POST /api/auth/forgot-password`

```bash
curl -s -X POST "$BASE_URL/api/auth/forgot-password" \
	-H "Content-Type: application/json" \
	-d '{"email":"aashish@example.com"}'
```

```json
{ "message": "Reset link generated (check server console)" }
```

#### `POST /api/auth/reset-password`

```bash
curl -s -X POST "$BASE_URL/api/auth/reset-password" \
	-H "Content-Type: application/json" \
	-d '{"token":"RESET_TOKEN_FROM_CONSOLE","password":"newpass123"}'
```

```json
{ "message": "Password reset successfully" }
```

---

### Users (`/api/users`)

#### `GET /api/users/profile`

```bash
curl -s "$BASE_URL/api/users/profile" -H "$AUTH_HEADER"
```

```json
{ "_id": "...", "name": "Aashish", "email": "aashish@example.com", "dailyCalorieTarget": 2200, "dailyProteinTarget": 150 }
```

#### `PUT /api/users/profile`

```bash
curl -s -X PUT "$BASE_URL/api/users/profile" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"name":"Aashish","dietType":"vegetarian","dailyCalorieTarget":2100,"dailyProteinTarget":140}'
```

```json
{ "_id": "...", "name": "Aashish", "dietType": "vegetarian", "dailyCalorieTarget": 2100, "dailyProteinTarget": 140 }
```

#### `PATCH /api/users/profile`

```bash
curl -s -X PATCH "$BASE_URL/api/users/profile" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"avoidFoods":["peanuts"],"hydrationGoal":2500}'
```

```json
{ "_id": "...", "avoidFoods": ["peanuts"], "hydrationGoal": 2500 }
```

#### `GET /api/users/subscription`

```bash
curl -s "$BASE_URL/api/users/subscription" -H "$AUTH_HEADER"
```

```json
{ "plan": "free", "status": "active" }
```

#### `POST /api/users/subscription`

```bash
curl -s -X POST "$BASE_URL/api/users/subscription" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"plan":"premium"}'
```

```json
{ "success": true, "subscription": { "plan": "premium", "status": "active" } }
```

---

### Basic logs (`/api/logs`)

#### `GET /api/logs/fitness`

```bash
curl -s "$BASE_URL/api/logs/fitness" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "type": "strength", "focus": "upper", "intensity": 7, "fatigue": 5, "date": "..." }]
```

#### `GET /api/logs/nutrition`

```bash
curl -s "$BASE_URL/api/logs/nutrition" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "date": "...", "waterIntake": 1200, "dailyTotals": { "calories": 1850, "protein": 120 } }]
```

#### `GET /api/logs/mental`

```bash
curl -s "$BASE_URL/api/logs/mental" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "mood": "good", "stressLevel": 4, "energyLevel": 6, "date": "..." }]
```

#### `POST /api/logs/fitness` (token optional)

```bash
curl -s -X POST "$BASE_URL/api/logs/fitness" \
	-H "Content-Type: application/json" \
	-H "$AUTH_HEADER" \
	-d '{"type":"strength","focus":"upper","intensity":7,"fatigue":5,"notes":"Solid session"}'
```

```json
{ "_id": "...", "type": "strength", "focus": "upper", "intensity": 7, "fatigue": 5, "user": "..." }
```

#### `GET /api/logs/fitness/:userId` (back-compat)

```bash
curl -s "$BASE_URL/api/logs/fitness/USER_OBJECT_ID"
```

```json
[{ "_id": "...", "type": "strength", "date": "..." }]
```

#### `POST /api/logs/nutrition` (token optional)

```bash
curl -s -X POST "$BASE_URL/api/logs/nutrition" \
	-H "Content-Type: application/json" \
	-H "$AUTH_HEADER" \
	-d '{"date":"2025-12-30","waterIntake":1500,"meals":[],"dailyTotals":{"calories":0,"protein":0,"carbs":0,"fat":0}}'
```

```json
{ "_id": "...", "date": "...", "waterIntake": 1500, "user": "..." }
```

#### `GET /api/logs/nutrition/:userId` (back-compat)

```bash
curl -s "$BASE_URL/api/logs/nutrition/USER_OBJECT_ID"
```

```json
[{ "_id": "...", "date": "..." }]
```

#### `POST /api/logs/mental` (token required)

```bash
curl -s -X POST "$BASE_URL/api/logs/mental" \
	-H "Content-Type: application/json" \
	-H "$AUTH_HEADER" \
	-d '{"mood":"good","stressLevel":4,"energyLevel":6,"sleepHours":7.5,"notes":"Feeling okay"}'
```

```json
{ "_id": "...", "mood": "good", "stressLevel": 4, "energyLevel": 6, "user": "..." }
```

Common error (one check-in per day):

```json
{ "error": "Already checked in today", "log": { "_id": "..." } }
```

#### `POST /api/logs/mental/:userId` (back-compat)

```bash
curl -s -X POST "$BASE_URL/api/logs/mental/USER_OBJECT_ID" \
	-H "Content-Type: application/json" \
	-d '{"mood":"okay","stressLevel":5,"energyLevel":5}'
```

```json
{ "_id": "...", "mood": "okay", "user": "USER_OBJECT_ID" }
```

#### `GET /api/logs/mental/:userId` (back-compat)

```bash
curl -s "$BASE_URL/api/logs/mental/USER_OBJECT_ID"
```

```json
[{ "_id": "...", "mood": "good", "date": "..." }]
```

---

### Legacy goals (`/api/goals`)

#### `POST /api/goals`

```bash
curl -s -X POST "$BASE_URL/api/goals" \
	-H "Content-Type: application/json" \
	-d '{"user":"USER_OBJECT_ID","title":"Lose 5kg","type":"fitness","target":5}'
```

```json
{ "_id": "...", "user": "USER_OBJECT_ID", "title": "Lose 5kg", "type": "fitness" }
```

#### `GET /api/goals/:userId`

```bash
curl -s "$BASE_URL/api/goals/USER_OBJECT_ID"
```

```json
[{ "_id": "...", "title": "Lose 5kg" }]
```

---

### Gym (`/api/gym`)

#### `GET /api/gym/workouts`

```bash
curl -s "$BASE_URL/api/gym/workouts" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "name": "Workout - 12/30/2025", "duration": 3600, "date": "..." }]
```

#### `GET /api/gym/workouts/:id`

```bash
curl -s "$BASE_URL/api/gym/workouts/WORKOUT_ID" -H "$AUTH_HEADER"
```

```json
{ "_id": "WORKOUT_ID", "name": "Leg day", "exercises": [{"name":"Squat","muscleGroup":"legs","sets":[{"weight":100,"reps":5}]}] }
```

#### `POST /api/gym/workouts`

```bash
curl -s -X POST "$BASE_URL/api/gym/workouts" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"name":"Leg day","duration":3600,"exercises":[{"name":"Squat","muscleGroup":"legs","sets":[{"weight":100,"reps":5}]}]}'
```

```json
{ "_id": "...", "name": "Leg day", "user": "..." }
```

#### `PUT /api/gym/workouts/:id`

```bash
curl -s -X PUT "$BASE_URL/api/gym/workouts/WORKOUT_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"notes":"Felt strong"}'
```

```json
{ "_id": "WORKOUT_ID", "notes": "Felt strong" }
```

#### `DELETE /api/gym/workouts/:id`

```bash
curl -s -X DELETE "$BASE_URL/api/gym/workouts/WORKOUT_ID" -H "$AUTH_HEADER"
```

```json
{ "message": "Workout deleted" }
```

#### `GET /api/gym/stats`

```bash
curl -s "$BASE_URL/api/gym/stats" -H "$AUTH_HEADER"
```

```json
{ "totalWorkouts": 12, "weeklyWorkouts": 3, "monthlyWorkouts": 8, "totalVolume": 24500, "muscleDistribution": { "legs": 5 }, "personalRecords": { "Squat": { "maxWeight": 120, "maxVolume": 600 } } }
```

#### `GET /api/gym/workouts/range/:start/:end`

```bash
curl -s "$BASE_URL/api/gym/workouts/range/2025-12-01/2025-12-31" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "date": "2025-12-30T00:00:00.000Z" }]
```

---

### Habits (`/api/habits`)

#### `GET /api/habits`

```bash
curl -s "$BASE_URL/api/habits" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "name": "Walk", "frequency": "daily", "streak": 3, "isActive": true }]
```

#### `POST /api/habits`

```bash
curl -s -X POST "$BASE_URL/api/habits" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"name":"Walk","frequency":"daily","category":"health","targetPerDay":1}'
```

```json
{ "_id": "...", "name": "Walk", "frequency": "daily", "user": "..." }
```

#### `PUT /api/habits/:id`

```bash
curl -s -X PUT "$BASE_URL/api/habits/HABIT_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"targetPerDay":2}'
```

```json
{ "_id": "HABIT_ID", "targetPerDay": 2 }
```

#### `DELETE /api/habits/:id` (archives)

```bash
curl -s -X DELETE "$BASE_URL/api/habits/HABIT_ID" -H "$AUTH_HEADER"
```

```json
{ "message": "Habit archived" }
```

#### `GET /api/habits/logs?start=...&end=...`

```bash
curl -s "$BASE_URL/api/habits/logs?start=2025-12-01&end=2025-12-31" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "habit": "HABIT_ID", "date": "2025-12-30T00:00:00.000Z", "completed": true, "notes": "" }]
```

#### `GET /api/habits/logs/range?start=...&end=...` (completed-only)

```bash
curl -s "$BASE_URL/api/habits/logs/range?start=2025-12-01&end=2025-12-31" -H "$AUTH_HEADER"
```

```json
[{ "habit": "HABIT_ID", "date": "2025-12-30T00:00:00.000Z", "completed": true }]
```

#### `POST /api/habits/toggle`

```bash
curl -s -X POST "$BASE_URL/api/habits/toggle" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"habitId":"HABIT_ID","date":"2025-12-30","completed":true}'
```

```json
{ "log": { "_id": "...", "habit": "HABIT_ID", "completed": true }, "habit": { "_id": "HABIT_ID", "streak": 4 } }
```

#### `POST /api/habits/note`

```bash
curl -s -X POST "$BASE_URL/api/habits/note" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"habitId":"HABIT_ID","date":"2025-12-30","notes":"Tired but done"}'
```

```json
{ "_id": "...", "habit": "HABIT_ID", "notes": "Tired but done" }
```

#### `GET /api/habits/week?date=...`

```bash
curl -s "$BASE_URL/api/habits/week?date=2025-12-30" -H "$AUTH_HEADER"
```

```json
{ "start": "2025-12-29", "end": "2026-01-04", "habits": [{ "habit": {"_id":"HABIT_ID","name":"Walk"}, "days": [{"date":"2025-12-30","completed":true}] }] }
```

#### `GET /api/habits/stats`

```bash
curl -s "$BASE_URL/api/habits/stats" -H "$AUTH_HEADER"
```

```json
{ "totalActive": 4, "completedToday": 2, "streaks": [{ "habitId": "HABIT_ID", "name": "Walk", "streak": 4 }] }
```

#### `GET /api/habits/analytics`

```bash
curl -s "$BASE_URL/api/habits/analytics" -H "$AUTH_HEADER"
```

```json
{ "summary": { "overallCompletionRate": 68 }, "dailyData": [{ "date": "2025-12-30", "completed": 2 }], "heatmap": [{ "day": "Mon", "value": 3 }] }
```

---

### Long-term goals (`/api/long-term-goals`)

#### `GET /api/long-term-goals`

```bash
curl -s "$BASE_URL/api/long-term-goals" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "title": "No smoking", "type": "abstain", "streak": 12, "isActive": true }]
```

#### `POST /api/long-term-goals`

```bash
curl -s -X POST "$BASE_URL/api/long-term-goals" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"title":"No smoking","type":"abstain"}'
```

```json
{ "_id": "...", "title": "No smoking", "user": "..." }
```

#### `PUT /api/long-term-goals/:id`

```bash
curl -s -X PUT "$BASE_URL/api/long-term-goals/GOAL_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"title":"No nicotine"}'
```

```json
{ "_id": "GOAL_ID", "title": "No nicotine" }
```

#### `DELETE /api/long-term-goals/:id` (archives)

```bash
curl -s -X DELETE "$BASE_URL/api/long-term-goals/GOAL_ID" -H "$AUTH_HEADER"
```

```json
{ "message": "Goal archived" }
```

#### `POST /api/long-term-goals/log`

```bash
curl -s -X POST "$BASE_URL/api/long-term-goals/log" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"goalId":"GOAL_ID","date":"2025-12-30","status":"success","notes":"No cravings"}'
```

```json
{ "log": { "_id": "...", "goal": "GOAL_ID", "status": "success" }, "goal": { "_id": "GOAL_ID", "streak": 13 } }
```

#### `GET /api/long-term-goals/logs/:goalId`

```bash
curl -s "$BASE_URL/api/long-term-goals/logs/GOAL_ID" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "date": "2025-12-30T00:00:00.000Z", "status": "success" }]
```

#### `GET /api/long-term-goals/today`

```bash
curl -s "$BASE_URL/api/long-term-goals/today" -H "$AUTH_HEADER"
```

```json
{ "date": "2025-12-30", "items": [{ "goalId": "GOAL_ID", "status": "success" }] }
```

#### `GET /api/long-term-goals/analytics/:goalId`

```bash
curl -s "$BASE_URL/api/long-term-goals/analytics/GOAL_ID" -H "$AUTH_HEADER"
```

```json
{ "goal": { "_id": "GOAL_ID", "streak": 13 }, "weekly": [{ "week": "2025-W52", "success": 6, "relapse": 0 }], "topTriggers": ["stress"] }
```

---

### Journal (`/api/journal`)

#### `POST /api/journal`

```bash
curl -s -X POST "$BASE_URL/api/journal" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"text":"Today felt productive."}'
```

```json
{ "_id": "...", "user": "...", "text": "Today felt productive.", "date": "..." }
```

#### `GET /api/journal`

```bash
curl -s "$BASE_URL/api/journal" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "text": "Today felt productive.", "date": "..." }]
```

---

### Symptoms (`/api/symptoms`)

#### `GET /api/symptoms?start=&end=&symptomName=&tag=&limit=`

```bash
curl -s "$BASE_URL/api/symptoms?start=2025-12-01&end=2025-12-31&symptomName=headache&limit=50" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "symptomName": "headache", "severity": 6, "tags": ["screen"], "date": "..." }]
```

#### `POST /api/symptoms`

```bash
curl -s -X POST "$BASE_URL/api/symptoms" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"date":"2025-12-30","symptomName":"headache","severity":6,"notes":"Afternoon","tags":["screen"]}'
```

```json
{ "_id": "...", "symptomName": "headache", "severity": 6, "user": "..." }
```

#### `PATCH /api/symptoms/:id`

```bash
curl -s -X PATCH "$BASE_URL/api/symptoms/SYMPTOM_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"severity":4,"notes":"Improved"}'
```

```json
{ "_id": "SYMPTOM_ID", "severity": 4, "notes": "Improved" }
```

#### `DELETE /api/symptoms/:id`

```bash
curl -s -X DELETE "$BASE_URL/api/symptoms/SYMPTOM_ID" -H "$AUTH_HEADER"
```

```json
{ "message": "Deleted" }
```

---

### Labs (`/api/labs`)

#### `GET /api/labs?start=&end=&panelName=&limit=`

```bash
curl -s "$BASE_URL/api/labs?start=2025-01-01&end=2025-12-31&panelName=CBC&limit=50" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "panelName": "CBC", "date": "...", "results": [{"name":"Hemoglobin","value":12.1,"unit":"g/dL","flag":"low"}] }]
```

#### `GET /api/labs/latest`

```bash
curl -s "$BASE_URL/api/labs/latest" -H "$AUTH_HEADER"
```

```json
{ "_id": "...", "panelName": "CBC", "date": "...", "results": [] }
```

#### `POST /api/labs`

```bash
curl -s -X POST "$BASE_URL/api/labs" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"date":"2025-12-15","panelName":"CBC","results":[{"name":"Hemoglobin","value":12.1,"unit":"g/dL","refRangeLow":13.5,"refRangeHigh":17.5}],"notes":"Imported"}'
```

```json
{ "_id": "...", "panelName": "CBC", "results": [{"name":"Hemoglobin","value":12.1,"flag":"low"}] }
```

#### `PATCH /api/labs/:id`

```bash
curl -s -X PATCH "$BASE_URL/api/labs/LAB_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"notes":"Repeat in 3 months"}'
```

```json
{ "_id": "LAB_ID", "notes": "Repeat in 3 months" }
```

#### `DELETE /api/labs/:id`

```bash
curl -s -X DELETE "$BASE_URL/api/labs/LAB_ID" -H "$AUTH_HEADER"
```

```json
{ "message": "Deleted" }
```

---

### Style (`/api/style`)

#### `GET /api/style/wardrobe`

```bash
curl -s "$BASE_URL/api/style/wardrobe" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "category": "tops", "colors": ["black"], "favorite": false }]
```

#### `POST /api/style/wardrobe`

```bash
curl -s -X POST "$BASE_URL/api/style/wardrobe" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"category":"tops","colors":["black"],"occasions":["casual"],"seasons":["all"],"notes":"Basic tee"}'
```

```json
{ "_id": "...", "category": "tops", "colors": ["black"], "user": "..." }
```

#### `PUT /api/style/wardrobe/:id`

```bash
curl -s -X PUT "$BASE_URL/api/style/wardrobe/ITEM_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"favorite":true}'
```

```json
{ "_id": "ITEM_ID", "favorite": true }
```

#### `DELETE /api/style/wardrobe/:id`

```bash
curl -s -X DELETE "$BASE_URL/api/style/wardrobe/ITEM_ID" -H "$AUTH_HEADER"
```

```json
{ "message": "Deleted" }
```

#### `POST /api/style/suggest`

```bash
curl -s -X POST "$BASE_URL/api/style/suggest" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"occasion":"date night","weather":"cool"}'
```

```json
{ "outfit": [{ "itemId": "...", "reason": "Pairs well" }], "notes": "..." }
```

#### `GET /api/style/stats`

```bash
curl -s "$BASE_URL/api/style/stats" -H "$AUTH_HEADER"
```

```json
{ "byCategory": { "tops": 6 }, "byColor": { "black": 4 }, "favorites": 2 }
```

---

### Advanced nutrition (`/api/nutrition`)

#### `GET /api/nutrition/logs`

```bash
curl -s "$BASE_URL/api/nutrition/logs" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "date": "...", "dailyTotals": { "calories": 1850, "protein": 120 } }]
```

#### `GET /api/nutrition/logs/date/:date`

```bash
curl -s "$BASE_URL/api/nutrition/logs/date/2025-12-30" -H "$AUTH_HEADER"
```

```json
{ "date": "2025-12-30T00:00:00.000Z", "meals": [], "waterIntake": 0, "dailyTotals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sugar": 0, "sodium": 0 } }
```

#### `GET /api/nutrition/logs/date/:userId/:date` (back-compat)

```bash
curl -s "$BASE_URL/api/nutrition/logs/date/USER_OBJECT_ID/2025-12-30" -H "$AUTH_HEADER"
```

```json
{ "date": "2025-12-30T00:00:00.000Z", "meals": [], "waterIntake": 0, "dailyTotals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "sugar": 0, "sodium": 0 } }
```

#### `POST /api/nutrition/logs` (upsert day)

```bash
curl -s -X POST "$BASE_URL/api/nutrition/logs" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{
		"date":"2025-12-30",
		"waterIntake":1200,
		"notes":"",
		"meals":[{"mealType":"breakfast","foods":[{"name":"Eggs","calories":140,"protein":12,"carbs":1,"fat":10,"fiber":0,"sugar":0,"sodium":120}]}]
	}'
```

```json
{ "_id": "...", "date": "...", "dailyTotals": { "calories": 140, "protein": 12, "carbs": 1, "fat": 10, "fiber": 0, "sugar": 0, "sodium": 120 } }
```

#### `POST /api/nutrition/logs/:userId` (back-compat)

```bash
curl -s -X POST "$BASE_URL/api/nutrition/logs/USER_OBJECT_ID" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"date":"2025-12-30","meals":[]}'
```

```json
{ "_id": "...", "date": "...", "meals": [] }
```

#### `POST /api/nutrition/meals` (add one meal)

```bash
curl -s -X POST "$BASE_URL/api/nutrition/meals" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"date":"2025-12-30","meal":{"mealType":"lunch","foods":[{"name":"Rice","calories":250,"protein":5,"carbs":55,"fat":1}]}}'
```

```json
{ "_id": "...", "meals": [{ "mealType": "lunch", "totalCalories": 250 }] }
```

#### `PATCH /api/nutrition/water` (increment)

```bash
curl -s -X PATCH "$BASE_URL/api/nutrition/water" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"date":"2025-12-30","amount":500}'
```

```json
{ "_id": "...", "waterIntake": 1700 }
```

#### `DELETE /api/nutrition/meals/:logId/:mealIndex`

```bash
curl -s -X DELETE "$BASE_URL/api/nutrition/meals/LOG_ID/0" -H "$AUTH_HEADER"
```

```json
{ "_id": "LOG_ID", "meals": [], "dailyTotals": { "calories": 0 } }
```

#### `GET /api/nutrition/stats`

```bash
curl -s "$BASE_URL/api/nutrition/stats" -H "$AUTH_HEADER"
```

```json
{ "weeklyAvg": { "calories": 1900, "protein": 120, "daysLogged": 5 }, "monthlyAvg": { "calories": 2000, "protein": 125, "daysLogged": 18 }, "mealTypeCount": { "breakfast": 10 }, "goals": { "calories": 2000, "protein": 150 } }
```

#### `GET /api/nutrition/logs/range/:start/:end`

```bash
curl -s "$BASE_URL/api/nutrition/logs/range/2025-12-01/2025-12-31" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "date": "2025-12-30T00:00:00.000Z" }]
```

#### `GET /api/nutrition/search?q=...`

```bash
curl -s "$BASE_URL/api/nutrition/search?q=chicken%20breast" -H "$AUTH_HEADER"
```

```json
[{ "name": "Chicken breast", "source": "local" }, { "name": "Chicken breast", "source": "fatsecret" }]
```

#### `GET /api/nutrition/food/resolve?q=...`

```bash
curl -s "$BASE_URL/api/nutrition/food/resolve?q=milk" -H "$AUTH_HEADER"
```

```json
{ "input": "milk", "canonical": { "kind": "food", "key": "food:milk" }, "confidence": 0.8 }
```

#### `GET /api/nutrition/food/analyze?q=...&includeLLM=0|1`

```bash
curl -s "$BASE_URL/api/nutrition/food/analyze?q=milk&includeLLM=0" -H "$AUTH_HEADER"
```

```json
{ "input": "milk", "resolved": { "canonical_id": "food:milk" }, "nutrition": { "macros": { "protein": 8 } }, "uncertainty": { "notes": [] } }
```

#### `POST /api/nutrition/food/analyze`

```bash
curl -s -X POST "$BASE_URL/api/nutrition/food/analyze" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"foodName":"milk","includeLLM":false}'
```

```json
{ "input": "milk", "resolved": { "canonical_id": "food:milk" }, "derived": { "glycemicLoad": "..." } }
```

#### `GET /api/nutrition/food/graph?canonical_id=...`

```bash
curl -s "$BASE_URL/api/nutrition/food/graph?canonical_id=food:milk" -H "$AUTH_HEADER"
```

```json
{ "canonical_id": "food:milk", "edges": [{ "predicate": "has_nutrient", "toKey": "nutrient:calcium" }] }
```

#### `GET /api/nutrition/food/causal?canonical_id=...`

```bash
curl -s "$BASE_URL/api/nutrition/food/causal?canonical_id=food:milk" -H "$AUTH_HEADER"
```

```json
{ "canonical_id": "food:milk", "causal_links": [{ "cause": "lactose", "effect": "GI symptoms", "evidence": "..." }] }
```

#### `GET /api/nutrition/hypotheses`

```bash
curl -s "$BASE_URL/api/nutrition/hypotheses" -H "$AUTH_HEADER"
```

```json
[{ "_id": "...", "foodName": "milk", "status": "active", "createdAt": "..." }]
```

#### `POST /api/nutrition/hypotheses/generate`

```bash
curl -s -X POST "$BASE_URL/api/nutrition/hypotheses/generate" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"foodName":"milk","includeLLM":false}'
```

```json
{ "hypothesis": { "_id": "...", "foodName": "milk", "claim": "..." }, "analysis": { "resolved": { "canonical_id": "food:milk" } } }
```

#### `PATCH /api/nutrition/hypotheses/:id/feedback`

```bash
curl -s -X PATCH "$BASE_URL/api/nutrition/hypotheses/HYPOTHESIS_ID/feedback" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"outcome":"support","note":"Felt better on days without it"}'
```

```json
{ "_id": "HYPOTHESIS_ID", "feedback": [{ "outcome": "support", "note": "Felt better on days without it" }] }
```

---

### Daily insights (`/api/insights`)

#### `GET /api/insights/daily?date=...&refresh=0|1&includeNarrative=0|1&narrativeRefresh=0|1`

```bash
curl -s "$BASE_URL/api/insights/daily?date=2025-12-30&refresh=0" -H "$AUTH_HEADER"
```

```json
{ "_id": "...", "date": "2025-12-30T00:00:00.000Z", "nutrition": { "summary": "...", "bullets": ["..."] }, "symptoms": { "windowDays": 2, "items": [] }, "labs": { "windowDays": 14, "items": [] } }
```

#### `POST /api/insights/daily/recompute`

```bash
curl -s -X POST "$BASE_URL/api/insights/daily/recompute" \
	-H "$AUTH_HEADER" -H "Content-Type: application/json" \
	-d '{"date":"2025-12-30","includeNarrative":false}'
```

```json
{ "_id": "...", "date": "2025-12-30T00:00:00.000Z", "nutrition": { "bullets": ["..."] } }
```

---

### AI assistant (`/api/ai`)

#### `POST /api/ai/chat` (auth optional)

```bash
curl -s -X POST "$BASE_URL/api/ai/chat" \
	-H "Content-Type: application/json" \
	-H "$AUTH_HEADER" \
	-d '{"message":"Give me a short plan for today","history":[]}'
```

```json
{ "mode": "general", "reply": "...", "safety": { "risk_level": "low" }, "memorySnapshot": { "ragCitationsCount": 0, "ragConfidence": 0 } }
```

If you omit auth:

```bash
curl -s -X POST "$BASE_URL/api/ai/chat" \
	-H "Content-Type: application/json" \
	-d '{"message":"What should I eat post workout?","history":[]}'
```

```json
{ "mode": "fitness", "reply": "...", "safety": { "risk_level": "low" } }
```

---

## Endpoint list (note)

The full endpoint list with request/response examples is documented in **API examples (curl)** above.

---

## Email reminders

The server loads `server/services/reminderScheduler.js` at boot.

- Runs every 5 minutes via `node-cron`.
- Sends email reminders when `user.reminders.email=true` and the current time matches configured reminder times.

Requires:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

---

## Optional: AI textbook RAG microservice (`ai_service/`)

This is a separate FastAPI service used only for medical-mode citations.

### Run

```bash
cd ai_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Endpoint

- `POST http://localhost:8000/rag/answer`
	- Request: `{ question, top_k?, collection?, persist_dir? }`
	- Response: `{ answer, citations, confidence }`
	- Guardrail: returns an explicit "I don't know" when retrieval confidence is low.

---

## Seed scripts

Server has multiple seed helpers under `server/`.

Common entry points:

- `node seed.js`
- `node seed-meal-pipeline.js`
- `node seed-nutrition-knowledge.js`
- `node seed-disease-profiles.js`

Always point `MONGO_URI` at a dev database before seeding.

---

## Troubleshooting

- **AI replies are always fallback**: set `GROQ_API_KEY` or `OPENAI_API_KEY`.
- **RAG isn’t used**: ensure `AI_SERVICE_URL` points at the running `ai_service`.
- **Client can’t reach server**: ensure Vite proxy is enabled (default) or set `VITE_API_BASE_URL`.
- **Reminders don’t send**: ensure `GMAIL_USER`/`GMAIL_APP_PASSWORD` are set and reminder times match HH:mm.
- **Nutrition external search empty**: configure FatSecret env vars; otherwise it returns local results only.

---

## Disclaimer

LifeSync is not a medical product. AI outputs are informational and non-diagnostic.
