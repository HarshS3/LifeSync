function clamp01(x) {
  const n = Number(x)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function label3(score) {
  if (score < 0.35) return 'low'
  if (score < 0.7) return 'moderate'
  return 'high'
}

function getMean(graph, key) {
  if (!graph?.nutrients) return 0
  const v = graph.nutrients.get ? graph.nutrients.get(key) : graph.nutrients[key]
  return Number(v?.mean) || 0
}

function computeDerivedMetrics(graph) {
  const carbs = getMean(graph, 'carbs')
  const fiber = getMean(graph, 'fiber')
  const protein = getMean(graph, 'protein')
  const fat = getMean(graph, 'fat')
  const sugar = getMean(graph, 'sugar')
  const sodium = getMean(graph, 'sodium')
  const calories = Number(graph?.serving?.calories) || 0

  const glycemicPressureRaw = carbs / (fiber + protein + 1)
  const glycemicPressureScore = clamp01(1 - Math.exp(-glycemicPressureRaw / 2.5))

  const insulinLoadRaw = Math.max(0, carbs * 0.6 + protein * 0.2 - fiber * 0.5)
  const insulinLoadScore = clamp01(1 - Math.exp(-insulinLoadRaw / 20))

  const satietyRaw = Math.max(0, protein * 0.6 + fiber * 0.6 + fat * 0.15 - carbs * 0.15)
  const satietyScore = clamp01(1 - Math.exp(-satietyRaw / 15))

  const energyDensityRaw = calories
  const energyDensityScore = clamp01(1 - Math.exp(-energyDensityRaw / 350))

  const inflammatoryRaw = Math.max(0, sugar * 0.4 + fat * 0.25 + sodium / 1000 - fiber * 0.35)
  const inflammatoryScore = clamp01(1 - Math.exp(-inflammatoryRaw / 8))

  const micronutrientDiversity = null

  return {
    glycemic_pressure: { score: glycemicPressureScore, label: label3(glycemicPressureScore), raw: glycemicPressureRaw },
    insulin_load_estimate: { score: insulinLoadScore, label: label3(insulinLoadScore), raw: insulinLoadRaw },
    satiety_index: { score: satietyScore, label: label3(satietyScore), raw: satietyRaw },
    energy_density_score: { score: energyDensityScore, label: label3(energyDensityScore), raw: energyDensityRaw },
    inflammatory_potential: { score: inflammatoryScore, label: label3(inflammatoryScore), raw: inflammatoryRaw },
    micronutrient_diversity: micronutrientDiversity,

    inputs: { carbs, fiber, protein, fat, sugar, sodium, calories },
  }
}

module.exports = { computeDerivedMetrics }
