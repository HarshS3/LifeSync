const mongoose = require('mongoose')

const NutrientsPer100gSchema = new mongoose.Schema(
  {
    carbs: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    sodium: { type: Number, default: 0 },
    potassium: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    calcium: { type: Number, default: 0 },
    vitaminB: { type: Number, default: 0 },
    magnesium: { type: Number, default: 0 },
    zinc: { type: Number, default: 0 },
    vitaminC: { type: Number, default: 0 },
    omega3: { type: Number, default: 0 },
  },
  { _id: false }
)

const IngredientProfileSchema = new mongoose.Schema(
  {
    itemKey: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true, index: true },
    locale: { type: String, default: 'en', index: true },

    nutrientsPer100g: { type: NutrientsPer100gSchema, default: () => ({}) },

    source: { type: String, default: 'manual' },
    confidence: { type: Number, default: 0.6 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

module.exports = mongoose.model('IngredientProfile', IngredientProfileSchema)
