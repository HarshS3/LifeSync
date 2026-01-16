// Minimal semantic nutrient catalog. Expand as you add richer sources.

const catalog = {
  calories: { unit: 'kcal', type: 'energy', role: ['energy_balance'] },
  protein: { unit: 'g', type: 'macronutrient', role: ['satiety', 'muscle_repair'] },
  carbs: { unit: 'g', type: 'macronutrient', role: ['energy'] },
  fat: { unit: 'g', type: 'macronutrient', role: ['energy', 'hormone_support'] },
  fiber: { unit: 'g', type: 'carbohydrate', role: ['satiety', 'gut_health'] },
  sugar: { unit: 'g', type: 'carbohydrate', role: ['palatability'] },
  sodium: { unit: 'mg', type: 'mineral', role: ['electrolyte_balance'] },
  potassium: { unit: 'mg', type: 'mineral', role: ['electrolyte_balance'] },
  calcium: { unit: 'mg', type: 'mineral', role: ['bone_health'] },
  iron: { unit: 'mg', type: 'mineral', role: ['oxygen_transport'] },
  magnesium: { unit: 'mg', type: 'mineral', role: ['muscle_function'] },
  zinc: { unit: 'mg', type: 'mineral', role: ['immune_support'] },
  vitaminC: { unit: 'mg', type: 'vitamin', role: ['antioxidant'] },
  vitaminB: { unit: 'mg', type: 'vitamin', role: ['energy_metabolism'] },
  omega3: { unit: 'g', type: 'fatty_acid', role: ['cardiometabolic_health'] },
}

function getNutrientMeta(key) {
  return catalog[key] || { unit: null, type: 'unknown', role: [] }
}

module.exports = { getNutrientMeta }
