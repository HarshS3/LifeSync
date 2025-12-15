# LifeSync

LifeSync is a personal wellness and lifestyle intelligence platform built on a MERN stack with an AI-ready memory engine.

## Tech Stack

- Client: React (Vite, JavaScript) + MUI
- Server: Node.js + Express
- Database: MongoDB (via Mongoose)
- AI: Groq (preferred) or OpenAI-compatible LLM via a memory-aware API layer

## Running the project

1. Start MongoDB locally (default URI: `mongodb://localhost:27017/lifesync`).
2. In one terminal, run the backend:

```bash
cd server
npm run dev
```

3. In a second terminal, run the frontend:

```bash
cd client
npm run dev
```

The client expects the API at `http://localhost:5000` by default. You can override this with `VITE_API_BASE_URL` in `client/.env`.

## Current MVP features

- Persistent user baseline (body, medical, preferences) with `/api/users/profile`
- Fitness, nutrition, and mental health logs via `/api/logs/*`
- Goal creation via `/api/goals`
- Memory-aware AI stub at `/api/ai/chat` that inspects recent logs and emits a contextual reply
- Non-generic, AI-inspired UI shell with sections for Profile, Logs, Mental space, Goals, and AI Companion

## Notes

- The AI layer can use Groq (recommended) or OpenAI when the corresponding API key is configured in `server/.env`.
- If no key is provided, the system falls back to a deterministic but still memory-aware response.
- This app is not a medical product and should not be treated as clinical advice.
