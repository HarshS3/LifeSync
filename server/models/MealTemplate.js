const mongoose = require('mongoose');

const MealTemplateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'], default: 'snack' },
    foods: [
      {
        name: String,
        quantity: Number,
        unit: { type: String, default: 'g' },
        baseServingQty: { type: Number, default: 0 },
        baseServingUnit: { type: String, default: '' },
        servingLabel: { type: String, default: '' },
        servingWeightG: { type: Number, default: null },
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
        sugar: { type: Number, default: 0 },
        sodium: { type: Number, default: 0 },
        potassium: { type: Number, default: 0 },
        iron: { type: Number, default: 0 },
        calcium: { type: Number, default: 0 },
        magnesium: { type: Number, default: 0 },
        zinc: { type: Number, default: 0 },
        vitaminC: { type: Number, default: 0 },
        omega3: { type: Number, default: 0 },
        cholesterol: { type: Number, default: 0 },
        saturatedFat: { type: Number, default: 0 },
        phosphorus: { type: Number, default: 0 },
        copper: { type: Number, default: 0 },
        selenium: { type: Number, default: 0 },
        manganese: { type: Number, default: 0 },
        vitaminA: { type: Number, default: 0 },
        vitaminE: { type: Number, default: 0 },
        vitaminD: { type: Number, default: 0 },
        vitaminB12: { type: Number, default: 0 },
        folate: { type: Number, default: 0 },
      }
    ],
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealTemplate', MealTemplateSchema);
