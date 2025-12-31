const mongoose = require('mongoose');

const MemoryOverrideSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Inclusive day range (YYYY-MM-DD)
    startDayKey: { type: String, required: true },
    endDayKey: { type: String, required: true },

    type: {
      type: String,
      enum: ['temporary_phase', 'exception', 'recovery', 'experiment'],
      required: true,
    },

    scope: {
      type: String,
      enum: ['all', 'sleep', 'stress', 'training', 'nutrition'],
      required: true,
      default: 'all',
    },

    // 0.0 - 1.0
    // Interpretation: how much to down-weight memory during this period.
    strength: { type: Number, min: 0, max: 1, default: 0.5 },

    // Internal-only note. Not user-visible.
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MemoryOverrideSchema.index({ user: 1, startDayKey: 1, endDayKey: 1 });

module.exports = mongoose.model('MemoryOverride', MemoryOverrideSchema);
