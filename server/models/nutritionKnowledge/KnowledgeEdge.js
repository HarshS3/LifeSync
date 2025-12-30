const mongoose = require('mongoose')

const KnowledgeEdgeSchema = new mongoose.Schema(
  {
    fromKind: {
      type: String,
      enum: ['food', 'nutrient', 'condition', 'drug', 'metric'],
      required: true,
      index: true,
    },
    fromKey: { type: String, required: true, index: true },
    predicate: { type: String, required: true, index: true },
    toKind: {
      type: String,
      enum: ['food', 'nutrient', 'condition', 'drug', 'metric'],
      required: true,
      index: true,
    },
    toKey: { type: String, required: true, index: true },

    strength: { type: Number, default: 0.5 },
    uncertainty: { type: Number, default: 0.4 },
    evidenceIds: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'EvidenceUnit' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

KnowledgeEdgeSchema.index({ fromKind: 1, fromKey: 1, predicate: 1, toKind: 1, toKey: 1 }, { unique: true })

module.exports = mongoose.model('KnowledgeEdge', KnowledgeEdgeSchema)
