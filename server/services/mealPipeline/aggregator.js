const { IngredientProfile, RecipeTemplate } = require('../../models/nutritionKnowledge')
const IndbFood = require('../../models/IndbFood')
const MfpFood = require('../../models/MfpFood')
const { scale, roundTo, deriveMetricsFromTotals, applyCookingAdjustments } = require('./utils')

function normalizeKey(s) {
  return String(s || '').trim().toLowerCase()
}

async function computeRecipeTotals({ recipeName, locale = 'en' }) {
  const name = normalizeKey(recipeName)
  if (!name) return null

  const recipe = await RecipeTemplate.findOne({ name, locale })
  if (!recipe) return null

  const totals = {
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
    calories: 0,
    sugar: 0,
    sodium: 0,
    potassium: 0,
    iron: 0,
    calcium: 0,
    vitaminB: 0,
    magnesium: 0,
    zinc: 0,
    vitaminC: 0,
    omega3: 0,
  }

  const missing = []
  for (const ing of recipe.ingredients || []) {
    const itemKey = normalizeKey(ing.itemKey)
    const grams = Number(ing.grams) || 0
    if (!itemKey || grams <= 0) continue

    const base = await IngredientProfile.findOne({ itemKey, locale })
    if (!base) {
      missing.push(itemKey)
      continue
    }

    const n = base.nutrientsPer100g || {}
    totals.carbs += scale(n.carbs, grams)
    totals.protein += scale(n.protein, grams)
    totals.fat += scale(n.fat, grams)
    totals.fiber += scale(n.fiber, grams)
    totals.calories += scale(n.calories, grams)
    totals.sugar += scale(n.sugar, grams)
    totals.sodium += scale(n.sodium, grams)

    totals.potassium += scale(n.potassium, grams)
    totals.iron += scale(n.iron, grams)
    totals.calcium += scale(n.calcium, grams)
    totals.vitaminB += scale(n.vitaminB, grams)
    totals.magnesium += scale(n.magnesium, grams)
    totals.zinc += scale(n.zinc, grams)
    totals.vitaminC += scale(n.vitaminC, grams)
    totals.omega3 += scale(n.omega3, grams)
  }

  const adjusted = applyCookingAdjustments({
    totals,
    adjustments: recipe.cookingAdjustments,
    recipeIngredients: recipe.ingredients,
  })

  const derived = deriveMetricsFromTotals({ ...adjusted, servingWeightG: recipe.servingSizeG })

  return {
    recipe: {
      meal_id: recipe.mealId || null,
      name: recipe.name,
      display_name: recipe.displayName || recipe.name,
      category: recipe.category || '',
      serving_description: recipe.servingDescription || '',
      serving_size_g: recipe.servingSizeG,
      ingredients: recipe.ingredients,
      cooking_method: recipe.cookingMethod || '',
      cooking_adjustments: recipe.cookingAdjustments,
      contextual_notes: recipe.contextualNotes || {},
      confidence: recipe.confidence,
      source: recipe.source,
    },
    nutrition: {
      carbs_g: roundTo(adjusted.carbs, 1),
      protein_g: roundTo(adjusted.protein, 1),
      fat_g: roundTo(adjusted.fat, 1),
      fiber_g: roundTo(adjusted.fiber, 1),
      sugar_g: roundTo(adjusted.sugar, 1),
      sodium_mg: roundTo(adjusted.sodium, 0),
      potassium_mg: roundTo(adjusted.potassium, 0),
      iron_mg: roundTo(adjusted.iron, 1),
      calcium_mg: roundTo(adjusted.calcium, 0),
      vitaminB_mg: roundTo(adjusted.vitaminB, 2),
      magnesium_mg: roundTo(adjusted.magnesium, 0),
      zinc_mg: roundTo(adjusted.zinc, 1),
      vitaminC_mg: roundTo(adjusted.vitaminC, 1),
      omega3_g: roundTo(adjusted.omega3, 2),
      calories_kcal: roundTo(adjusted.calories, 0),
    },
    derived_metrics: derived,
    missing_ingredients: missing,
    source: 'ingredient_composition_pipeline',
    confidence: recipe.confidence,
  }
}

async function searchLocalFoods({ q, locale = 'en', limit = 10 }) {
  const query = normalizeKey(q)
  if (!query) return []

  const [recipes, ingredients, indbFoods, mfpFoods] = await Promise.all([
    RecipeTemplate.find({ name: { $regex: query, $options: 'i' }, locale }).limit(limit),
    IngredientProfile.find({ displayName: { $regex: query, $options: 'i' }, locale }).limit(limit),
    IndbFood.find({ searchText: { $regex: query, $options: 'i' } }).limit(limit),
    MfpFood.find({ searchText: { $regex: query, $options: 'i' } }).limit(limit),
  ])

  // Return in the same shape as your existing search API (name, servingQty, servingUnit, macros).
  const recipeResults = await Promise.all(
    recipes.map(async (r) => {
      const computed = await computeRecipeTotals({ recipeName: r.name, locale })
      if (!computed) return null
      const servingWeightG = Number(r.servingSizeG) || 0
      const servingLabel = String(r.servingDescription || '').trim() || (servingWeightG ? `${servingWeightG} g serving` : '1 serving')
      return {
        id: `dish:${r.name}`,
        name: r.name,
        brand: null,
        servingQty: 1,
        servingUnit: 'serving',
        servingLabel,
        servingWeightG,
        calories: computed.nutrition.calories_kcal,
        protein: computed.nutrition.protein_g,
        carbs: computed.nutrition.carbs_g,
        fat: computed.nutrition.fat_g,
        fiber: computed.nutrition.fiber_g,
        sugar: computed.nutrition.sugar_g,
        sodium: computed.nutrition.sodium_mg,
        potassium: computed.nutrition.potassium_mg,
        iron: computed.nutrition.iron_mg,
        calcium: computed.nutrition.calcium_mg,
        vitaminB: computed.nutrition.vitaminB_mg,
        magnesium: computed.nutrition.magnesium_mg,
        zinc: computed.nutrition.zinc_mg,
        vitaminC: computed.nutrition.vitaminC_mg,
        omega3: computed.nutrition.omega3_g,
        _local: { kind: 'recipe', missing: computed.missing_ingredients },
      }
    })
  )

  const ingredientResults = ingredients.map((i) => {
    const n = i.nutrientsPer100g || {}
    return {
      id: `ingredient:${i.itemKey}`,
      name: i.displayName,
      brand: null,
      servingQty: 100,
      servingUnit: 'g',
      servingLabel: '100 g',
      servingWeightG: 100,
      calories: Number(n.calories) || 0,
      protein: Number(n.protein) || 0,
      carbs: Number(n.carbs) || 0,
      fat: Number(n.fat) || 0,
      fiber: Number(n.fiber) || 0,
      sugar: Number(n.sugar) || 0,
      sodium: Number(n.sodium) || 0,
      potassium: Number(n.potassium) || 0,
      iron: Number(n.iron) || 0,
      calcium: Number(n.calcium) || 0,
      vitaminB: Number(n.vitaminB) || 0,
      magnesium: Number(n.magnesium) || 0,
      zinc: Number(n.zinc) || 0,
      vitaminC: Number(n.vitaminC) || 0,
      omega3: Number(n.omega3) || 0,
      _local: { kind: 'ingredient' },
    }
  })

  // Also map raw IndbFoods directly for comprehensive local lookup
  const getCol = (cols, exactKey, partialKey, useUnit = false) => {
    if (useUnit) {
      const unitKey = 'unit_serving_' + exactKey;
      const unitFound = cols.find(c => c.key.toLowerCase() === unitKey.toLowerCase());
      if (unitFound && unitFound.value) {
        const v = parseFloat(String(unitFound.value).replace(/[^0-9.-]/g, ''));
        if (!isNaN(v)) return v;
      }
    }
    
    const found = cols.find(c => c.key.toLowerCase() === exactKey.toLowerCase()) 
               || (partialKey && cols.find(c => c.key.toLowerCase().includes(partialKey.toLowerCase())));
    if (!found || !found.value) return 0;
    const v = parseFloat(String(found.value).replace(/[^0-9.-]/g, ''));
    return isNaN(v) ? 0 : v;
  };

  const getName = (cols) => {
    const fNode = cols.find(c => c.key.toLowerCase() === 'food_name');
    return fNode && fNode.value ? String(fNode.value) : null;
  }

  const indbResults = indbFoods.map((f) => {
    const c = f.columns || [];
    
    const servingsUnitNode = c.find(col => col.key.toLowerCase() === 'servings_unit');
    const unitKcalNode = c.find(col => col.key.toLowerCase() === 'unit_serving_energy_kcal');
    const hasUnitData = servingsUnitNode && servingsUnitNode.value && unitKcalNode && unitKcalNode.value;
    
    let useUnit = false;
    let servingQty = 100;
    let servingUnit = 'g';
    let servingLabel = '100 g';
    let servingWeightG = 100;
    
    if (hasUnitData) {
      useUnit = true;
      servingQty = 1;
      servingUnit = String(servingsUnitNode.value).trim();
      servingLabel = `1 ${servingUnit}`;
      
      const unitKcal = parseFloat(String(unitKcalNode.value).replace(/[^0-9.-]/g, ''));
      const per100KcalNode = c.find(col => col.key.toLowerCase() === 'energy_kcal');
      const per100Kcal = per100KcalNode ? parseFloat(String(per100KcalNode.value).replace(/[^0-9.-]/g, '')) : 0;
      
      if (!isNaN(unitKcal) && !isNaN(per100Kcal) && per100Kcal > 0) {
          servingWeightG = Math.round((unitKcal / per100Kcal) * 100);
      }
    }
    
    const vitaminD2 = getCol(c, 'vitd2_ug', 'vitd2', useUnit);
    const vitaminD3 = getCol(c, 'vitd3_ug', 'vitd3', useUnit);
    const vitaminD = (vitaminD2 + vitaminD3) || getCol(c, 'vitamind', 'vitamin_d', useUnit);

    return {
      id: `indb:${f._id}`,
      name: f.displayName || getName(c) || 'Unnamed INDB Food',
      brand: 'INDB Database',
      servingQty,
      servingUnit,
      servingLabel,
      servingWeightG,
      calories: getCol(c, 'energy_kcal', 'kcal', useUnit),
      protein: getCol(c, 'protein_g', 'protein', useUnit),
      carbs: getCol(c, 'carb_g', 'carbohydrate', useUnit),
      fat: getCol(c, 'fat_g', 'total_fat', useUnit),
      fiber: getCol(c, 'fibre_g', 'fiber', useUnit),
      sugar: getCol(c, 'freesugar_g', 'sugar', useUnit),
      sodium: getCol(c, 'sodium_mg', 'sodium', useUnit),
      potassium: getCol(c, 'potassium_mg', 'potassium', useUnit),
      iron: getCol(c, 'iron_mg', 'iron', useUnit),
      calcium: getCol(c, 'calcium_mg', 'calcium', useUnit),
      // Avoid mixing unrelated B-vitamin proxies; keep this tied to explicit "vitamin_b" style columns only.
      vitaminB: getCol(c, 'vitamin_b', 'vitb_mg', useUnit),
      magnesium: getCol(c, 'magnesium_mg', 'magnesium', useUnit),
      zinc: getCol(c, 'zinc_mg', 'zinc', useUnit),
      vitaminC: getCol(c, 'vitc_mg', 'vitaminc', useUnit),
      // Keep omega3 as a first-class field, but only map explicit omega-3 columns.
      omega3: getCol(c, 'omega_3', 'omega3', useUnit),
      manganese: getCol(c, 'manganese_mg', 'manganese', useUnit),
      selenium: getCol(c, 'selenium_ug', 'selenium', useUnit),
      copper: getCol(c, 'copper_mg', 'copper', useUnit),
      monounsaturatedFat: getCol(c, 'mufa_mg', 'mufa', useUnit),
      polyunsaturatedFat: getCol(c, 'pufa_mg', 'pufa', useUnit),
      saturatedFat: getCol(c, 'sfa_mg', 'sfa', useUnit) || getCol(c, 'saturatedfat', 'saturated_fat', useUnit),
      cholesterol: getCol(c, 'cholesterol_mg', 'cholesterol', useUnit),
      vitaminD2,
      vitaminD3,
      vitaminD,
      vitaminE: getCol(c, 'vite_mg', 'vite', useUnit) || getCol(c, 'vitamine', 'vitamin_e', useUnit),
      vitaminA: getCol(c, 'vita_ug', 'vita', useUnit) || getCol(c, 'vitamina', 'vitamin_a', useUnit),
      vitaminB1: getCol(c, 'vitb1_mg', 'thiamin', useUnit),
      vitaminB2: getCol(c, 'vitb2_mg', 'riboflavin', useUnit),
      vitaminB3: getCol(c, 'vitb3_mg', 'niacin', useUnit),
      vitaminB5: getCol(c, 'vitb5_mg', 'pantothenic', useUnit),
      vitaminB6: getCol(c, 'vitb6_mg', 'vitb6', useUnit),
      vitaminB7: getCol(c, 'vitb7_ug', 'biotin', useUnit),
      vitaminB9: getCol(c, 'vitb9_ug', 'folate', useUnit),
      vitaminB12: getCol(c, 'vitb12_ug', 'vitb12', useUnit),
      folate: getCol(c, 'folate_ug', 'folate', useUnit),
      phosphorus: getCol(c, 'phosphorus_mg', 'phosphorus', useUnit),
      _local: { kind: 'indb' },
    }
  })

  const mfpResults = mfpFoods.map((f) => {
    const c = f.columns || [];
    
    return {
      id: `mfp:${f._id}`,
      name: f.displayName || getName(c) || 'Unnamed MFP Food',
      brand: 'MyFitnessPal',
      servingQty: Number(f.servingQty) || 1,
      servingUnit: f.servingSize || 'serving',
      servingLabel: `${f.servingQty || 1} ${f.servingSize || 'serving'}`.trim(),
      servingWeightG: 100, // Exact weight unknown
      calories: getCol(c, 'energy_kcal', 'kcal', false),
      protein: getCol(c, 'protein_g', 'protein', false),
      carbs: getCol(c, 'carb_g', 'carbohydrate', false),
      fat: getCol(c, 'fat_g', 'total_fat', false),
      fiber: getCol(c, 'fibre_g', 'fiber', false),
      sugar: getCol(c, 'freesugar_g', 'sugar', false),
      sodium: getCol(c, 'sodium_mg', 'sodium', false),
      potassium: getCol(c, 'potassium_mg', 'potassium', false),
      iron: getCol(c, 'iron_mg', 'iron', false),
      calcium: getCol(c, 'calcium_mg', 'calcium', false),
      vitaminC: getCol(c, 'vitc_mg', 'vitaminc', false),
      monounsaturatedFat: getCol(c, 'mufa_mg', 'mufa', false),
      polyunsaturatedFat: getCol(c, 'pufa_mg', 'pufa', false),
      saturatedFat: getCol(c, 'sfa_mg', 'sfa', false),
      cholesterol: getCol(c, 'cholesterol_mg', 'cholesterol', false),
      vitaminA: getCol(c, 'vita_ug', 'vita', false),
      _local: { kind: 'mfp' },
    }
  })

  // Group to prioritize matches cleanly
  const merged = [...recipeResults.filter(Boolean), ...ingredientResults, ...indbResults, ...mfpResults]
  return merged.slice(0, limit)
}

module.exports = {
  computeRecipeTotals,
  searchLocalFoods,
}
