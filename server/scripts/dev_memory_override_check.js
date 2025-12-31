/*
Dev-only helper.

Usage (PowerShell example):
  $env:MONGO_URI='mongodb://localhost:27017/lifesync'
  $env:USER_ID='...'
  $env:DAY_KEY='2025-12-31'
  $env:DEBUG_MEMORY_OVERRIDE='1'
  node scripts/dev_memory_override_check.js

Optional:
  $env:SCOPE='sleep'
  $env:TYPE='temporary_phase'
  $env:STRENGTH='0.6'
  $env:NOTE='exam week'
*/

require('dotenv').config();
const mongoose = require('mongoose');

const MemoryOverride = require('../models/MemoryOverride');
const { computePatternMemory } = require('../services/patternMemory/computePatternMemory');
const PatternMemory = require('../models/PatternMemory');

const DEBUG_ENABLED = String(process.env.DEBUG_MEMORY_OVERRIDE || '').trim() === '1';

function log(...args) {
  if (!DEBUG_ENABLED) return;
  console.log('[dev_memory_override_check]', ...args);
}

function mustEnv(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function main() {
  const MONGO_URI = String(process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync');
  const userId = mustEnv('USER_ID');
  const dayKey = mustEnv('DAY_KEY');

  const scope = String(process.env.SCOPE || 'all').trim();
  const type = String(process.env.TYPE || 'temporary_phase').trim();
  const strength = Number(process.env.STRENGTH || '0.5');
  const note = String(process.env.NOTE || '').trim();

  await mongoose.connect(MONGO_URI);

  // Create override (idempotent-ish for this exact range).
  const created = await MemoryOverride.create({
    user: userId,
    startDayKey: dayKey,
    endDayKey: dayKey,
    scope,
    type,
    strength,
    note,
  });

  log('created override', {
    id: String(created._id),
    user: userId,
    dayKey,
    scope,
    type,
    strength,
  });

  const before = await PatternMemory.find({ user: userId }).lean();
  const beforeByKey = new Map(before.map((p) => [p.patternKey, p]));

  const result = await computePatternMemory({ userId, dayKey });

  const after = await PatternMemory.find({ user: userId }).lean();
  const afterByKey = new Map(after.map((p) => [p.patternKey, p]));

  if (!DEBUG_ENABLED) return;

  if (!result || !result.reinforcement || result.reinforcement.length === 0) {
    log('no reinforcement occurred on this run (nothing to compare).');
  } else {
    for (const r of result.reinforcement) {
      const b = beforeByKey.get(r.patternKey);
      const a = afterByKey.get(r.patternKey);
      if (!b || !a) continue;

      log('pattern', r.patternKey);
      log('  support', b.supportCount, '->', a.supportCount, '(added', r.addedSupportDays, ')');
      log('  confidence', Number(b.confidence || 0).toFixed(3), '->', Number(a.confidence || 0).toFixed(3));
      if (Number.isFinite(r.unattenuatedTargetConfidence)) {
        log('  target (no attenuation)', Number(r.unattenuatedTargetConfidence).toFixed(3));
      }
      if (Number.isFinite(r.minAttenuationApplied)) {
        log('  min attenuation applied', Number(r.minAttenuationApplied).toFixed(3));
      }
    }

    const anyAttenuated = result.reinforcement.some((r) => (Number(r.minAttenuationApplied) || 1) < 0.999);
    if (anyAttenuated) {
      log('OK: attenuation applied; confidence should grow slower than target.');
    } else {
      log('NOTE: reinforcement happened but no attenuation was applied (override may not match signal type/scope).');
    }
  }
}

main()
  .catch((err) => {
    if (DEBUG_ENABLED) console.error('[dev_memory_override_check] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });
