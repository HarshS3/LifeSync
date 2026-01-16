require('dotenv').config();

const mongoose = require('mongoose');
const { IngredientProfile } = require('../models/nutritionKnowledge');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
  await mongoose.connect(MONGO_URI);

  const setDefaults = {
    'nutrientsPer100g.potassium': 0,
    'nutrientsPer100g.iron': 0,
    'nutrientsPer100g.calcium': 0,
    'nutrientsPer100g.vitaminB': 0,
    'nutrientsPer100g.magnesium': 0,
    'nutrientsPer100g.zinc': 0,
    'nutrientsPer100g.vitaminC': 0,
    'nutrientsPer100g.omega3': 0,
  };

  const res = await IngredientProfile.updateMany(
    {
      $or: [
        { 'nutrientsPer100g.potassium': { $exists: false } },
        { 'nutrientsPer100g.iron': { $exists: false } },
        { 'nutrientsPer100g.calcium': { $exists: false } },
        { 'nutrientsPer100g.vitaminB': { $exists: false } },
        { 'nutrientsPer100g.magnesium': { $exists: false } },
        { 'nutrientsPer100g.zinc': { $exists: false } },
        { 'nutrientsPer100g.vitaminC': { $exists: false } },
        { 'nutrientsPer100g.omega3': { $exists: false } },
      ],
    },
    { $set: setDefaults }
  );

  console.log('[migrate_ingredient_profiles_add_micros] matched:', res.matchedCount ?? res.n);
  console.log('[migrate_ingredient_profiles_add_micros] modified:', res.modifiedCount ?? res.nModified);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[migrate_ingredient_profiles_add_micros] failed:', err?.message || err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    });
}
