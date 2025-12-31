function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function getSignal(dls, key) {
  return dls?.signals?.[key] || null;
}

function signalOk(signal, { minConfidence = 0.6 } = {}) {
  return Boolean(signal) && typeof signal.value === 'number' && (signal.confidence || 0) >= minConfidence;
}

function isLow(signal) {
  return signalOk(signal) && signal.value <= 0.35;
}

function isHigh(signal) {
  return signalOk(signal) && signal.value >= 0.7;
}

function oneSentence(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  // Ensure single sentence-ish output.
  const first = s.split(/(?<=[.!?])\s+/)[0] || s;
  const out = first.trim();
  if (!out) return null;
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

/**
 * Build a calm, neutral, 1-sentence state reflection.
 *
 * Contract:
 * - returns null unless decision/payload allow reflect.
 * - never advice, never directives, never causal claims.
 */
function buildStateReflection({ dailyLifeState, insightDecision, insightPayload } = {}) {
  if (!dailyLifeState) return null;

  if (insightDecision?.decision !== 'reflect') return null;
  if (insightPayload?.level !== 'reflect') return null;

  const conf = typeof dailyLifeState?.summaryState?.confidence === 'number' ? dailyLifeState.summaryState.confidence : 0;
  if (conf < 0.6) return null;

  const label = String(dailyLifeState?.summaryState?.label || '').trim();
  if (!label || label === 'unknown') return null;

  const energy = getSignal(dailyLifeState, 'energy');
  const stress = getSignal(dailyLifeState, 'stress');
  const sleep = getSignal(dailyLifeState, 'sleep');

  // Deterministic phrasing. Keep it minimal and non-judgmental.
  if (label === 'stable') {
    return oneSentence('Your day looked fairly balanced overall');
  }

  if (label === 'recovering') {
    if (signalOk(sleep) && !isLow(sleep) && (isLow(energy) || signalOk(energy))) {
      return oneSentence('Today looked steadier, with signs of recovery');
    }
    return oneSentence('Today looked steadier than usual');
  }

  if (label === 'overloaded') {
    if (isHigh(stress) && isLow(energy)) {
      return oneSentence('Today felt more demanding than usual, with lower energy');
    }
    if (isHigh(stress)) {
      return oneSentence('Today felt more demanding than usual');
    }
    if (isLow(energy)) {
      return oneSentence('Today looked demanding, with lower energy');
    }
    return oneSentence('Today felt more demanding than usual');
  }

  if (label === 'depleted') {
    if (isLow(energy)) {
      return oneSentence('Today felt draining, with lower energy');
    }
    if (isLow(sleep)) {
      return oneSentence('Today felt draining overall');
    }
    return oneSentence('Today felt draining overall');
  }

  return null;
}

module.exports = { buildStateReflection, clamp01 };
