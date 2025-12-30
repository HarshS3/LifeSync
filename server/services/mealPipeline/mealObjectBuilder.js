const { RecipeTemplate } = require('../../models/nutritionKnowledge')
const { computeRecipeTotals } = require('./aggregator')

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase()
}

function labelDiabetes(glycemicLabel) {
  if (glycemicLabel === 'high') return 'avoid_or_limit'
  if (glycemicLabel === 'moderate') return 'consume_in_moderation'
  return 'generally_safe'
}

function labelWeightLoss(energyDensityLabel) {
  if (energyDensityLabel === 'high') return 'limit'
  if (energyDensityLabel === 'moderate') return 'moderation'
  return 'good_choice'
}

function labelGutHealth(fiberG) {
  const f = Number(fiberG) || 0
  if (f >= 10) return 'good'
  if (f >= 5) return 'moderate'
  return 'low'
}

function labelHeartHealth({ fatG, fiberG, sodiumMg }) {
  const fat = Number(fatG) || 0
  const fiber = Number(fiberG) || 0
  const sodium = Number(sodiumMg) || 0
  if (sodium > 700) return 'caution'
  if (fiber >= 8 && fat <= 12) return 'positive'
  return 'neutral'
}

function buildRuleExplanation({ name, carbsG, proteinG, fiberG, fatG, energyDensityLabel, glycemicLabel }) {
  const tradeoffs = []
  if ((Number(carbsG) || 0) >= 40) tradeoffs.push('higher carbohydrate load vs steady energy when paired with protein/fiber')
  if ((Number(fiberG) || 0) >= 6) tradeoffs.push('better satiety and gut support vs potential heaviness in large portions')
  if ((Number(fatG) || 0) >= 10) tradeoffs.push('richer taste and satiety vs higher calories')

  const summaryParts = []
  summaryParts.push(`${name} is ${energyDensityLabel === 'high' ? 'more energy-dense' : 'moderately energy-dense'} overall`)
  if (glycemicLabel === 'high') summaryParts.push('and may raise blood sugar more quickly')
  if (glycemicLabel === 'moderate') summaryParts.push('with a moderate blood sugar impact depending on portion and pairing')
  if (glycemicLabel === 'low') summaryParts.push('with a relatively steady energy profile')

  return {
    summary: summaryParts.join(', ') + '.',
    tradeoffs: tradeoffs.slice(0, 3),
  }
}

async function buildMealObject({ recipeNameOrMealId, locale = 'en' }) {
  const key = normalizeKey(recipeNameOrMealId)
  if (!key) return null

  const recipe = await RecipeTemplate.findOne({ $or: [{ mealId: key }, { name: key }], locale })
  if (!recipe) return null

  const computed = await computeRecipeTotals({ recipeName: recipe.name, locale })
  if (!computed) return null

  const servingWeightG = Number(recipe.servingSizeG) || 0
  const derived = computed.derived_metrics || {}
  const glycemicLabel = derived?.glycemic_pressure?.label || derived?.glycemic_pressure_label || 'low'
  const energyDensityLabel = derived?.energy_density?.label || derived?.energy_density_label || 'low'

  const name = recipe.displayName || recipe.name

  const healthDimensions = {
    diabetes: labelDiabetes(glycemicLabel),
    weight_loss: labelWeightLoss(energyDensityLabel),
    gut_health: labelGutHealth(computed.nutrition.fiber_g),
    heart_health: labelHeartHealth({
      fatG: computed.nutrition.fat_g,
      fiberG: computed.nutrition.fiber_g,
      sodiumMg: computed.nutrition.sodium_mg,
    }),
  }

  const aiExplanation = buildRuleExplanation({
    name,
    carbsG: computed.nutrition.carbs_g,
    proteinG: computed.nutrition.protein_g,
    fiberG: computed.nutrition.fiber_g,
    fatG: computed.nutrition.fat_g,
    energyDensityLabel,
    glycemicLabel,
  })

  const nutritionDataConfidence = Math.min(0.9, Math.max(0.4, Number(recipe.confidence) || 0.6))

  return {
    meal_id: recipe.mealId || `meal_${recipe.name.replace(/\s+/g, '_')}`,
    name,
    category: recipe.category || '',
    serving: {
      description: recipe.servingDescription || '1 serving',
      weight_g: servingWeightG,
    },
    recipe: {
      ingredients: (recipe.ingredients || []).map((i) => ({ item: i.itemKey, grams: i.grams })),
      cooking_method: recipe.cookingMethod || '',
    },
    nutrition: computed.nutrition,
    derived_metrics: computed.derived_metrics,
    health_dimensions: healthDimensions,
    contextual_notes: {
      best_time: recipe.contextualNotes?.bestTime || [],
      pairing_suggestions: recipe.contextualNotes?.pairingSuggestions || [],
      caution: recipe.contextualNotes?.caution || [],
    },
    ai_explanation: aiExplanation,
    confidence: {
      nutrition_data: nutritionDataConfidence,
      derived_metrics: Math.max(0.5, nutritionDataConfidence - 0.1),
      health_interpretation: Math.max(0.4, nutritionDataConfidence - 0.25),
    },
    source: computed.source || 'ingredient_composition_pipeline',
    status: 'computed',
  }
}

module.exports = {
  buildMealObject,
}
