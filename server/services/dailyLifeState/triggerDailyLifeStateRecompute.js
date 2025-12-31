const { dayKeyFromDate } = require('./dayKey');
const { upsertDailyLifeState } = require('./upsertDailyLifeState');

function triggerDailyLifeStateRecompute({ userId, date, dayKey, reason }) {
  if (!userId) return;

  const computedDayKey = dayKey || dayKeyFromDate(date || new Date());
  if (!computedDayKey) return;

  const label = reason ? ` (${reason})` : '';

  setImmediate(() => {
    upsertDailyLifeState({ userId, dayKey: computedDayKey }).catch((err) => {
      console.log(`[DailyLifeState] Recompute failed${label}:`, err?.message || err);
    });
  });
}

module.exports = { triggerDailyLifeStateRecompute };
