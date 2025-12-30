require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const { IngredientProfile, RecipeTemplate } = require('./models/nutritionKnowledge')

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase()
}

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync'
  await mongoose.connect(MONGO_URI)

  const ingredientsPath = path.join(__dirname, 'meal-pipeline', 'data', 'ingredients.json')
  const recipesPath = path.join(__dirname, 'meal-pipeline', 'data', 'recipes.json')
  const ingredients = JSON.parse(fs.readFileSync(ingredientsPath, 'utf8'))
  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf8'))

  for (const [itemKeyRaw, n] of Object.entries(ingredients)) {
    const itemKey = normalizeKey(itemKeyRaw)
    const displayName = itemKey.replace(/_/g, ' ')
    await IngredientProfile.updateOne(
      { itemKey, locale: 'en' },
      {
        $set: {
          itemKey,
          displayName,
          locale: 'en',
          nutrientsPer100g: {
            carbs: Number(n.carbs) || 0,
            protein: Number(n.protein) || 0,
            fat: Number(n.fat) || 0,
            fiber: Number(n.fiber) || 0,
            calories: Number(n.calories) || 0,
            sugar: Number(n.sugar) || 0,
            sodium: Number(n.sodium) || 0,
          },
          source: 'meal-pipeline',
          confidence: 0.6,
          meta: { per: '100g' },
        },
      },
      { upsert: true }
    )
  }

  for (const r of recipes) {
    const name = normalizeKey(r.name)
    const mealId = r.meal_id ? normalizeKey(r.meal_id) : null
    await RecipeTemplate.updateOne(
      { name, locale: 'en' },
      {
        $set: {
          mealId,
          name,
          displayName: String(r.display_name || r.name || ''),
          category: String(r.category || ''),
          locale: 'en',
          servingSizeG: Number(r.serving_size_g) || 0,
          servingDescription: String(r?.serving?.description || r.serving_description || ''),
          ingredients: (r.ingredients || []).map((i) => ({
            itemKey: normalizeKey(i.item),
            grams: Number(i.grams) || 0,
          })),
          cookingMethod: String(r?.recipe?.cooking_method || r.cooking_method || ''),
          cookingAdjustments: {
            oilAbsorptionFactor: Number(r.cooking_adjustments?.oilAbsorptionFactor) || 1.0,
            moistureLossFactor: 1.0,
            notes: '',
          },
          contextualNotes: {
            bestTime: Array.isArray(r?.contextual_notes?.best_time) ? r.contextual_notes.best_time : [],
            pairingSuggestions: Array.isArray(r?.contextual_notes?.pairing_suggestions) ? r.contextual_notes.pairing_suggestions : [],
            caution: Array.isArray(r?.contextual_notes?.caution) ? r.contextual_notes.caution : [],
          },
          source: 'meal-pipeline',
          confidence: 0.6,
          meta: {},
        },
      },
      { upsert: true }
    )
  }

  console.log('Seeded ingredient profiles:', Object.keys(ingredients).length)
  console.log('Seeded recipe templates:', recipes.length)
  await mongoose.disconnect()
}

seed().catch((e) => {
  console.error('Seed failed', e)
  process.exit(1)
})
