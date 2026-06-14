/**
 * triageRenderer — formats the triage block + decides whether to gate the LLM reply.
 *
 * Risk levels (from healthTriageEngine): 'none' | 'moderate' | 'elevated' | 'urgent'.
 *
 * Behavior:
 *   - urgent: the LLM reply is REPLACED with a triage-only message. Always shown,
 *     because we cannot trust the LLM not to contradict urgent guidance.
 *   - elevated / moderate: the triage block is PREPENDED to the LLM reply,
 *     but only on the FIRST turn at that risk level (or when it ESCALATES).
 *     For follow-up turns at the same level, the LLM reply ships as-is — the
 *     user has already seen the safety block once and re-rendering it on every
 *     follow-up question is noise.
 *   - none / no red flags: the LLM reply ships as-is, no triage block.
 */

const { riskRank } = require('./healthTriageEngine');

function formatTriageBlock(safety) {
  const lines = [];
  lines.push('Safety triage (not diagnosis):');
  lines.push(`- Risk level: ${safety.risk_level} (${Math.round((safety.confidence || 0) * 100)}% confidence)`);
  if (safety.reason) lines.push(`- Reason: ${safety.reason}`);
  if (safety.red_flags?.length) lines.push(`- Red flags: ${safety.red_flags.join('; ')}`);
  if (safety.doctor_discussion_points?.length) lines.push(`- Questions to ask a clinician: ${safety.doctor_discussion_points.join(' | ')}`);
  if (safety.medication_awareness?.length) lines.push(`- Medication awareness: ${safety.medication_awareness.join(' | ')}`);
  if (safety.disclaimer) lines.push(safety.disclaimer);
  return lines.join('\n');
}

/**
 * Apply triage gating to an LLM reply.
 *
 * @param {string} llmReply — the LLM's text
 * @param {object} safety — output of runHealthTriage
 * @param {object} [opts]
 * @param {string} [opts.priorRiskLevel] — last persisted risk level on the thread.
 *   When provided and equal/lower than current rank for elevated/moderate, the
 *   block is suppressed (already shown earlier in the conversation).
 * @returns {{ reply: string, suppressed: boolean, blockShown: boolean }}
 *   suppressed=true → LLM text was replaced (urgent path).
 *   blockShown=true → triage block was rendered into the reply.
 */
function applyTriageGate(llmReply, safety, { priorRiskLevel } = {}) {
  const rank = riskRank(safety?.risk_level);
  const priorRank = riskRank(priorRiskLevel);
  const hasRedFlags = (safety?.red_flags || []).length > 0;

  if (rank >= 3) {
    // urgent — always suppress the LLM reply, always show the block.
    const block = formatTriageBlock(safety);
    const reply = [
      'Based on what you described, please prioritize getting medical care now rather than waiting for an AI reply.',
      '',
      block,
    ].join('\n');
    return { reply, suppressed: true, blockShown: true };
  }

  if (rank >= 1 || hasRedFlags) {
    // elevated/moderate — show the block on first occurrence or escalation.
    // If the user's prior turn was already at this level (or higher), skip
    // re-rendering — they've already seen it.
    const isEscalation = rank > priorRank;
    const isFirstOccurrence = priorRank === 0;
    if (isEscalation || isFirstOccurrence) {
      const block = formatTriageBlock(safety);
      return {
        reply: `${block}\n\n${String(llmReply || '').trim()}`,
        suppressed: false,
        blockShown: true,
      };
    }
    // Same risk level as the prior turn — skip the block.
    return { reply: llmReply, suppressed: false, blockShown: false };
  }

  return { reply: llmReply, suppressed: false, blockShown: false };
}

module.exports = { formatTriageBlock, applyTriageGate };
