const MemoryOverride = require('../../models/MemoryOverride');

const DEBUG_ENABLED = String(process.env.DEBUG_MEMORY_OVERRIDE || '').trim() === '1';

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  console.log('[MemoryOverride]', ...args);
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function isValidDayKey(dayKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || '').trim());
}

/**
 * applyMemoryOverrides
 *
 * Pure + deterministic given DB state.
 * No side effects, no mutation.
 *
 * @param {Object} args
 * @param {string|import('mongoose').Types.ObjectId} args.userId
 * @param {string} args.dayKey - YYYY-MM-DD
 * @param {string} args.signalType - sleep|stress|training|nutrition (others treated as 'all')
 * @returns {Promise<{attenuationFactor:number, overridden:boolean}>}
 */
async function applyMemoryOverrides({ userId, dayKey, signalType }) {
  if (!userId || !isValidDayKey(dayKey)) {
    return { attenuationFactor: 1.0, overridden: false };
  }

  const st = String(signalType || '').trim().toLowerCase();
  const scopes = ['all'];
  if (['sleep', 'stress', 'training', 'nutrition'].includes(st)) scopes.push(st);

  const matches = await MemoryOverride.find({
    user: userId,
    startDayKey: { $lte: dayKey },
    endDayKey: { $gte: dayKey },
    scope: { $in: scopes },
  })
    .lean()
    .exec();

  if (!Array.isArray(matches) || matches.length === 0) {
    return { attenuationFactor: 1.0, overridden: false };
  }

  let minAttenuation = 1.0;
  for (const o of matches) {
    const strength = clamp01(Number(o?.strength) || 0);
    const attenuation = clamp01(1.0 - strength);
    if (attenuation < minAttenuation) minAttenuation = attenuation;
  }

  // Hard floor to avoid fully erasing reinforcement.
  const floored = Math.max(0.2, minAttenuation);

  if (DEBUG_ENABLED) {
    debugLog('match', { dayKey, signalType: st || 'unknown', scopes }, '->', floored.toFixed(3));
  }

  return { attenuationFactor: floored, overridden: true };
}

module.exports = { applyMemoryOverrides };
