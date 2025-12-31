const mongoose = require('mongoose');

const PatternMemorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Deterministic: same conditions+effect+window => same key
    patternKey: { type: String, required: true, index: true },

    // Example: ["low_sleep", "high_stress"]
    conditions: { type: [String], default: [] },

    // Example: "low_energy", "next_day_fatigue"
    effect: { type: String, required: true },

    window: { type: String, enum: ['same_day', 'next_day'], required: true },

    supportCount: { type: Number, default: 0 },
    confidence: { type: Number, default: 0.3, min: 0, max: 1 },

    firstObserved: { type: Date, default: null },
    lastObserved: { type: Date, default: null },

    // 0 = fresh, 1 = fully decayed
    decayScore: { type: Number, default: 0, min: 0, max: 1 },

    status: { type: String, enum: ['active', 'weak', 'retired'], default: 'weak', index: true },

    computeVersion: { type: String, default: 'pm-v1' },

    // Internal: dedupe support increments across recomputes.
    // Stores the dayKey of the CONDITION day for each observation.
    supportDayKeys: { type: [String], default: [] },
  },
  { timestamps: true }
);

PatternMemorySchema.index({ user: 1, patternKey: 1 }, { unique: true });
PatternMemorySchema.index({ user: 1, lastObserved: -1 });

module.exports = mongoose.model('PatternMemory', PatternMemorySchema);
