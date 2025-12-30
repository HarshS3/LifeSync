function scale(per100gValue, grams) {
  const v = Number(per100gValue) || 0
  const g = Number(grams) || 0
  return (v * g) / 100
}

function roundTo(n, d) {
  const x = Number(n) || 0
  const p = 10 ** d
  return Math.round(x * p) / p
}

function deriveMetricsFromTotals(totals) {
  const carbs = Number(totals.carbs) || 0
  const fiber = Number(totals.fiber) || 0
  const protein = Number(totals.protein) || 0
  const calories = Number(totals.calories) || 0
  const servingWeightG = Number(totals.servingWeightG) || null

  const gp = carbs / (fiber + protein + 1)
  const glycemicPressureLabel = gp > 10 ? 'high' : gp > 5 ? 'moderate' : 'low'

  const kcalPer100g = servingWeightG && servingWeightG > 0 ? (calories / servingWeightG) * 100 : null
  const energyDensityLabel =
    kcalPer100g == null ? (calories > 250 ? 'high' : calories > 150 ? 'moderate' : 'low') : kcalPer100g > 200 ? 'high' : kcalPer100g > 120 ? 'moderate' : 'low'

  // Simple satiety proxy: higher protein+fiber per calorie => higher satiety.
  // Produces ~0.00 - 0.40 range for typical meals.
  const satietyScore = (protein * 4 + fiber * 2) / (calories + 1)
  const satietyLabel = satietyScore > 0.22 ? 'high' : satietyScore > 0.12 ? 'moderate' : 'low'

  return {
    glycemic_pressure: { value: roundTo(gp, 1), label: glycemicPressureLabel },
    energy_density: {
      kcal_per_100g: kcalPer100g == null ? null : roundTo(kcalPer100g, 0),
      label: energyDensityLabel,
    },
    satiety_index: { score: roundTo(satietyScore, 2), label: satietyLabel },

    // Back-compat fields (older code may expect these).
    glycemic_pressure_label: glycemicPressureLabel,
    energy_density_label: energyDensityLabel,
    glycemic_pressure_raw: gp,
  }
}

function applyCookingAdjustments({ totals, adjustments, recipeIngredients }) {
  const out = { ...totals }
  const adj = adjustments || {}

  // Only apply simple, explicit, deterministic adjustments.
  const oilAbsorptionFactor = Number(adj.oilAbsorptionFactor) || 1.0
  if (oilAbsorptionFactor !== 1.0) {
    // If the recipe includes oil, scale its fat+calories contribution.
    const hasOil = (recipeIngredients || []).some((i) => String(i.itemKey || '').toLowerCase().includes('oil'))
    if (hasOil) {
      out.fat = (Number(out.fat) || 0) * oilAbsorptionFactor
      out.calories = (Number(out.calories) || 0) * (1 + (oilAbsorptionFactor - 1) * 0.6)
    }
  }

  return out
}

module.exports = {
  scale,
  roundTo,
  deriveMetricsFromTotals,
  applyCookingAdjustments,
}
