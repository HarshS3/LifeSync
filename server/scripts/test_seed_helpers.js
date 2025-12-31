require('dotenv').config();

const mongoose = require('mongoose');

const { MentalLog, NutritionLog, FitnessLog } = require('../models/Logs');
const MemoryOverride = require('../models/MemoryOverride');

function apiBase() {
  return String(process.env.API_BASE || 'http://localhost:5000').replace(/\/$/, '');
}

function isDayKey(dayKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || '').trim());
}

function dateForDayKeyLocalNoon(dayKey) {
  // Local noon prevents timezone edge cases with local dayKey computation.
  return new Date(`${dayKey}T12:00:00`);
}

async function apiFetch(path, { method = 'GET', token, body, headers } = {}) {
  const url = `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;

  const h = {
    ...(headers || {}),
  };

  if (token) h.Authorization = `Bearer ${token}`;
  if (body != null) h['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers: h,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json, headers: res.headers, text };
}

async function loginGetToken({ email, password }) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (!res.ok || !res.json?.token) {
    throw new Error(`Login failed (${res.status}): ${res.text || res.json?.error || 'unknown'}`);
  }

  return res.json.token;
}

async function triggerDailyLifeState({ token, dayKey, refresh = true }) {
  if (!isDayKey(dayKey)) throw new Error('Invalid dayKey');

  const qs = refresh ? '?refresh=1' : '';
  const res = await apiFetch(`/api/daily-life-state/${dayKey}${qs}`, {
    method: 'GET',
    token,
  });

  if (!res.ok) {
    throw new Error(`GET daily-life-state failed (${res.status}): ${res.text || res.json?.error || 'unknown'}`);
  }

  const reflection = res.headers.get('x-lifesync-state-reflection');
  return { dailyLifeState: res.json, reflection: reflection || null };
}

async function seedNutrition(dayKey, { calories, water } = {}, { token } = {}) {
  if (!isDayKey(dayKey)) throw new Error('Invalid dayKey');

  const date = dateForDayKeyLocalNoon(dayKey);
  const cal = Number(calories) || 0;
  const waterIntake = Number(water) || 0;

  const body = {
    date,
    waterIntake,
    meals: cal
      ? [
          {
            name: 'Seed meal',
            mealType: 'snack',
            time: '12:00',
            foods: [
              {
                name: 'Seed calories',
                quantity: 1,
                unit: 'serving',
                calories: cal,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: 0,
                sodium: 0,
              },
            ],
          },
        ]
      : [],
    dailyTotals: {
      calories: cal,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    },
    notes: 'seed',
  };

  const res = await apiFetch('/api/logs/nutrition', {
    method: 'POST',
    token,
    body,
  });

  if (!res.ok) {
    throw new Error(`POST /api/logs/nutrition failed (${res.status}): ${res.text || res.json?.error || 'unknown'}`);
  }

  return res.json;
}

async function seedFitness(dayKey, { intensity, fatigue } = {}, { token } = {}) {
  if (!isDayKey(dayKey)) throw new Error('Invalid dayKey');

  const date = dateForDayKeyLocalNoon(dayKey);

  const body = {
    date,
    type: 'seed',
    focus: 'seed',
    intensity: Number(intensity) || 5,
    fatigue: Number(fatigue) || 5,
    notes: 'seed',
  };

  const res = await apiFetch('/api/logs/fitness', {
    method: 'POST',
    token,
    body,
  });

  if (!res.ok) {
    throw new Error(`POST /api/logs/fitness failed (${res.status}): ${res.text || res.json?.error || 'unknown'}`);
  }

  return res.json;
}

async function seedMental(dayKey, { sleep, stress, energy } = {}, { userId, mongoUri } = {}) {
  // NOTE: Existing API route (/api/logs/mental) only allows "today" and blocks backfilled dates.
  // For repeatable, multi-day scenarios we must write MentalLog directly.
  if (!isDayKey(dayKey)) throw new Error('Invalid dayKey');
  if (!userId) throw new Error('seedMental requires userId');

  const MONGO_URI = String(mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }

  const date = dateForDayKeyLocalNoon(dayKey);

  // Ensure idempotency for reruns: one log per dayKey.
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // Non-destructive: upsert a single canonical MentalLog per day.
  await MentalLog.updateOne(
    { user: userId, date: { $gte: start, $lt: end } },
    {
      $set: {
        user: userId,
        date,
        mood: 'neutral',
        moodScore: 5,
        sleepHours: Number(sleep) || 0,
        stressLevel: Number(stress) || 0,
        energyLevel: Number(energy) || 0,
        notes: 'seed',
      },
    },
    { upsert: true }
  );

  return MentalLog.findOne({ user: userId, date: { $gte: start, $lt: end } });
}

async function seedMemoryOverride({ startDayKey, endDayKey, scope, strength, type, note } = {}, { userId, mongoUri } = {}) {
  if (!userId) throw new Error('seedMemoryOverride requires userId');
  if (!isDayKey(startDayKey) || !isDayKey(endDayKey)) throw new Error('Invalid dayKey range');

  const MONGO_URI = String(mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }

  // Non-destructive: upsert exact range+scope for reruns.
  const doc = {
    user: userId,
    startDayKey,
    endDayKey,
    scope: String(scope || 'all'),
    type: String(type || 'temporary_phase'),
    strength: typeof strength === 'number' ? strength : Number(strength || 0.5),
    note: note ? String(note) : '',
  };

  await MemoryOverride.updateOne(
    { user: userId, startDayKey, endDayKey, scope: doc.scope },
    { $set: doc },
    { upsert: true }
  );

  return MemoryOverride.findOne({ user: userId, startDayKey, endDayKey, scope: doc.scope });
}

async function chat({ token, message, dayKey }) {
  const body = { message };
  if (dayKey) body.dayKey = dayKey;

  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    token,
    body,
  });

  if (!res.ok) {
    throw new Error(`POST /api/ai/chat failed (${res.status}): ${res.text || res.json?.error || 'unknown'}`);
  }

  return res.json;
}

module.exports = {
  apiFetch,
  apiBase,
  loginGetToken,
  triggerDailyLifeState,
  seedMental,
  seedNutrition,
  seedFitness,
  seedMemoryOverride,
  chat,
};
