const DailyLifeState = require('../../models/DailyLifeState');
const { computeDailyLifeState } = require('./computeDailyLifeState');
const { computePatternMemory } = require('../patternMemory/computePatternMemory');

async function upsertDailyLifeState({ userId, dayKey }) {
  const computed = await computeDailyLifeState({ userId, dayKey });

  const doc = await DailyLifeState.findOneAndUpdate(
    { user: userId, dayKey },
    { $set: computed },
    { upsert: true, new: true }
  );

  const patternMemoryEnabled = String(process.env.PATTERN_MEMORY_ENABLED || '1').trim() !== '0';
  if (patternMemoryEnabled) {
    setImmediate(() => {
      computePatternMemory({ userId, dayKey }).catch((err) => {
        // Debug-only logging lives inside computePatternMemory.
        if (String(process.env.DEBUG_PATTERN_MEMORY || '').trim() === '1') {
          console.log('[PatternMemory] compute failed:', err?.message || err);
        }
      });
    });
  }

  return doc;
}

module.exports = { upsertDailyLifeState };
