require('dotenv').config();

const mongoose = require('mongoose');

const PatternMemory = require('../models/PatternMemory');
const IdentityMemory = require('../models/IdentityMemory');

const { ensureTestUserAndReset } = require('./test_create_user');
const {
  loginGetToken,
  seedMental,
  seedNutrition,
  seedFitness,
  seedMemoryOverride,
  triggerDailyLifeState,
  chat,
} = require('./test_seed_helpers');

function dayKeyPlus(dayKey, deltaDays) {
  const [y, m, d] = String(dayKey).split('-').map((x) => Number(x));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

async function ensureDailyComputed(token, dayKey) {
  // Force compute on read via the real route.
  return triggerDailyLifeState({ token, dayKey, refresh: true });
}

async function scenarioA({ token, userId }) {
  const dayKey = '2025-01-01';

  await seedMental(dayKey, { sleep: 5, stress: 7, energy: 3 }, { userId });
  await seedNutrition(dayKey, { calories: 1800, water: 1200 }, { token });
  // no workout

  const { dailyLifeState, reflection } = await ensureDailyComputed(token, dayKey);
  return {
    dayKey,
    summaryLabel: dailyLifeState?.summaryState?.label,
    summaryConfidence: Number(dailyLifeState?.summaryState?.confidence) || 0,
    reflection,
  };
}

async function seedSleepEnergyAlternating({ token, userId, startDayKey, days }) {
  for (let i = 0; i < days; i++) {
    const dayKey = dayKeyPlus(startDayKey, i);
    const isLowSleepDay = i % 2 === 0; // Day1 low, Day2 normal...
    const prevWasLowSleep = i > 0 && (i - 1) % 2 === 0;

    await seedMental(
      dayKey,
      {
        sleep: isLowSleepDay ? 5 : 7,
        stress: 4,
        // Model the "next day" effect the pattern engine looks for.
        // Energy is low on days AFTER low-sleep days.
        energy: prevWasLowSleep ? 3 : 6,
      },
      { userId }
    );

    await seedNutrition(dayKey, { calories: 2000, water: 2000 }, { token });

    // Ensure derived pipeline runs through real route.
    await ensureDailyComputed(token, dayKey);
  }
}

async function waitForPatternAndIdentity({ userId, timeoutMs = 5000, pollMs = 200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { pattern, identities } = await readPatternAndIdentity({ userId });
    if (pattern) {
      // Identity is optional depending on thresholds; give it a short chance.
      if (identities && identities.length) return { pattern, identities };
      // If pattern exists but identity doesn't, still return after a brief wait.
      if (Date.now() - start > Math.min(1500, timeoutMs)) return { pattern, identities };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return readPatternAndIdentity({ userId });
}

async function readPatternAndIdentity({ userId }) {
  const patternKey = 'next_day:low_sleep=>low_energy';

  const pattern = await PatternMemory.findOne({ user: userId, patternKey }).lean();
  const identities = await IdentityMemory.find({ user: userId }).lean();

  const interestingIdentities = identities
    .filter((d) => ['sleep_keystone', 'stress_sensitive', 'training_overreach_risk', 'nutrition_sensitive'].includes(d.identityKey))
    .sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));

  return {
    pattern: pattern
      ? {
          patternKey: pattern.patternKey,
          supportCount: pattern.supportCount,
          confidence: Number(pattern.confidence) || 0,
          status: pattern.status,
        }
      : null,
    identities: interestingIdentities.map((im) => ({
      identityKey: im.identityKey,
      confidence: Number(im.confidence) || 0,
      stabilityScore: Number(im.stabilityScore) || 0,
      status: im.status,
    })),
  };
}

async function scenarioBtoC({ token, userId, withOverride }) {
  const startDayKey = '2025-01-01';

  if (withOverride) {
    await seedMemoryOverride(
      {
        startDayKey: '2025-01-01',
        endDayKey: '2025-01-21',
        scope: 'sleep',
        strength: 0.6,
        type: 'temporary_phase',
        note: 'test attenuation',
      },
      { userId }
    );
  }

  // Seed Day 1-21 (enough support to push confidence >= 0.6).
  await seedSleepEnergyAlternating({ token, userId, startDayKey, days: 21 });

  // Recompute latest day once more for stability.
  await ensureDailyComputed(token, '2025-01-21');

  return waitForPatternAndIdentity({ userId });
}

async function scenarioChat({ token }) {
  const dayKey = '2025-01-21';

  const r1 = await chat({
    token,
    dayKey,
    message: 'How am I doing today?',
  });

  const r2 = await chat({
    token,
    dayKey,
    message: 'Why do I feel tired so often?',
  });

  return {
    message1: r1?.reply,
    message2: r2?.reply,
  };
}

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';

  console.log('--- Step 1: Create isolated users (no deletes) ---');
  const userControl = await ensureTestUserAndReset({ mongoUri, clear: false });
  const userOverride = await ensureTestUserAndReset({ mongoUri, clear: false });
  console.log('control userId:', userControl.userId);
  console.log('control email:', userControl.email);
  console.log('control password:', userControl.password);
  console.log('override userId:', userOverride.userId);
  console.log('override email:', userOverride.email);
  console.log('override password:', userOverride.password);

  console.log('\n--- Step 2: Login via real route ---');
  const tokenControl = await loginGetToken({ email: userControl.email, password: userControl.password });
  const tokenOverride = await loginGetToken({ email: userOverride.email, password: userOverride.password });
  console.log('token control ok:', Boolean(tokenControl));
  console.log('token override ok:', Boolean(tokenOverride));

  console.log('\n--- Scenario A: DailyLifeState sanity (control) ---');
  const a = await scenarioA({ token: tokenControl, userId: userControl.userId });
  console.log('dayKey:', a.dayKey);
  console.log('summaryState.label:', a.summaryLabel);
  console.log('summaryState.confidence:', a.summaryConfidence.toFixed(3));
  console.log('reflection header:', a.reflection || '(none)');

  console.log('\n--- Scenario B/C CONTROL (no override): seed 21 days ---');
  const control = await scenarioBtoC({ token: tokenControl, userId: userControl.userId, withOverride: false });
  console.log('Pattern (control):', control.pattern || '(missing)');
  console.log('Identities (control):', control.identities.length ? control.identities : '(none)');

  console.log('\n--- Scenario D (with MemoryOverride): seed 21 days (override user) ---');
  const withOverride = await scenarioBtoC({ token: tokenOverride, userId: userOverride.userId, withOverride: true });
  console.log('Pattern (override):', withOverride.pattern || '(missing)');
  console.log('Identities (override):', withOverride.identities.length ? withOverride.identities : '(none)');

  console.log('\n--- Scenario D check: attenuation effect (qualitative) ---');
  if (control.pattern && withOverride.pattern) {
    console.log('pattern confidence control:', Number(control.pattern.confidence).toFixed(3));
    console.log('pattern confidence override:', Number(withOverride.pattern.confidence).toFixed(3));
    if (Number(withOverride.pattern.confidence) < Number(control.pattern.confidence) - 1e-6) {
      console.log('OK: confidence lower with override (slower reinforcement).');
    } else {
      console.log('NOTE: confidence not lower; check override dates/scope/strength and that patternKey matches.');
    }
  }

  console.log('\n--- Scenario F: AI chat behavior ---');
  const chatOut = await scenarioChat({ token: tokenOverride });
  console.log('Message 1 reply:', chatOut.message1);
  console.log('Message 2 reply:', chatOut.message2);

  console.log('\nManual checks (UI):');
  console.log('- Start client and server dev tasks');
  console.log(`- Log in as ${userControl.email} (control) or ${userOverride.email} (override)`);
  console.log('- Dashboard should show calm reflection or silence; never advice/explanations');
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[test_cycle_run] failed:', err?.message || err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    });
}
