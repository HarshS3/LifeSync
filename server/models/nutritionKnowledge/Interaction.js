const mongoose = require('mongoose')

const InteractionSchema = new mongoose.Schema(
  {
    canonicalId: { type: String, required: true, index: true },
    targetKind: { type: String, enum: ['condition', 'drug'], required: true, index: true },
    targetKey: { type: String, required: true, index: true },

    interactionType: { type: String, required: true },
    direction: { type: String, enum: ['positive', 'negative', 'conditional', 'unknown'], default: 'unknown' },
    strength: { type: Number, default: 0.5 },
    riskLevel: { type: String, enum: ['none', 'low', 'moderate', 'high', 'unknown'], default: 'unknown' },
    uncertainty: { type: Number, default: 0.4 },

    evidenceIds: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'EvidenceUnit' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

InteractionSchema.index({ canonicalId: 1, targetKind: 1, targetKey: 1, interactionType: 1 })

module.exports = mongoose.model('Interaction', InteractionSchema)
