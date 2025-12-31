# LifeSync Client

React + Vite frontend for LifeSync.

## Local dev

```bash
cd client
npm install
npm run dev
```

Default URL: `http://localhost:5173`

The client calls the API at `http://localhost:5000` (via config/proxy).

## Config

Optional: set a custom API base in `client/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

## Notes

- UI is being refactored away from “DailyInsights” toward calm, gated reflections derived from `DailyLifeState`.
- Chat is designed to be low-friction and non-prescriptive (silence / reflect by default).
