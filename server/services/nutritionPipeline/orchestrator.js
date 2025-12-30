const { resolveCanonicalFood } = require('./canonicalFoodResolver')
const { searchFoods } = require('../nutritionProvider')
const { getLatestNutrientGraph, buildAndStoreNutrientGraph, buildAndStoreNutrientGraphFromTotals } = require('./nutrientGraphBuilder')
const { computeDerivedMetrics } = require('./derivedMetrics')
const { buildInteractions } = require('./interactionEngine')
const { computeUncertainty } = require('./uncertaintyModel')
const { computeOverallScore } = require('./scoringModel')
const { generateNutritionSemanticJson } = require('../../aiClient')
const { computeRecipeTotals } = require('../mealPipeline/aggregator')
const { buildMealObject } = require('../mealPipeline/mealObjectBuilder')
const { analyzeDiseaseImpact } = require('../disease/diseaseEngine')
const { buildPersonalizedExplanation } = require('./explanationBuilder')

async function analyzeFood({ input, user, locale = 'en', includeLLM = false }) {
  const resolved = await resolveCanonicalFood({ input, locale, allowProvisional: true })
  const canonicalId = resolved.canonical_id

  let computedDish = null
  let mealObject = null

  let nutrientGraph = canonicalId ? await getLatestNutrientGraph(canonicalId) : null

  if (!nutrientGraph) {
    // Prefer deterministic dish decomposition if a local recipe template exists.
    computedDish = await computeRecipeTotals({ recipeName: input, locale })
    mealObject = computedDish ? await buildMealObject({ recipeNameOrMealId: input, locale }) : null
    if (computedDish && canonicalId) {
      nutrientGraph = await buildAndStoreNutrientGraphFromTotals({
        canonicalId,
        serving: { qty: 1, unit: `${computedDish.recipe.serving_size_g} g` },
        totals: {
          carbs: computedDish.nutrition.carbs_g,
          protein: computedDish.nutrition.protein_g,
          fat: computedDish.nutrition.fat_g,
          fiber: computedDish.nutrition.fiber_g,
          sugar: computedDish.nutrition.sugar_g,
          sodium: computedDish.nutrition.sodium_mg,
          calories: computedDish.nutrition.calories_kcal,
        },
        sourceLabel: 'ingredient_composition_pipeline',
        sourceMeta: {
          recipe: computedDish.recipe,
          missing_ingredients: computedDish.missing_ingredients,
        },
        nutrientAccuracy: 0.6,
      })
    }
  }

  if (!nutrientGraph) {
    const results = await searchFoods(input)
    const best = Array.isArray(results) ? results[0] : null
    if (best && canonicalId) {
      nutrientGraph = await buildAndStoreNutrientGraph({
        canonicalId,
        sourceFood: best,
        sourceLabel: 'FatSecret',
      })
    }
  }

  const derivedMetrics = nutrientGraph ? computeDerivedMetrics(nutrientGraph) : null
  const interactions = nutrientGraph ? await buildInteractions({ canonicalId, derivedMetrics, user }) : []
  const uncertainty = nutrientGraph ? computeUncertainty({ nutrientGraph, interactions }) : null
  const scoring = derivedMetrics && uncertainty ? computeOverallScore({ derivedMetrics, uncertainty }) : null

  const disease_analysis = derivedMetrics ? await analyzeDiseaseImpact({ user, derivedMetrics, mealContext: { input }, locale }) : []

  const explanation = buildPersonalizedExplanation({
    input,
    mealObject,
    nutrientGraph,
    derivedMetrics,
    diseaseAnalysis: disease_analysis,
  })

  let llmSemantic = null
  if (includeLLM && derivedMetrics && uncertainty) {
    llmSemantic = await generateNutritionSemanticJson({
      canonicalId,
      input,
      nutrientGraph,
      derivedMetrics,
      interactions,
      uncertainty,
      userProfile: {
        dietType: user?.dietType,
        avoidFoods: user?.avoidFoods || [],
        allergies: user?.allergies || [],
        conditions: user?.conditions || [],
        medications: (user?.medications || []).map((m) => m?.name).filter(Boolean),
      },
    })
  }

  return {
    resolver: resolved,
    canonical_id: canonicalId,
    meal_object: mealObject,
    dish_breakdown: computedDish,
    nutrient_graph: nutrientGraph,
    derived_metrics: derivedMetrics,
    disease_analysis,
    explanation,
    interactions,
    uncertainty,
    scoring,
    llm: llmSemantic,
  }
}

module.exports = {
  analyzeFood,
}
