/*
  Smoke test: chat ingestion -> logs -> DailyLifeState.

  Usage (from repo root):
    cd server
    node ./scripts/dev_chat_ingestion_smoke.js

  Requires:
  - Server running locally on PORT (default 5000)
  - MongoDB reachable (server already connected)
*/

const BASE_URL = (process.env.LIFESYNC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

function dayKeyFromDate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _nonJson: text };
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${method} ${path}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

async function ensureUserAndToken() {
  const stamp = Date.now();
  const email = `smoke.chat.ingestion+${stamp}@example.com`;
  const password = 'Password123!';
  const name = 'Smoke Test';

  try {
    const reg = await requestJson('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    return { token: reg.token, email, password, user: reg.user };
  } catch (e) {
    // If email collision happens (rare), try login.
    if (e?.status === 400) {
      const login = await requestJson('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      return { token: login.token, email, password, user: login.user };
    }
    throw e;
  }
}

function pickTodayLog(logs) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  for (const l of Array.isArray(logs) ? logs : []) {
    const t = new Date(l?.date);
    if (Number.isFinite(t.getTime()) && t >= start && t < end) return l;
  }
  return Array.isArray(logs) && logs.length ? logs[0] : null;
}

async function main() {
  console.log(`[smoke] Base URL: ${BASE_URL}`);

  const health = await requestJson('/api/health');
  console.log('[smoke] Health:', health);

  const { token, user } = await ensureUserAndToken();
  console.log('[smoke] Authenticated as:', user?.email || user?.id);

  const message = 'slept 7 hours. my energy was 6 out of 10. stress level is six out of ten. mood good. drank 1500 ml water';

  const chat = await requestJson('/api/ai/chat', {
    method: 'POST',
    token,
    body: { message, history: [] },
  });

  const ingestion = chat?.memorySnapshot?.chatIngestion;
  console.log('[smoke] Chat ingestion returned:', ingestion);

  // Give async recompute a moment (route also supports refresh=1 below).
  await sleep(400);

  const dayKey = ingestion?.dayKey || dayKeyFromDate(new Date());

  const mentalLogs = await requestJson('/api/logs/mental', { token });
  const todayMental = pickTodayLog(mentalLogs);
  console.log('[smoke] Today mental log (selected):', {
    id: todayMental?._id,
    date: todayMental?.date,
    sleepHours: todayMental?.sleepHours,
    energyLevel: todayMental?.energyLevel,
    stressLevel: todayMental?.stressLevel,
    mood: todayMental?.mood,
  });

  const nutritionLogs = await requestJson('/api/logs/nutrition', { token });
  const todayNutrition = pickTodayLog(nutritionLogs);
  console.log('[smoke] Today nutrition log (selected):', {
    id: todayNutrition?._id,
    date: todayNutrition?.date,
    waterIntake: todayNutrition?.waterIntake,
    dailyTotals: todayNutrition?.dailyTotals,
  });

  const dls = await requestJson(`/api/daily-life-state/${encodeURIComponent(dayKey)}?refresh=1`, { token });
  console.log('[smoke] DailyLifeState signals snapshot:', {
    dayKey: dls?.dayKey,
    summaryState: dls?.summaryState,
    sleep: dls?.signals?.sleep,
    energy: dls?.signals?.energy,
    stress: dls?.signals?.stress,
    mood: dls?.signals?.mood,
    nutrition: dls?.signals?.nutrition,
  });

  const ok = Boolean(todayMental?.energyLevel) && Boolean(todayMental?.stressLevel) && Boolean(todayMental?.sleepHours);
  console.log(`[smoke] Result: ${ok ? 'PASS' : 'CHECK'} (look at logs/signals above)`);
}

main().catch((err) => {
  console.error('[smoke] FAILED:', err?.message || err);
  if (err?.payload) console.error('[smoke] payload:', err.payload);
  process.exit(1);
});
