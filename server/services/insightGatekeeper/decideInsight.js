const DailyLifeState = require('../../models/DailyLifeState');
const PatternMemory = require('../../models/PatternMemory');
const IdentityMemory = require('../../models/IdentityMemory');

const DEBUG_ENABLED = String(process.env.DEBUG_INSIGHT_GATEKEEPER || '').trim() === '1';

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  console.log('[InsightGatekeeper]', ...args);
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function getSignal(doc, key) {
  return doc?.signals?.[key] || null;
}

function signalOk(signal, { minConfidence = 0.6 } = {}) {
  return Boolean(signal) && typeof signal.value === 'number' && (signal.confidence || 0) >= minConfidence;
}

function isLow(signal, { minConfidence = 0.6 } = {}) {
  return signalOk(signal, { minConfidence }) && signal.value <= 0.35;
}

function isHigh(signal, { minConfidence = 0.6 } = {}) {
  return signalOk(signal, { minConfidence }) && signal.value >= 0.7;
}

function identityReasonKey(identityKey) {
  const k = String(identityKey || '').trim();
  if (!k) return null;
  return `identity_${k}_active`;
}

function identityMatchesToday({ identityKey, daily }) {
  // Deterministic, conservative matching.
  // This does NOT generate text; it only checks whether today's state is relevant.
  const sleep = getSignal(daily, 'sleep');
  const energy = getSignal(daily, 'energy');
  const stress = getSignal(daily, 'stress');
  const trainingLoad = getSignal(daily, 'trainingLoad');
  const nutrition = getSignal(daily, 'nutrition');

  switch (String(identityKey || '').trim()) {
    case 'sleep_keystone':
      // Only speak when sleep is salient today.
      return isLow(sleep, { minConfidence: 0.6 }) || (signalOk(sleep, { minConfidence: 0.6 }) && isLow(energy, { minConfidence: 0.6 }));

    case 'stress_sensitive':
      // Only when stress is high today, and/or energy is low.
      return isHigh(stress, { minConfidence: 0.6 }) && (isLow(energy, { minConfidence: 0.6 }) || signalOk(energy, { minConfidence: 0.6 }));

    case 'training_overreach_risk':
      // Conservative: require training load to be high today OR clear low energy with training signal present.
      return (
        isHigh(trainingLoad, { minConfidence: 0.6 }) ||
        (isLow(energy, { minConfidence: 0.6 }) && signalOk(trainingLoad, { minConfidence: 0.4 }))
      );

    case 'nutrition_sensitive':
      // Conservative: require low nutrition and low energy today.
      return isLow(nutrition, { minConfidence: 0.6 }) && isLow(energy, { minConfidence: 0.6 });

    default:
      return false;
  }
}

/**
 * Decide whether the system is allowed to speak, and at what level.
 *
 * IMPORTANT: This returns a structured decision object (never user-facing text).
 * Reads ONLY: DailyLifeState (dayKey), PatternMemory (active), IdentityMemory (active).
 */
async function decideInsight({ userId, dayKey, context } = {}) {
  void context;

  // --- V1 HARD SILENCE ---
  if (!userId || !dayKey) {
    debugLog('silent (missing inputs)');
    return { decision: 'silent', reasonKey: 'daily_missing', confidence: 0, source: null };
  }

  const daily = await DailyLifeState.findOne({ user: userId, dayKey });
  if (!daily) {
    debugLog('silent (DailyLifeState missing)');
    return { decision: 'silent', reasonKey: 'daily_missing', confidence: 0, source: null };
  }

  const label = daily?.summaryState?.label;
  const dailyConf = Number(daily?.summaryState?.confidence) || 0;

  if (label === 'unknown') {
    debugLog('silent (unknown)');
    return { decision: 'silent', reasonKey: 'daily_unknown', confidence: clamp01(dailyConf), source: 'daily' };
  }

  if (dailyConf < 0.6) {
    debugLog('silent (low confidence)');
    return { decision: 'silent', reasonKey: 'daily_low_confidence', confidence: clamp01(dailyConf), source: 'daily' };
  }

  // Read only active patterns/identities.
  const [activePatterns, activeIdentities] = await Promise.all([
    PatternMemory.find({ user: userId, status: 'active' }),
    IdentityMemory.find({ user: userId, status: 'active' }),
  ]);

  const patterns = Array.isArray(activePatterns) ? activePatterns : [];
  const identities = Array.isArray(activeIdentities) ? activeIdentities : [];

  const activePatternKeys = new Set(patterns.map((p) => String(p?.patternKey || '')).filter(Boolean));

  // --- V1 INSIGHT (rare) ---
  // Conditions:
  // - dailyConf >= 0.7
  // - at least one active identity with confidence >= threshold
  // - identity's supporting patterns are still active
  // - today's DailyLifeState matches identity context
  const IDENTITY_CONF_THRESHOLD = 0.6;
  if (dailyConf >= 0.7 && identities.length > 0) {
    const eligible = identities
      .filter((im) => (Number(im?.confidence) || 0) >= IDENTITY_CONF_THRESHOLD)
      .filter((im) => {
        const support = Array.isArray(im?.supportingPatterns) ? im.supportingPatterns : [];
        if (support.length === 0) return false;
        return support.every((k) => activePatternKeys.has(String(k)));
      })
      .filter((im) => identityMatchesToday({ identityKey: im.identityKey, daily }));

    if (eligible.length > 0) {
      eligible.sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
      const best = eligible[0];
      const out = {
        decision: 'insight',
        reasonKey: identityReasonKey(best.identityKey),
        confidence: clamp01(Math.min(dailyConf, Number(best.confidence) || 0)),
        source: 'identity',
      };
      debugLog('insight (identity matched)', out.reasonKey, 'confidence', out.confidence.toFixed(3));
      return out;
    }
  }

  // --- V1 REFLECT ---
  // dailyConf >= 0.6 already satisfied by reaching here
  // Require at least one active pattern, but no strong identity.
  if (patterns.length > 0) {
    const bestPatternConf = patterns.reduce((m, p) => Math.max(m, Number(p?.confidence) || 0), 0);
    const out = {
      decision: 'reflect',
      reasonKey: 'pattern_observed_no_identity',
      confidence: clamp01(Math.min(dailyConf, bestPatternConf)),
      source: 'pattern',
    };
    debugLog('reflect (pattern only)', 'confidence', out.confidence.toFixed(3));
    return out;
  }

  // Default: silence.
  debugLog('silent (no patterns)');
  return { decision: 'silent', reasonKey: null, confidence: clamp01(dailyConf), source: 'daily' };
}

module.exports = { decideInsight };
