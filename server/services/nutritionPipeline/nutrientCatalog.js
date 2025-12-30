// Minimal semantic nutrient catalog. Expand as you add richer sources.

const catalog = {
  calories: { unit: 'kcal', type: 'energy', role: ['energy_balance'] },
  protein: { unit: 'g', type: 'macronutrient', role: ['satiety', 'muscle_repair'] },
  carbs: { unit: 'g', type: 'macronutrient', role: ['energy'] },
  fat: { unit: 'g', type: 'macronutrient', role: ['energy', 'hormone_support'] },
  fiber: { unit: 'g', type: 'carbohydrate', role: ['satiety', 'gut_health'] },
  sugar: { unit: 'g', type: 'carbohydrate', role: ['palatability'] },
  sodium: { unit: 'mg', type: 'mineral', role: ['electrolyte_balance'] },
}

function getNutrientMeta(key) {
  return catalog[key] || { unit: null, type: 'unknown', role: [] }
}

module.exports = { getNutrientMeta }
