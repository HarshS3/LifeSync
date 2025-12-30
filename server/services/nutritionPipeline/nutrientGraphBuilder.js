const {
  EvidenceUnit,
  NutrientGraph,
  KnowledgeEdge,
} = require('../../models/nutritionKnowledge')
const { getNutrientMeta } = require('./nutrientCatalog')

function varianceFromMean(mean, rel = 0.15) {
  const m = Number(mean) || 0
  const sd = Math.abs(m) * rel
  return sd * sd
}

async function buildAndStoreNutrientGraph({ canonicalId, sourceFood, sourceLabel = 'FatSecret' }) {
  if (!canonicalId) throw new Error('canonicalId is required')
  if (!sourceFood) throw new Error('sourceFood is required')

  const nutrients = new Map()
  const evidenceIds = []

  const addNutrient = async (key, meanValue, unitOverride = null) => {
    const meta = getNutrientMeta(key)
    const unit = unitOverride || meta.unit
    const mean = Number(meanValue) || 0

    const evidence = await EvidenceUnit.create({
      subjectKind: 'food',
      subjectKey: canonicalId,
      claimType: 'nutrient_distribution',
      claimKey: key,
      value: {
        mean,
        variance: varianceFromMean(mean, key === 'sodium' ? 0.25 : 0.15),
        distribution: 'normal',
      },
      unit,
      source: sourceLabel,
      strength: sourceLabel === 'FatSecret' ? 0.75 : 0.7,
      meta: {
        servingQty: sourceFood.servingQty,
        servingUnit: sourceFood.servingUnit,
        sourceFoodId: sourceFood.id,
        sourceName: sourceFood.name,
      },
    })
    evidenceIds.push(evidence._id)

    nutrients.set(key, {
      mean,
      variance: evidence.value.variance,
      distribution: 'normal',
      unit,
      type: meta.type,
      role: meta.role,
      evidenceIds: [evidence._id],
    })

    // Graph edge for future querying
    await KnowledgeEdge.updateOne(
      {
        fromKind: 'food',
        fromKey: canonicalId,
        predicate: 'contains',
        toKind: 'nutrient',
        toKey: key,
      },
      {
        $set: {
          strength: 0.5,
          uncertainty: 0.4,
          evidenceIds: [evidence._id],
          meta: { unit, mean },
        },
      },
      { upsert: true }
    )
  }

  await addNutrient('protein', sourceFood.protein)
  await addNutrient('carbs', sourceFood.carbs)
  await addNutrient('fat', sourceFood.fat)
  await addNutrient('fiber', sourceFood.fiber)
  await addNutrient('sugar', sourceFood.sugar)
  await addNutrient('sodium', sourceFood.sodium, 'mg')

  const graphDoc = await NutrientGraph.create({
    canonicalId,
    version: 1,
    serving: {
      qty: Number(sourceFood.servingQty) || 1,
      unit: sourceFood.servingUnit || 'serving',
      calories: Number(sourceFood.calories) || 0,
    },
    nutrients,
    sourceSummary: {
      primarySource: sourceLabel,
      sources: [sourceLabel],
    },
  })

  await KnowledgeEdge.updateOne(
    { fromKind: 'food', fromKey: canonicalId, predicate: 'has_graph', toKind: 'metric', toKey: `nutrient_graph_v${graphDoc.version}` },
    {
      $set: {
        strength: 0.9,
        uncertainty: 0.2,
        evidenceIds,
        meta: { graphId: String(graphDoc._id) },
      },
    },
    { upsert: true }
  )

  return graphDoc
}

async function buildAndStoreNutrientGraphFromTotals({
  canonicalId,
  serving,
  totals,
  sourceLabel = 'ingredient_composition_pipeline',
  sourceMeta = {},
  nutrientAccuracy = 0.6,
}) {
  if (!canonicalId) throw new Error('canonicalId is required')
  const nutrients = new Map()
  const evidenceIds = []

  const add = async (key, mean, unitOverride = null) => {
    const meta = getNutrientMeta(key)
    const unit = unitOverride || meta.unit
    const v = Number(mean) || 0
    const evidence = await EvidenceUnit.create({
      subjectKind: 'food',
      subjectKey: canonicalId,
      claimType: 'nutrient_distribution',
      claimKey: key,
      value: {
        mean: v,
        variance: varianceFromMean(v, key === 'sodium' ? 0.2 : 0.12),
        distribution: 'normal',
      },
      unit,
      source: sourceLabel,
      strength: nutrientAccuracy,
      meta: sourceMeta,
    })
    evidenceIds.push(evidence._id)
    nutrients.set(key, {
      mean: v,
      variance: evidence.value.variance,
      distribution: 'normal',
      unit,
      type: meta.type,
      role: meta.role,
      evidenceIds: [evidence._id],
    })
    await KnowledgeEdge.updateOne(
      { fromKind: 'food', fromKey: canonicalId, predicate: 'contains', toKind: 'nutrient', toKey: key },
      {
        $set: {
          strength: 0.6,
          uncertainty: 1 - nutrientAccuracy,
          evidenceIds: [evidence._id],
          meta: { unit, mean: v },
        },
      },
      { upsert: true }
    )
  }

  await add('protein', totals.protein)
  await add('carbs', totals.carbs)
  await add('fat', totals.fat)
  await add('fiber', totals.fiber)
  await add('sugar', totals.sugar)
  await add('sodium', totals.sodium, 'mg')

  const graphDoc = await NutrientGraph.create({
    canonicalId,
    version: 1,
    serving: {
      qty: Number(serving?.qty) || 1,
      unit: serving?.unit || 'serving',
      calories: Number(totals.calories) || 0,
    },
    nutrients,
    sourceSummary: {
      primarySource: sourceLabel,
      sources: [sourceLabel],
    },
  })

  await KnowledgeEdge.updateOne(
    { fromKind: 'food', fromKey: canonicalId, predicate: 'has_graph', toKind: 'metric', toKey: `nutrient_graph_v${graphDoc.version}` },
    {
      $set: {
        strength: 0.9,
        uncertainty: 1 - nutrientAccuracy,
        evidenceIds,
        meta: { graphId: String(graphDoc._id) },
      },
    },
    { upsert: true }
  )

  return graphDoc
}

async function getLatestNutrientGraph(canonicalId) {
  if (!canonicalId) return null
  return NutrientGraph.findOne({ canonicalId }).sort({ createdAt: -1 })
}

module.exports = {
  buildAndStoreNutrientGraph,
  buildAndStoreNutrientGraphFromTotals,
  getLatestNutrientGraph,
}
