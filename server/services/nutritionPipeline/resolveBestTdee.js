const { calculateAdaptiveTDEE, calculateMetabolicMap } = require('./adaptiveTdeeEngine');

/**
 * Resolves the best available TDEE for a user, in priority order:
 *   1. Metabolic map dynamic TDEE (factors training load, stress, steps)
 *   2. Simple adaptive TDEE (weight change vs intake)
 *   3. null — caller falls back to formula TDEE
 *
 * Returns { tdee, source } where source is 'metabolic_map' | 'adaptive' | 'formula'.
 * Never throws — all failures silently fall through to the next tier.
 */
async function resolveBestTdee(userId, daysBack = 30) {
  try {
    const mapResult = await calculateMetabolicMap(userId, Math.max(daysBack, 60));
    if (mapResult?.status === 'success' && mapResult.dynamicTDEE) {
      return { tdee: mapResult.dynamicTDEE, source: 'metabolic_map' };
    }
  } catch (_) {}

  try {
    const ar = await calculateAdaptiveTDEE(userId, daysBack);
    if (ar?.status === 'success' && ar.adaptiveTdee) {
      return { tdee: ar.adaptiveTdee, source: 'adaptive' };
    }
  } catch (_) {}

  return { tdee: null, source: 'formula' };
}

module.exports = { resolveBestTdee };
