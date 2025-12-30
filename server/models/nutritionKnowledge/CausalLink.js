const mongoose = require('mongoose')

const CausalLinkSchema = new mongoose.Schema(
  {
    subjectKind: { type: String, enum: ['food'], required: true, index: true },
    subjectKey: { type: String, required: true, index: true },

    cause: { type: String, required: true, index: true },
    effect: { type: String, required: true, index: true },
    mediators: { type: [String], default: [] },

    strength: { type: Number, default: 0.5 },
    uncertainty: { type: Number, default: 0.4 },
    evidenceIds: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'EvidenceUnit' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

CausalLinkSchema.index({ subjectKind: 1, subjectKey: 1, cause: 1, effect: 1 }, { unique: true })

module.exports = mongoose.model('CausalLink', CausalLinkSchema)
