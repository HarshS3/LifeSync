const mongoose = require('mongoose')

const RecipeIngredientSchema = new mongoose.Schema(
  {
    itemKey: { type: String, required: true },
    grams: { type: Number, required: true },
  },
  { _id: false }
)

const CookingAdjustmentsSchema = new mongoose.Schema(
  {
    oilAbsorptionFactor: { type: Number, default: 1.0 },
    moistureLossFactor: { type: Number, default: 1.0 },
    notes: { type: String, default: '' },
  },
  { _id: false }
)

const RecipeTemplateSchema = new mongoose.Schema(
  {
    mealId: { type: String, default: null, unique: true, sparse: true, index: true },
    name: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' },
    category: { type: String, default: '' },
    locale: { type: String, default: 'en', index: true },
    servingSizeG: { type: Number, required: true },
    servingDescription: { type: String, default: '' },
    ingredients: { type: [RecipeIngredientSchema], default: [] },
    cookingMethod: { type: String, default: '' },
    cookingAdjustments: { type: CookingAdjustmentsSchema, default: () => ({}) },

    contextualNotes: {
      bestTime: { type: [String], default: [] },
      pairingSuggestions: { type: [String], default: [] },
      caution: { type: [String], default: [] },
    },

    source: { type: String, default: 'manual' },
    confidence: { type: Number, default: 0.6 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

module.exports = mongoose.model('RecipeTemplate', RecipeTemplateSchema)
