/**
 * Single source of truth for the per-meal/per-day nutrient field list.
 *
 * The exact same key set is used in three places:
 *   1. NutritionLog `meals[].foods[]` sub-schema (per-food nutrient values)
 *   2. NutritionLog `dailyTotals` sub-schema (per-day aggregated values)
 *   3. The DAILY_TOTAL_FIELDS array in nutritionRoutes.js, used to compute aggregates
 *
 * Adding a 39th nutrient now requires a one-line change to NUTRIENT_FIELDS below
 * instead of editing all three call sites.
 */

const NUTRIENT_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'potassium',
  'iron',
  'calcium',
  'vitaminB',
  'magnesium',
  'zinc',
  'vitaminC',
  'omega3',
  'saturatedFat',
  'monounsaturatedFat',
  'polyunsaturatedFat',
  'cholesterol',
  'phosphorus',
  'copper',
  'selenium',
  'manganese',
  'vitaminA',
  'vitaminE',
  'vitaminD2',
  'vitaminD3',
  'vitaminD',
  'vitaminB1',
  'vitaminB2',
  'vitaminB3',
  'vitaminB5',
  'vitaminB6',
  'vitaminB7',
  'vitaminB9',
  'vitaminB12',
  'folate',
];

/** Build a Mongoose schema-fragment object: { [key]: { type: Number, default: 0 } } */
function buildNumericSchemaFragment() {
  const out = {};
  for (const key of NUTRIENT_FIELDS) {
    out[key] = { type: Number, default: 0 };
  }
  return out;
}

/** Sum each NUTRIENT_FIELD across an array of food/supplement objects, rounding to 1dp. */
function sumNutrients(items) {
  const out = {};
  for (const f of NUTRIENT_FIELDS) out[f] = 0;
  for (const item of (items || [])) {
    if (!item) continue;
    for (const f of NUTRIENT_FIELDS) {
      out[f] += Number(item[f] || 0);
    }
  }
  for (const f of NUTRIENT_FIELDS) {
    out[f] = Math.round(out[f] * 10) / 10;
  }
  return out;
}

module.exports = { NUTRIENT_FIELDS, buildNumericSchemaFragment, sumNutrients };
