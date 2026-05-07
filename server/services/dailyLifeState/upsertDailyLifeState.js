const DailyLifeState = require('../../models/DailyLifeState');
const { computeDailyLifeState } = require('./computeDailyLifeState');
const { computePatternMemory } = require('../patternMemory/computePatternMemory');
const { calibrateUserTargets } = require('../nutritionPipeline/metabolicCalibration');

async function upsertDailyLifeState({ userId, dayKey }) {
  const computed = await computeDailyLifeState({ userId, dayKey });

  const doc = await DailyLifeState.findOneAndUpdate(
    { user: userId, dayKey },
    { $set: computed },
    { upsert: true, new: true }
  );

  // Background Tasks
  const patternMemoryEnabled = String(process.env.PATTERN_MEMORY_ENABLED || '1').trim() !== '0';
  
  setImmediate(() => {
    // 1. Pattern Memory
    if (patternMemoryEnabled) {
      computePatternMemory({ userId, dayKey }).catch((err) => {
        if (String(process.env.DEBUG_PATTERN_MEMORY || '').trim() === '1') {
          console.log('[PatternMemory] compute failed:', err?.message || err);
        }
      });
    }

    // 2. Metabolic Calibration (Feature 5: N=1 Calibration)
    // We only trigger this once every 7 days (based on dayKey ending in -01, -07, -14, -21, -28 approx)
    // Or just let the service handle the throttling internally.
    const dayOfMonth = parseInt(dayKey.split('-')[2]);
    if ([1, 8, 15, 22].includes(dayOfMonth)) {
      calibrateUserTargets(userId).catch(err => console.error('[CalibrationTrigger] Failed:', err.message));
    }
  });

  return doc;
}

module.exports = { upsertDailyLifeState };
