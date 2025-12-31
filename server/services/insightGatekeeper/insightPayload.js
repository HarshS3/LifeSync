function normalizeDecision(decision) {
  if (!decision || typeof decision !== 'object') return null;

  const d = String(decision.decision || '').trim();
  const reasonKey = decision.reasonKey == null ? null : String(decision.reasonKey);
  const confidence = Number.isFinite(Number(decision.confidence)) ? Number(decision.confidence) : 0;
  const source = decision.source == null ? null : String(decision.source);

  return { decision: d, reasonKey, confidence, source };
}

/**
 * Build a strictly structured speech-constraint payload.
 * Returns null if the system must remain silent.
 *
 * IMPORTANT:
 * - No text generation.
 * - No advice language.
 * - This is a constraint contract, not content.
 */
function buildInsightPayload({ gateDecision } = {}) {
  const gd = normalizeDecision(gateDecision);
  if (!gd) return null;

  if (gd.decision === 'silent') return null;

  // Enforce required fields for non-silent.
  if (!gd.reasonKey) return null;
  if (!gd.source || !['daily', 'pattern', 'identity'].includes(gd.source)) return null;

  if (gd.decision === 'reflect') {
    return {
      level: 'reflect',
      reasonKey: gd.reasonKey,
      source: gd.source,
      allowedTone: 'mirror',
      maxSentences: 1,
      mustAskQuestion: true,
    };
  }

  if (gd.decision === 'insight') {
    return {
      level: 'insight',
      reasonKey: gd.reasonKey,
      source: gd.source,
      allowedTone: 'neutral',
      maxSentences: 2,
      mustAskQuestion: false,
    };
  }

  // Unknown decision => silence by default.
  return null;
}

module.exports = { buildInsightPayload };
