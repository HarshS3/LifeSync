// Seed weight logs for the demo/showcase user (idempotent, safe).
//
// Usage (PowerShell):
//   $env:MONGO_URI="mongodb://localhost:27017/lifesync"
//   $env:SEED_DEMO_EMAIL="demo.user@lifesync.local"  # optional
//   node .\seed_weight_logs_demo.js
//
// Notes:
// - Does NOT delete existing data; it only creates missing days.
// - Skips in production by default.

require('dotenv').config();

const mongoose = require('mongoose');

const User = require('./models/User');
const { WeightLog } = require('./models/Logs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
const LOCAL_MONGO_URI = process.env.MONGO_URI_LOCAL || 'mongodb://localhost:27017/lifesync';
const ALLOW_LOCAL_FALLBACK = String(process.env.MONGO_URI_FALLBACK_LOCAL || '1').trim() !== '0';

const SEED_DEMO_EMAIL =
  process.env.SEED_TEST_EMAIL ||
  process.env.SEED_DEMO_EMAIL ||
  'testuser@example.com';
const DAYS = Math.max(7, Math.min(120, Number(process.env.SEED_WEIGHT_DAYS || 30)));

function dayAtMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayAtMidnight(d);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Deterministic pseudo-random (so the seed is stable across runs)
function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const isProd = String(process.env.NODE_ENV || '').trim() === 'production';
  const allowProd = String(process.env.SEED_ALLOW_PROD || '0').trim() === '1';
  if (isProd && !allowProd) {
    console.error('Refusing to seed weight logs in production. Set SEED_ALLOW_PROD=1 to override.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
  } catch (err) {
    const msg = String(err?.message || '');
    const code = String(err?.code || '');
    const looksLikeSrvDns =
      msg.includes('querySrv') ||
      msg.includes('mongodb+srv') ||
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN';

    if (!isProd && ALLOW_LOCAL_FALLBACK && looksLikeSrvDns && MONGO_URI !== LOCAL_MONGO_URI) {
      console.warn('[seed:weight] Primary Mongo connection failed. Falling back to local MongoDB for dev.');
      await mongoose.connect(LOCAL_MONGO_URI);
    } else {
      throw err;
    }
  }

  const user = await User.findOne({ email: SEED_DEMO_EMAIL }).select('_id weight');
  if (!user) {
    console.error(`Showcase user not found for email ${SEED_DEMO_EMAIL}. Run seed_test_user_safe.js (or set SEED_TEST_EMAIL) first.`);
    process.exit(1);
  }

  const base = Number(user.weight) && Number.isFinite(Number(user.weight)) ? Number(user.weight) : 75;

  // Gentle downward trend with realistic noise.
  // Example: ~0.6kg over 30 days, plus day-to-day variations.
  const trendPerDay = -0.02;

  let created = 0;
  let skipped = 0;

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = daysAgo(i);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const exists = await WeightLog.findOne({
      user: user._id,
      date: { $gte: date, $lt: end },
    }).select('_id');

    if (exists) {
      skipped++;
      continue;
    }

    const rand = mulberry32(1000 + i);
    const weeklyWave = Math.sin((2 * Math.PI * (DAYS - i)) / 7) * 0.25; // water retention-ish
    const noise = (rand() - 0.5) * 0.35; // +/- 0.175
    const weightKg = clamp(base + trendPerDay * (DAYS - i) + weeklyWave + noise, 35, 250);

    await WeightLog.create({
      user: user._id,
      date,
      weightKg: Number(weightKg.toFixed(1)),
    });

    created++;
  }

  console.log(`[seed:weight] user=${String(user._id)} days=${DAYS} created=${created} skipped=${skipped}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:weight] failed', err);
  process.exit(1);
});
