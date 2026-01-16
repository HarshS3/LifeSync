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

const ComputedNutritionSchema = new mongoose.Schema(
  {
    carbs_g: { type: Number, default: 0 },
    protein_g: { type: Number, default: 0 },
    fat_g: { type: Number, default: 0 },
    fiber_g: { type: Number, default: 0 },
    sugar_g: { type: Number, default: 0 },
    sodium_mg: { type: Number, default: 0 },
    potassium_mg: { type: Number, default: 0 },
    iron_mg: { type: Number, default: 0 },
    calcium_mg: { type: Number, default: 0 },
    vitaminB_mg: { type: Number, default: 0 },
    magnesium_mg: { type: Number, default: 0 },
    zinc_mg: { type: Number, default: 0 },
    vitaminC_mg: { type: Number, default: 0 },
    omega3_g: { type: Number, default: 0 },
    calories_kcal: { type: Number, default: 0 },
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

    // Derived/stored nutrition per serving (computed from IngredientProfile composition).
    computedNutrition: { type: ComputedNutritionSchema, default: null },
    computedDerivedMetrics: { type: mongoose.Schema.Types.Mixed, default: null },
    computedMissingIngredients: { type: [String], default: [] },
    computedSource: { type: String, default: '' },
    computedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model('RecipeTemplate', RecipeTemplateSchema)
