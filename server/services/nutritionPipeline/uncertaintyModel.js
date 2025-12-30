function clamp01(x) {
  const n = Number(x)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function getMean(graph, key) {
  if (!graph?.nutrients) return 0
  const v = graph.nutrients.get ? graph.nutrients.get(key) : graph.nutrients[key]
  return Number(v?.mean) || 0
}

function getVariance(graph, key) {
  if (!graph?.nutrients) return 0
  const v = graph.nutrients.get ? graph.nutrients.get(key) : graph.nutrients[key]
  return Number(v?.variance) || 0
}

function populationVarianceLabel(cv) {
  if (cv >= 0.45) return 'high'
  if (cv >= 0.25) return 'medium'
  return 'low'
}

function computeUncertainty({ nutrientGraph, interactions }) {
  const primary = nutrientGraph?.sourceSummary?.primarySource || 'unknown'
  const nutrientAccuracy = primary === 'FatSecret' ? 0.75 : 0.7

  const interactionEstimate = interactions?.length
    ? clamp01(interactions.reduce((s, i) => s + (1 - (Number(i.uncertainty) || 0.5)), 0) / interactions.length)
    : 0.5

  const keys = ['protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']
  const cvs = keys.map((k) => {
    const mean = Math.abs(getMean(nutrientGraph, k)) || 1
    const variance = Math.abs(getVariance(nutrientGraph, k))
    const sd = Math.sqrt(variance)
    return sd / mean
  })
  const cv = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : 0.3

  return {
    nutrient_accuracy: clamp01(nutrientAccuracy),
    interaction_estimate: clamp01(interactionEstimate),
    population_variance: populationVarianceLabel(cv),
    population_variance_cv: clamp01(cv),
  }
}

module.exports = { computeUncertainty }
