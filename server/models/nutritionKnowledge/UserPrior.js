const mongoose = require('mongoose')

const UserPriorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true, index: true },

    mean: { type: Number, default: 0 },
    variance: { type: Number, default: 1 },
    confidence: { type: Number, default: 0.3 },

    updatedFrom: { type: String, default: 'system' },
  },
  { timestamps: true }
)

UserPriorSchema.index({ user: 1, key: 1 }, { unique: true })

module.exports = mongoose.model('UserPrior', UserPriorSchema)
