const mongoose = require('mongoose');

const TarlaRecipeSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true, index: true },
    recipeTitle: { type: String },
    recipeUrl: { type: String, unique: true, index: true },
    caloriesUrl: { type: String, index: true },
    
    servingLabel: { type: String },
    ingredientCount: { type: Number },
    
    // Grouped ingredients
    ingredients: [{
      section: { type: String, default: 'Main' },
      items: [{
        text: String,
        name: String,
        amount: String
      }]
    }],

    // Nutritional values (standardized)
    nutrients: {
      energy: { type: Number, index: true },
      protein: { type: Number },
      carbs: { type: Number },
      fat: { type: Number },
      fiber: { type: Number },
      sodium: { type: Number },
      cholesterol: { type: Number }
    },
    
    // Raw strings for display
    nutritionDisplay: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

TarlaRecipeSchema.index({ foodName: 'text', recipeTitle: 'text' });

module.exports = mongoose.model('TarlaRecipe', TarlaRecipeSchema);
