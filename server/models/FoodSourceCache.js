const mongoose = require('mongoose');

const FoodSourceCacheSchema = new mongoose.Schema(
  {
    foodName: { type: String, required: true, unique: true },
    proteinSource: { type: String, default: 'None' }, // e.g., Dairy, Poultry, Legumes, Nuts, Seafood, Red Meat, Plant-based, Supplement
    carbSource: { type: String, default: 'None' }, // e.g., Whole Grains, Refined Grains, Fruits, Vegetables, Legumes, Sugar/Sweets
    fatSource: { type: String, default: 'None' }, // e.g., Dairy Fat, Plant Oils, Nuts/Seeds, Animal Fat, Seafood
    isAntiInflammatory: { type: Boolean, default: false }, // e.g., Berries, Olive Oil, Salmon
    isProInflammatory: { type: Boolean, default: false }, // e.g., Refined Sugar, Seed Oils, Processed Meat
  },
  { timestamps: true }
);

module.exports = mongoose.models.FoodSourceCache || mongoose.model('FoodSourceCache', FoodSourceCacheSchema);
