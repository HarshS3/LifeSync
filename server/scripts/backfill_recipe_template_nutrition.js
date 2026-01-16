require('dotenv').config()

const mongoose = require('mongoose')
const { RecipeTemplate } = require('../models/nutritionKnowledge')
const { computeRecipeTotals } = require('../services/mealPipeline/aggregator')

function toBoolEnv(v) {
  return String(v || '').trim() === '1'
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync'
  await mongoose.connect(MONGO_URI)

  const limit = Number(process.env.LIFESYNC_RECIPE_BACKFILL_LIMIT) || 200
  const dryRun = toBoolEnv(process.env.LIFESYNC_RECIPE_BACKFILL_DRY_RUN)
  const onlyMissing = toBoolEnv(process.env.LIFESYNC_RECIPE_BACKFILL_ONLY_MISSING)
  const locale = String(process.env.LIFESYNC_RECIPE_BACKFILL_LOCALE || 'en').trim() || 'en'

  const query = { locale }
  if (onlyMissing) {
    query.$or = [
      { computedAt: { $exists: false } },
      { computedAt: null },
      { computedNutrition: { $exists: false } },
      { computedNutrition: null },
    ]
  }

  const recipes = await RecipeTemplate.find(query).limit(limit)

  let scanned = 0
  let updated = 0
  let skippedNoChange = 0
  let missingIngredientsCount = 0

  for (const r of recipes) {
    scanned += 1

    const computed = await computeRecipeTotals({ recipeName: r.name, locale: r.locale || locale })
    if (!computed) continue

    const patch = {
      computedNutrition: computed.nutrition || null,
      computedDerivedMetrics: computed.derived_metrics || null,
      computedMissingIngredients: Array.isArray(computed.missing_ingredients) ? computed.missing_ingredients : [],
      computedSource: String(computed.source || ''),
      computedAt: new Date(),
    }

    const before = {
      computedNutrition: r.computedNutrition || null,
      computedDerivedMetrics: r.computedDerivedMetrics || null,
      computedMissingIngredients: Array.isArray(r.computedMissingIngredients) ? r.computedMissingIngredients : [],
      computedSource: r.computedSource || '',
    }

    const changed = JSON.stringify(before) !== JSON.stringify({
      computedNutrition: patch.computedNutrition,
      computedDerivedMetrics: patch.computedDerivedMetrics,
      computedMissingIngredients: patch.computedMissingIngredients,
      computedSource: patch.computedSource,
    })

    if (!changed) {
      skippedNoChange += 1
      continue
    }

    if (patch.computedMissingIngredients.length) missingIngredientsCount += 1

    if (!dryRun) {
      r.computedNutrition = patch.computedNutrition
      r.computedDerivedMetrics = patch.computedDerivedMetrics
      r.computedMissingIngredients = patch.computedMissingIngredients
      r.computedSource = patch.computedSource
      r.computedAt = patch.computedAt
      await r.save()
    }

    updated += 1
  }

  console.log('[backfill_recipe_template_nutrition] locale:', locale)
  console.log('[backfill_recipe_template_nutrition] scanned:', scanned)
  console.log('[backfill_recipe_template_nutrition] updated:', updated)
  console.log('[backfill_recipe_template_nutrition] skipped_no_change:', skippedNoChange)
  console.log('[backfill_recipe_template_nutrition] recipes_with_missing_ingredients:', missingIngredientsCount)
  console.log('[backfill_recipe_template_nutrition] dryRun:', dryRun)
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[backfill_recipe_template_nutrition] failed:', err?.message || err)
      process.exitCode = 1
    })
    .finally(async () => {
      try {
        await mongoose.disconnect()
      } catch {
        // ignore
      }
    })
}
