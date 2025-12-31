const { decideInsight } = require('./decideInsight');
const { buildInsightPayload } = require('./insightPayload');

const DEBUG_ENABLED = String(process.env.DEBUG_INSIGHT_SHADOW || '').trim() === '1';

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  console.log('[InsightShadow]', ...args);
}

/**
 * Shadow mode evaluation.
 *
 * - Computes what *would* be allowed later.
 * - Never generates text.
 * - Never stores to DB.
 * - Never emits events.
 * - Returns nothing user-facing.
 */
async function runInsightShadow({ userId, dayKey, context } = {}) {
  const gateDecision = await decideInsight({ userId, dayKey, context });
  const payload = buildInsightPayload({ gateDecision });

  if (!payload) return;

  debugLog(
    `${payload.level} | ${payload.reasonKey} | source=${payload.source} | tone=${payload.allowedTone}`
  );
}

module.exports = { runInsightShadow };
