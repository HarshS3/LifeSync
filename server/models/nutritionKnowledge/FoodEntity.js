const mongoose = require('mongoose')

const FoodEntitySchema = new mongoose.Schema(
  {
    canonicalId: { type: String, required: true, unique: true, index: true },
    primaryName: { type: String, required: true, index: true },
    category: { type: String, default: 'unknown' },
    descriptors: { type: [String], default: [] },
    locale: { type: String, default: 'en' },

    provisional: { type: Boolean, default: false },
    provenance: {
      createdBy: { type: String, enum: ['system', 'user', 'seed'], default: 'system' },
      createdFrom: { type: String, default: null },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('FoodEntity', FoodEntitySchema)
