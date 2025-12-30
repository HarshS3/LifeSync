const fs = require('fs')
const path = require('path')

const ingredients = require('./data/ingredients.json')
const recipes = require('./data/recipes.json')
const { scale, deriveMetrics } = require('./utils')

const meals = recipes.map((recipe) => {
  let totals = { carbs: 0, protein: 0, fat: 0, fiber: 0, calories: 0, sugar: 0, sodium: 0 }

  recipe.ingredients.forEach((i) => {
    const base = ingredients[i.item]
    if (!base) return
    Object.keys(totals).forEach((key) => {
      totals[key] += scale(base[key], i.grams)
    })
  })

  // Optional adjustment: oil absorption
  if (recipe.cooking_adjustments?.oilAbsorptionFactor && recipe.ingredients.some((x) => x.item === 'oil')) {
    const f = Number(recipe.cooking_adjustments.oilAbsorptionFactor)
    if (Number.isFinite(f) && f > 0) {
      totals.fat *= f
      totals.calories *= 1 + (f - 1) * 0.6
    }
  }

  const derived = deriveMetrics(totals)

  return {
    name: recipe.name,
    serving_size_g: recipe.serving_size_g,
    nutrition: {
      carbs_g: +totals.carbs.toFixed(1),
      protein_g: +totals.protein.toFixed(1),
      fat_g: +totals.fat.toFixed(1),
      fiber_g: +totals.fiber.toFixed(1),
      sugar_g: +totals.sugar.toFixed(1),
      sodium_mg: +totals.sodium.toFixed(0),
      calories_kcal: +totals.calories.toFixed(0),
    },
    derived_metrics: derived,
    source: 'ingredient_composition_pipeline',
    confidence: 0.6,
  }
})

const outPath = path.join(__dirname, 'data', 'meals-output.json')
fs.writeFileSync(outPath, JSON.stringify(meals, null, 2))

console.log('Meals generated successfully:', outPath)
