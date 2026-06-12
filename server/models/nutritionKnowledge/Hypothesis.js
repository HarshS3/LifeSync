const mongoose = require('mongoose')

const HypothesisObservationSchema = new mongoose.Schema(
  {
    outcome: { type: String, enum: ['support', 'refute'], required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
)

const HypothesisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Generalized: 'food', 'pattern', 'cross_domain'. Defaults to 'food' for back-compat.
    kind: { type: String, enum: ['food', 'pattern', 'cross_domain'], default: 'food', index: true },

    // Was specific to food canonical IDs; now an opaque key the kind owns
    // ('food:milk', 'pattern:low_sleep+high_stress→fatigue', etc.). Required for backward compat.
    canonicalId: { type: String, required: true, index: true },

    hypothesis: { type: String, required: true },
    supportingFactors: { type: [String], default: [] },
    recommendedValidation: { type: String, default: '' },

    confidence: { type: Number, default: 0.5 },
    status: { type: String, enum: ['proposed', 'testing', 'confirmed', 'rejected', 'archived'], default: 'proposed' },

    // Counters maintained by recordHypothesisFeedback + the lifecycle worker.
    supportCount: { type: Number, default: 0 },
    refuteCount: { type: Number, default: 0 },
    lastEvaluatedAt: { type: Date, default: null },

    observations: { type: [HypothesisObservationSchema], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

HypothesisSchema.index({ user: 1, canonicalId: 1, status: 1 })
HypothesisSchema.index({ user: 1, status: 1, lastEvaluatedAt: -1 })

module.exports = mongoose.model('Hypothesis', HypothesisSchema)
