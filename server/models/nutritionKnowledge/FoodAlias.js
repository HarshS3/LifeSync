const mongoose = require('mongoose')

const FoodAliasSchema = new mongoose.Schema(
  {
    alias: { type: String, required: true },
    aliasNormalized: { type: String, required: true, unique: true, index: true },
    canonicalId: { type: String, required: true, index: true },
    confidence: { type: Number, default: 0.75 },
    source: { type: String, enum: ['system', 'user', 'seed', 'llm'], default: 'system' },
    locale: { type: String, default: 'en' },
  },
  { timestamps: true }
)

module.exports = mongoose.model('FoodAlias', FoodAliasSchema)
