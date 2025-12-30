function scale(nutrient, grams) {
  return (Number(nutrient || 0) * Number(grams || 0)) / 100
}

function deriveMetrics(nutrition) {
  const carbs = Number(nutrition.carbs) || 0
  const fiber = Number(nutrition.fiber) || 0
  const protein = Number(nutrition.protein) || 0
  const gp = carbs / (fiber + protein + 1)
  return {
    glycemic_pressure: gp > 10 ? 'high' : gp > 5 ? 'moderate' : 'low',
    energy_density: (Number(nutrition.calories) || 0) > 250 ? 'high' : 'moderate',
  }
}

module.exports = { scale, deriveMetrics }
