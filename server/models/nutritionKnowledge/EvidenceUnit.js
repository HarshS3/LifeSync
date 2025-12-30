const mongoose = require('mongoose')

const EvidenceUnitSchema = new mongoose.Schema(
  {
    subjectKind: {
      type: String,
      enum: ['food', 'nutrient', 'condition', 'drug', 'metric', 'interaction', 'hypothesis'],
      required: true,
      index: true,
    },
    subjectKey: { type: String, required: true, index: true },

    claimType: { type: String, required: true, index: true },
    claimKey: { type: String, required: true, index: true },

    value: { type: mongoose.Schema.Types.Mixed, default: null },
    unit: { type: String, default: null },

    source: { type: String, required: true },
    strength: { type: Number, default: 0.7 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

EvidenceUnitSchema.index({ subjectKind: 1, subjectKey: 1, claimType: 1, claimKey: 1 })

module.exports = mongoose.model('EvidenceUnit', EvidenceUnitSchema)
