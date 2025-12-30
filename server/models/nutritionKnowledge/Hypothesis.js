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
    canonicalId: { type: String, required: true, index: true },

    hypothesis: { type: String, required: true },
    supportingFactors: { type: [String], default: [] },
    recommendedValidation: { type: String, default: '' },

    confidence: { type: Number, default: 0.5 },
    status: { type: String, enum: ['proposed', 'testing', 'confirmed', 'rejected'], default: 'proposed' },

    observations: { type: [HypothesisObservationSchema], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

HypothesisSchema.index({ user: 1, canonicalId: 1, status: 1 })

module.exports = mongoose.model('Hypothesis', HypothesisSchema)
