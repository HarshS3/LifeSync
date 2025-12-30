function clamp01(x) {
  const n = Number(x)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function computeOverallScore({ derivedMetrics, uncertainty }) {
  // A simple internal score for ranking/comparison (not medical advice).
  const sat = Number(derivedMetrics?.satiety_index?.score) || 0
  const gly = Number(derivedMetrics?.glycemic_pressure?.score) || 0
  const infl = Number(derivedMetrics?.inflammatory_potential?.score) || 0

  const raw = 0.45 * sat + 0.35 * (1 - gly) + 0.2 * (1 - infl)
  const score = clamp01(raw)

  const conf = clamp01(
    0.55 * (Number(uncertainty?.nutrient_accuracy) || 0.7) +
      0.45 * (Number(uncertainty?.interaction_estimate) || 0.5)
  )

  return {
    nutrition_score: {
      score,
      label: score >= 0.7 ? 'strong' : score >= 0.45 ? 'moderate' : 'weak',
      confidence: conf,
    },
  }
}

module.exports = { computeOverallScore }
