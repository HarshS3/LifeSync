const { IngredientProfile, RecipeTemplate } = require('../../models/nutritionKnowledge')
const { scale, roundTo, deriveMetricsFromTotals, applyCookingAdjustments } = require('./utils')

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase()
}

async function computeRecipeTotals({ recipeName, locale = 'en' }) {
  const name = normalizeKey(recipeName)
  if (!name) return null

  const recipe = await RecipeTemplate.findOne({ name, locale })
  if (!recipe) return null

  const totals = {
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
    calories: 0,
    sugar: 0,
    sodium: 0,
  }

  const missing = []
  for (const ing of recipe.ingredients || []) {
    const itemKey = normalizeKey(ing.itemKey)
    const grams = Number(ing.grams) || 0
    if (!itemKey || grams <= 0) continue

    const base = await IngredientProfile.findOne({ itemKey, locale })
    if (!base) {
      missing.push(itemKey)
      continue
    }

    const n = base.nutrientsPer100g || {}
    totals.carbs += scale(n.carbs, grams)
    totals.protein += scale(n.protein, grams)
    totals.fat += scale(n.fat, grams)
    totals.fiber += scale(n.fiber, grams)
    totals.calories += scale(n.calories, grams)
    totals.sugar += scale(n.sugar, grams)
    totals.sodium += scale(n.sodium, grams)
  }

  const adjusted = applyCookingAdjustments({
    totals,
    adjustments: recipe.cookingAdjustments,
    recipeIngredients: recipe.ingredients,
  })

  const derived = deriveMetricsFromTotals({ ...adjusted, servingWeightG: recipe.servingSizeG })

  return {
    recipe: {
      meal_id: recipe.mealId || null,
      name: recipe.name,
      display_name: recipe.displayName || recipe.name,
      category: recipe.category || '',
      serving_description: recipe.servingDescription || '',
      serving_size_g: recipe.servingSizeG,
      ingredients: recipe.ingredients,
      cooking_method: recipe.cookingMethod || '',
      cooking_adjustments: recipe.cookingAdjustments,
      contextual_notes: recipe.contextualNotes || {},
      confidence: recipe.confidence,
      source: recipe.source,
    },
    nutrition: {
      carbs_g: roundTo(adjusted.carbs, 1),
      protein_g: roundTo(adjusted.protein, 1),
      fat_g: roundTo(adjusted.fat, 1),
      fiber_g: roundTo(adjusted.fiber, 1),
      sugar_g: roundTo(adjusted.sugar, 1),
      sodium_mg: roundTo(adjusted.sodium, 0),
      calories_kcal: roundTo(adjusted.calories, 0),
    },
    derived_metrics: derived,
    missing_ingredients: missing,
    source: 'ingredient_composition_pipeline',
    confidence: recipe.confidence,
  }
}

async function searchLocalFoods({ q, locale = 'en', limit = 10 }) {
  const query = normalizeKey(q)
  if (!query) return []

  const [recipes, ingredients] = await Promise.all([
    RecipeTemplate.find({ name: { $regex: query, $options: 'i' }, locale }).limit(limit),
    IngredientProfile.find({ displayName: { $regex: query, $options: 'i' }, locale }).limit(limit),
  ])

  // Return in the same shape as your existing search API (name, servingQty, servingUnit, macros).
  const recipeResults = await Promise.all(
    recipes.map(async (r) => {
      const computed = await computeRecipeTotals({ recipeName: r.name, locale })
      if (!computed) return null
      return {
        id: `dish:${r.name}`,
        name: r.name,
        brand: null,
        servingQty: 1,
        servingUnit: `${r.servingSizeG} g`,
        calories: computed.nutrition.calories_kcal,
        protein: computed.nutrition.protein_g,
        carbs: computed.nutrition.carbs_g,
        fat: computed.nutrition.fat_g,
        fiber: computed.nutrition.fiber_g,
        sugar: computed.nutrition.sugar_g,
        sodium: computed.nutrition.sodium_mg,
        _local: { kind: 'recipe', missing: computed.missing_ingredients },
      }
    })
  )

  const ingredientResults = ingredients.map((i) => {
    const n = i.nutrientsPer100g || {}
    return {
      id: `ingredient:${i.itemKey}`,
      name: i.displayName,
      brand: null,
      servingQty: 100,
      servingUnit: 'g',
      calories: Number(n.calories) || 0,
      protein: Number(n.protein) || 0,
      carbs: Number(n.carbs) || 0,
      fat: Number(n.fat) || 0,
      fiber: Number(n.fiber) || 0,
      sugar: Number(n.sugar) || 0,
      sodium: Number(n.sodium) || 0,
      _local: { kind: 'ingredient' },
    }
  })

  return [...recipeResults.filter(Boolean), ...ingredientResults].slice(0, limit)
}

module.exports = {
  computeRecipeTotals,
  searchLocalFoods,
}
