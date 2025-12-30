const mongoose = require('mongoose')

const NutrientValueSchema = new mongoose.Schema(
  {
    mean: { type: Number, default: 0 },
    variance: { type: Number, default: 0.0 },
    distribution: { type: String, enum: ['normal', 'lognormal', 'unknown'], default: 'unknown' },

    unit: { type: String, default: null },
    type: { type: String, default: 'unknown' },
    role: { type: [String], default: [] },

    evidenceIds: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'EvidenceUnit' },
  },
  { _id: false }
)

const NutrientGraphSchema = new mongoose.Schema(
  {
    canonicalId: { type: String, required: true, index: true },
    version: { type: Number, default: 1 },
    serving: {
      qty: { type: Number, default: 1 },
      unit: { type: String, default: 'serving' },
      calories: { type: Number, default: 0 },
    },
    nutrients: { type: Map, of: NutrientValueSchema, default: {} },

    sourceSummary: {
      primarySource: { type: String, default: 'unknown' },
      sources: { type: [String], default: [] },
    },
  },
  { timestamps: true }
)

NutrientGraphSchema.index({ canonicalId: 1, version: -1 })

module.exports = mongoose.model('NutrientGraph', NutrientGraphSchema)
