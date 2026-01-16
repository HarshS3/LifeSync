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
    potassium: 0,
    iron: 0,
    calcium: 0,
    vitaminB: 0,
    magnesium: 0,
    zinc: 0,
    vitaminC: 0,
    omega3: 0,
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

    totals.potassium += scale(n.potassium, grams)
    totals.iron += scale(n.iron, grams)
    totals.calcium += scale(n.calcium, grams)
    totals.vitaminB += scale(n.vitaminB, grams)
    totals.magnesium += scale(n.magnesium, grams)
    totals.zinc += scale(n.zinc, grams)
    totals.vitaminC += scale(n.vitaminC, grams)
    totals.omega3 += scale(n.omega3, grams)
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
      potassium_mg: roundTo(adjusted.potassium, 0),
      iron_mg: roundTo(adjusted.iron, 1),
      calcium_mg: roundTo(adjusted.calcium, 0),
      vitaminB_mg: roundTo(adjusted.vitaminB, 2),
      magnesium_mg: roundTo(adjusted.magnesium, 0),
      zinc_mg: roundTo(adjusted.zinc, 1),
      vitaminC_mg: roundTo(adjusted.vitaminC, 1),
      omega3_g: roundTo(adjusted.omega3, 2),
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
        potassium: computed.nutrition.potassium_mg,
        iron: computed.nutrition.iron_mg,
        calcium: computed.nutrition.calcium_mg,
        vitaminB: computed.nutrition.vitaminB_mg,
        magnesium: computed.nutrition.magnesium_mg,
        zinc: computed.nutrition.zinc_mg,
        vitaminC: computed.nutrition.vitaminC_mg,
        omega3: computed.nutrition.omega3_g,
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
      potassium: Number(n.potassium) || 0,
      iron: Number(n.iron) || 0,
      calcium: Number(n.calcium) || 0,
      vitaminB: Number(n.vitaminB) || 0,
      magnesium: Number(n.magnesium) || 0,
      zinc: Number(n.zinc) || 0,
      vitaminC: Number(n.vitaminC) || 0,
      omega3: Number(n.omega3) || 0,
      _local: { kind: 'ingredient' },
    }
  })

  return [...recipeResults.filter(Boolean), ...ingredientResults].slice(0, limit)
}

module.exports = {
  computeRecipeTotals,
  searchLocalFoods,
}
