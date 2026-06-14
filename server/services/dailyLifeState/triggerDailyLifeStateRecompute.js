const { dayKeyFromDate } = require('./dayKey');
const { upsertDailyLifeState } = require('./upsertDailyLifeState');
// Lazy-require to avoid circular import when assistant/userContextBundle pulls
// in DailyLifeState model at startup.
let _clearUserContextCache = null;
function clearUserContextCache(userId) {
  if (!_clearUserContextCache) {
    try {
      ({ clearCache: _clearUserContextCache } = require('../assistant/userContextBundle'));
    } catch (_) {
      _clearUserContextCache = () => {};
    }
  }
  try { _clearUserContextCache(userId); } catch (_) {}
}

function triggerDailyLifeStateRecompute({ userId, date, dayKey, reason }) {
  if (!userId) return;

  const computedDayKey = dayKey || dayKeyFromDate(date || new Date());
  if (!computedDayKey) return;

  const label = reason ? ` (${reason})` : '';

  // Any data write that triggers a DLS recompute also invalidates the cached
  // user-context bundle the AI assistant uses for grounding — otherwise a chat
  // turn within 60s of a new log would be answered against stale data.
  clearUserContextCache(userId);

  setImmediate(() => {
    upsertDailyLifeState({ userId, dayKey: computedDayKey }).catch((err) => {
      console.log(`[DailyLifeState] Recompute failed${label}:`, err?.message || err);
    });
  });
}

module.exports = { triggerDailyLifeStateRecompute };
