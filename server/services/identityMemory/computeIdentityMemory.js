const IdentityMemory = require('../../models/IdentityMemory');
const PatternMemory = require('../../models/PatternMemory');
const { applyMemoryOverrides } = require('../memoryControl/applyMemoryOverrides');

const COMPUTE_VERSION = 'im-v1';

const DEBUG_ENABLED = String(process.env.DEBUG_IDENTITY_MEMORY || '').trim() === '1';

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  console.log('[IdentityMemory]', ...args);
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function daysBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  const ms = db.getTime() - da.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function isStablePattern(p, { now, minConfidence = 0.65, minPersistenceDays = 14, maxStaleDays = 21 } = {}) {
  if (!p) return false;
  if (p.status !== 'active') return false;
  if ((Number(p.confidence) || 0) < minConfidence) return false;
  if (!p.firstObserved || !p.lastObserved) return false;

  const persistenceDays = daysBetween(p.firstObserved, p.lastObserved);
  if (!Number.isFinite(persistenceDays) || persistenceDays < minPersistenceDays) return false;

  const staleDays = daysBetween(p.lastObserved, now);
  if (!Number.isFinite(staleDays) || staleDays > maxStaleDays) return false;

  return true;
}

function identityClaimText(identityKey) {
  switch (identityKey) {
    case 'sleep_keystone':
      return 'Sleep strongly influences daily energy and recovery for this user';
    case 'stress_sensitive':
      return 'Stress strongly influences daily energy for this user';
    case 'training_overreach_risk':
      return 'High training load is linked to next-day fatigue for this user';
    case 'nutrition_sensitive':
      return 'Nutrition quality strongly influences daily energy for this user';
    default:
      return '';
  }
}

function computeStabilityScore({ confidence, firstConfirmed, lastReinforced, now }) {
  const conf = clamp01(Number(confidence) || 0);

  const ageDays = firstConfirmed ? daysBetween(firstConfirmed, now) : 0;
  const timeFactor = clamp01((Number.isFinite(ageDays) ? ageDays : 0) / 180); // ~6 months

  const sinceReinforcedDays = lastReinforced ? daysBetween(lastReinforced, now) : 999;
  const recencyFactor = clamp01(1 - ((Number.isFinite(sinceReinforcedDays) ? sinceReinforcedDays : 999) / 90)); // ~3 months to zero

  // Emphasize time + recency; confidence modulates but does not dominate.
  return clamp01(0.5 * timeFactor + 0.3 * recencyFactor + 0.2 * conf);
}

function updateConfidence({ prev, target, supportedNow, attenuationFactor = 1 }) {
  const p = clamp01(Number(prev) || 0);
  const t = clamp01(Number(target) || 0);

  // Conservative: very slow increase, moderately faster decrease.
  const alphaUp = 0.02;
  const alphaDown = 0.06;

  const alpha = supportedNow ? (alphaUp * clamp01(Number(attenuationFactor) || 0)) : alphaDown;
  const next = p + alpha * (t - p);

  // Cap identity confidence lower than patterns; keep it humble.
  return clamp01(Math.min(0.8, next));
}

function statusFrom({ confidence, supportedNow, daysSinceReinforced }) {
  const c = clamp01(Number(confidence) || 0);
  const stale = Number.isFinite(daysSinceReinforced) ? daysSinceReinforced : 999;

  if (supportedNow && c >= 0.55) return 'active';
  if (c < 0.25 && stale > 45) return 'retired';
  return 'fading';
}

function patternHasCondition(p, needle) {
  const n = String(needle || '').toLowerCase();
  if (!n) return false;

  const conditions = Array.isArray(p?.conditions) ? p.conditions : [];
  if (conditions.some((c) => String(c).toLowerCase().includes(n))) return true;

  const key = String(p?.patternKey || '').toLowerCase();
  if (key.includes(n)) return true;

  return false;
}

function buildIdentityCandidates({ patterns, now }) {
  const stable = patterns.filter((p) => isStablePattern(p, { now }));

  const sleepStable = stable.filter((p) => patternHasCondition(p, 'sleep'));
  const stressStable = stable.filter((p) => patternHasCondition(p, 'stress'));
  const trainingStable = stable.filter((p) => patternHasCondition(p, 'training_load'));
  const nutritionStable = stable.filter((p) => patternHasCondition(p, 'nutrition'));

  const candidates = [];

  // 1) sleep_keystone
  if (sleepStable.length >= 2) {
    candidates.push({
      identityKey: 'sleep_keystone',
      supportingPatterns: sleepStable.map((p) => p.patternKey).slice(0, 5),
      avgPatternConfidence: sleepStable.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / sleepStable.length,
    });
  }

  // 2) stress_sensitive
  if (stressStable.length >= 1) {
    candidates.push({
      identityKey: 'stress_sensitive',
      supportingPatterns: stressStable.map((p) => p.patternKey).slice(0, 5),
      avgPatternConfidence: stressStable.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / stressStable.length,
    });
  }

  // 3) training_overreach_risk
  // Prefer exact v1 match if present.
  const trainingOverreach = trainingStable.filter((p) => String(p.effect || '').toLowerCase() === 'next_day_fatigue');
  if (trainingOverreach.length >= 1) {
    candidates.push({
      identityKey: 'training_overreach_risk',
      supportingPatterns: trainingOverreach.map((p) => p.patternKey).slice(0, 5),
      avgPatternConfidence:
        trainingOverreach.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / trainingOverreach.length,
    });
  }

  // 4) nutrition_sensitive
  if (nutritionStable.length >= 1) {
    candidates.push({
      identityKey: 'nutrition_sensitive',
      supportingPatterns: nutritionStable.map((p) => p.patternKey).slice(0, 5),
      avgPatternConfidence: nutritionStable.reduce((s, p) => s + (Number(p.confidence) || 0), 0) / nutritionStable.length,
    });
  }

  return candidates;
}

async function upsertIdentity({ userId, identityKey, supportingPatterns, avgPatternConfidence, now, dayKey }) {
  const claim = identityClaimText(identityKey);
  if (!claim) return;

  const scopeByIdentity = {
    sleep_keystone: 'sleep',
    stress_sensitive: 'stress',
    training_overreach_risk: 'training',
    nutrition_sensitive: 'nutrition',
  };

  const scope = scopeByIdentity[identityKey] || 'all';
  const { attenuationFactor } = dayKey
    ? await applyMemoryOverrides({ userId, dayKey, signalType: scope })
    : { attenuationFactor: 1.0 };

  // IdentityMemory is more conservative: attenuation has a stronger effect.
  const identityAttenuation = clamp01(Math.pow(Number(attenuationFactor) || 1, 2));

  // Target remains conservative and strictly below patterns.
  const targetConfidence = clamp01(0.15 + 0.55 * clamp01(avgPatternConfidence));
  const effectiveTargetConfidence = clamp01(targetConfidence * identityAttenuation);

  const existing = await IdentityMemory.findOne({ user: userId, identityKey });

  if (!existing) {
    // Silence preferred: create only if support is meaningfully strong.
    if (effectiveTargetConfidence < 0.35) return;

    const created = await IdentityMemory.create({
      user: userId,
      identityKey,
      claim,
      supportingPatterns,
      confidence: Math.min(0.4, effectiveTargetConfidence),
      stabilityScore: 0,
      firstConfirmed: now,
      lastReinforced: now,
      status: 'fading',
      computeVersion: COMPUTE_VERSION,
    });

    created.stabilityScore = computeStabilityScore({
      confidence: created.confidence,
      firstConfirmed: created.firstConfirmed,
      lastReinforced: created.lastReinforced,
      now,
    });
    created.status = statusFrom({ confidence: created.confidence, supportedNow: true, daysSinceReinforced: 0 });
    await created.save();

    debugLog('created', identityKey, 'confidence', created.confidence.toFixed(3), 'status', created.status);
    return;
  }

  const prevStatus = existing.status;
  const prevConfidence = existing.confidence;

  existing.claim = claim;
  existing.supportingPatterns = supportingPatterns;

  existing.lastReinforced = now;
  if (!existing.firstConfirmed) existing.firstConfirmed = now;

  const prevStability = existing.stabilityScore;
  existing.confidence = updateConfidence({
    prev: existing.confidence,
    target: targetConfidence,
    supportedNow: true,
    attenuationFactor: identityAttenuation,
  });

  const rawStability = computeStabilityScore({
    confidence: existing.confidence,
    firstConfirmed: existing.firstConfirmed,
    lastReinforced: existing.lastReinforced,
    now,
  });

  // Slow stability reinforcement during overridden periods.
  existing.stabilityScore = clamp01(
    (Number(prevStability) || 0) + identityAttenuation * (rawStability - (Number(prevStability) || 0))
  );

  existing.status = statusFrom({ confidence: existing.confidence, supportedNow: true, daysSinceReinforced: 0 });
  existing.computeVersion = COMPUTE_VERSION;

  await existing.save();

  debugLog('reinforced', identityKey, 'confidence', existing.confidence.toFixed(3), 'status', existing.status);

  // Avoid noisy logs: only log downgrades when debug.
  if (prevStatus !== existing.status && (existing.status === 'fading' || existing.status === 'retired')) {
    debugLog('downgraded', identityKey, prevStatus, '->', existing.status);
  }

  // Also log if confidence dropped materially (rare with supportedNow).
  if (existing.confidence + 1e-9 < (Number(prevConfidence) || 0)) {
    debugLog('confidence_down', identityKey, 'from', Number(prevConfidence).toFixed(3), 'to', existing.confidence.toFixed(3));
  }
}

async function decayIdentity({ doc, now }) {
  const prevStatus = doc.status;
  const prevConfidence = doc.confidence;

  const daysSince = doc.lastReinforced ? daysBetween(doc.lastReinforced, now) : 999;
  const target = 0;
  doc.confidence = updateConfidence({ prev: doc.confidence, target, supportedNow: false });

  doc.stabilityScore = computeStabilityScore({
    confidence: doc.confidence,
    firstConfirmed: doc.firstConfirmed,
    lastReinforced: doc.lastReinforced,
    now,
  });

  doc.status = statusFrom({ confidence: doc.confidence, supportedNow: false, daysSinceReinforced: daysSince });
  doc.computeVersion = COMPUTE_VERSION;

  await doc.save();

  if (doc.status !== prevStatus) {
    if (doc.status === 'fading') debugLog('fading', doc.identityKey, 'confidence', doc.confidence.toFixed(3));
    if (doc.status === 'retired') debugLog('retired', doc.identityKey, 'confidence', doc.confidence.toFixed(3));
  } else if (Math.abs((doc.confidence || 0) - (prevConfidence || 0)) > 1e-6) {
    debugLog('decayed', doc.identityKey, 'confidence', doc.confidence.toFixed(3));
  }
}

async function computeIdentityMemory({ userId, dayKey }) {
  if (!userId) return;

  const now = new Date();

  // Read ONLY PatternMemory.
  const patterns = await PatternMemory.find({ user: userId });
  if (!Array.isArray(patterns) || patterns.length === 0) {
    // No patterns -> decay any existing identities.
    const existing = await IdentityMemory.find({ user: userId });
    for (const doc of existing) {
      await decayIdentity({ doc, now });
    }
    return;
  }

  const candidates = buildIdentityCandidates({ patterns, now });
  const candidateKeys = new Set(candidates.map((c) => c.identityKey));

  // Upsert supported identities (conservatively).
  for (const c of candidates) {
    await upsertIdentity({
      userId,
      identityKey: c.identityKey,
      supportingPatterns: c.supportingPatterns,
      avgPatternConfidence: c.avgPatternConfidence,
      now,
      dayKey,
    });
  }

  // Decay identities that are no longer supported.
  const existing = await IdentityMemory.find({ user: userId });
  for (const doc of existing) {
    // Only manage v1 identities; ignore unknown keys silently.
    if (!['sleep_keystone', 'stress_sensitive', 'training_overreach_risk', 'nutrition_sensitive'].includes(doc.identityKey)) {
      continue;
    }

    if (candidateKeys.has(doc.identityKey)) continue;
    await decayIdentity({ doc, now });
  }
}

module.exports = { computeIdentityMemory };
