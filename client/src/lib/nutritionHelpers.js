export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'pre-workout',
  'post-workout',
]

export const TARGET_KEY_TO_TOTAL_KEY = {
  calories: 'calories',
  protein: 'protein',
  fat: 'fat',
  carbs: 'carbs',
  fiber: 'fiber',
  sugar: 'sugar',
  saturatedFat: 'saturatedFat',
  monounsaturatedFat: 'monounsaturatedFat',
  polyunsaturatedFat: 'polyunsaturatedFat',
  cholesterol: 'cholesterol',
  sodium: 'sodium',
  potassium: 'potassium',
  iron: 'iron',
  calcium: 'calcium',
  vitaminB12: 'vitaminB12',
  vitaminD: 'vitaminD',
  vitaminC: 'vitaminC',
  vitaminA: 'vitaminA',
  folate: 'folate',
  zinc: 'zinc',
  magnesium: 'magnesium',
  phosphorus: 'phosphorus',
  copper: 'copper',
  manganese: 'manganese',
  selenium: 'selenium',
  vitaminE: 'vitaminE',
  omega3: 'omega3',
}

export const MICRO_TO_TARGET_KEY = {
  sodium: 'sodium',
  potassium: 'potassium',
  calcium: 'calcium',
  magnesium: 'magnesium',
  phosphorus: 'phosphorus',
  iron: 'iron',
  zinc: 'zinc',
  copper: 'copper',
  manganese: 'manganese',
  selenium: 'selenium',
  vitaminA: 'vitaminA',
  vitaminB: 'vitaminB12',
  vitaminB12: 'vitaminB12',
  folate: 'folate',
  vitaminC: 'vitaminC',
  vitaminD: 'vitaminD',
  vitaminE: 'vitaminE',
  cholesterol: 'cholesterol',
  saturatedFat: 'saturatedFat',
}

export const EMPTY_TOTALS = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  potassium: 0,
  iron: 0,
  calcium: 0,
  vitaminB: 0,
  vitaminB12: 0,
  magnesium: 0,
  zinc: 0,
  vitaminC: 0,
  omega3: 0,
  saturatedFat: 0,
  monounsaturatedFat: 0,
  polyunsaturatedFat: 0,
  cholesterol: 0,
  phosphorus: 0,
  copper: 0,
  selenium: 0,
  manganese: 0,
  vitaminA: 0,
  vitaminE: 0,
  vitaminD: 0,
  folate: 0,
}

export const FOOD_NUTRIENT_FIELDS = [
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
  'vitaminB12',
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
  'vitaminD',
  'folate',
]

export const MACRO_FIELD_META = [
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'omega3', label: 'Omega-3', unit: 'mg' },
  { key: 'saturatedFat', label: 'Sat. fat', unit: 'g' },
  { key: 'monounsaturatedFat', label: 'MUFA', unit: 'g' },
  { key: 'polyunsaturatedFat', label: 'PUFA', unit: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
]

export const MINERAL_FIELD_META = [
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg' },
  { key: 'copper', label: 'Copper', unit: 'mg' },
  { key: 'manganese', label: 'Manganese', unit: 'mg' },
  { key: 'selenium', label: 'Selenium', unit: 'ug' },
]

export const VITAMIN_FIELD_META = [
  { key: 'vitaminA', label: 'Vitamin A', unit: 'ug' },
  { key: 'vitaminB', label: 'Vitamin B', unit: 'mg' },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'ug' },
  { key: 'folate', label: 'Folate', unit: 'ug' },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'ug' },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg' },
]

export const SUMMARY_MICRO_META = [
  ...MINERAL_FIELD_META,
  ...VITAMIN_FIELD_META,
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg' },
]

export const createEmptyFoodRow = () => ({
  name: '',
  quantity: '',
  unit: 'g',
  baseServingQty: '',
  baseServingUnit: 'g',
  servingLabel: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  sodium: '',
  potassium: '',
  iron: '',
  calcium: '',
  vitaminB: '',
  vitaminB12: '',
  magnesium: '',
  zinc: '',
  vitaminC: '',
  omega3: '',
  saturatedFat: '',
  monounsaturatedFat: '',
  polyunsaturatedFat: '',
  cholesterol: '',
  phosphorus: '',
  copper: '',
  selenium: '',
  manganese: '',
  vitaminA: '',
  vitaminE: '',
  vitaminD: '',
  folate: '',
})

export const hydrateFoodsForEditing = (foodsArray) => {
  if (!foodsArray || foodsArray.length === 0) return [createEmptyFoodRow()]
  return JSON.parse(JSON.stringify(foodsArray)).map(food => {
    delete food._id
    delete food.id
    
    if (food.baseServingQty === undefined || food.baseServingQty === null || food.baseServingQty === '') {
      food.baseServingQty = food.quantity || 1
      food.baseServingUnit = food.unit || ''
      FOOD_NUTRIENT_FIELDS.forEach(field => {
        if (food[field] !== undefined && food[field] !== null && food[field] !== '') {
          food[`${field}_base`] = food[field]
        }
      })
    }
    return food
  })
}

export const roundNutrient = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100) / 100
}

export const formatServingLabel = (qty, unit) => {
  const safeQty = Number(qty)
  const safeUnit = String(unit || '').trim()
  if (Number.isFinite(safeQty) && safeUnit) return `${safeQty} ${safeUnit}`
  if (Number.isFinite(safeQty)) return String(safeQty)
  return safeUnit
}

export const formatServingDisplay = (label, servingWeightG) => {
  const safeLabel = String(label || '').trim()
  const safeWeight = Number(servingWeightG)
  if (safeLabel && Number.isFinite(safeWeight) && safeWeight > 0) {
    return `${safeLabel} (~${safeWeight} g)`
  }
  return safeLabel
}

export const generateCGMData = (meals) => {
  const points = [];
  const baseline = 90;

  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const min = (i % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    points.push({ time: timeStr, minuteOfDay: i * 30, glucose: baseline });
  }

  if (!meals || meals.length === 0) return points;

  const mealsSorted = [...meals]
    .map(meal => {
      const parts = (meal.time || '').split(':').map(Number);
      const mealMinute = (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
        ? parts[0] * 60 + parts[1]
        : null;
      return { meal, mealMinute };
    })
    .filter(m => m.mealMinute !== null)
    .sort((a, b) => a.mealMinute - b.mealMinute);

  let cumulativeFiberEaten = 0;

  mealsSorted.forEach(({ meal, mealMinute }) => {
    let totalCarbs = 0, totalFiber = 0, totalProtein = 0, totalFat = 0;

    meal.foods?.forEach(f => {
      totalCarbs   += f.carbs   || 0;
      totalFiber   += f.fiber   || 0;
      totalProtein += f.protein || 0;
      totalFat     += f.fat     || 0;
    });

    if (totalCarbs === 0) {
      cumulativeFiberEaten += totalFiber;
      return;
    }

    const fiberCarryoverBonus = Math.min(cumulativeFiberEaten * 0.015, 0.40);
    const adjustedGP = (totalCarbs / (totalFiber + totalProtein + 1)) * (1 - fiberCarryoverBonus);

    const baseAmp    = Math.min(totalCarbs, 80);
    const multiplier = Math.min(adjustedGP / 5, 2.5);
    const peakAmp    = baseAmp * multiplier;

    const buffer = totalFiber + (totalFat * 0.5) + (totalProtein * 0.2);
    const timeConstant = 45 + Math.min(buffer * 3, 90);

    points.forEach(pt => {
      if (pt.minuteOfDay < mealMinute) return;
      const t = pt.minuteOfDay - mealMinute;
      const response = Math.max(0, (t / timeConstant) * Math.exp(1 - (t / timeConstant)));
      pt.glucose += peakAmp * response;
    });

    cumulativeFiberEaten += totalFiber;
  });

  points.forEach(pt => {
    pt.glucose = Math.max(75, Math.round(pt.glucose));
  });

  return points;
};

export const fmt = (value, decimals = 1) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export const percent = (value, target) => {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((Number(value) / target) * 100))
}

// Lightweight Frontend Interaction Engine for Real-time Feedback
export const frontendEvaluateInteractions = (foods) => {
  const totals = {}
  const foodNames = []
  
  foods.filter(f => f.name?.trim()).forEach(food => {
    foodNames.push(food.name.toLowerCase())
    FOOD_NUTRIENT_FIELDS.forEach(field => {
      const val = Number(food[field]) || 0
      totals[field] = (totals[field] || 0) + val
    })
  })

  const hasFlag = (flags) => {
    if (!flags || flags.length === 0) return false
    return foodNames.some(name => flags.some(flag => {
      try {
        const regex = new RegExp(`\\b${flag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
        return regex.test(name)
      } catch (e) {
        return name.toLowerCase().includes(flag.toLowerCase())
      }
    }))
  }

  const synergies = []
  const antagonisms = []

  const ironVal = totals.iron || 0
  const vitCVal = totals.vitaminC || 0
  const fatVal = totals.fat || 0
  const calVal = totals.calcium || 0
  const fibreVal = totals.fiber || 0

  // SYNERGIES (Full mirror of backend clinical rules)
  if (ironVal >= 0.5 && vitCVal >= 10) {
    synergies.push({ 
      title: 'Iron + Vitamin C Synergy', 
      effect: '2x to 3x increase', 
      description: 'Vitamin C reduces Fe3+ to Fe2+ (absorbable form) and forms an iron-ascorbate complex that resists blocking.' 
    })
  }
  if ((totals.vitaminD || 0) >= 0.5 && fatVal >= 5) {
    synergies.push({ 
      title: 'Vitamin D + Fat Synergy', 
      effect: 'Requires fat for absorption', 
      description: 'Vitamin D is fat-soluble. Consuming it without fat results in near-zero absorption.' 
    })
  }
  if ((totals.vitaminA || 0) >= 10 && fatVal >= 5) {
    synergies.push({ 
      title: 'Vitamin A + Fat Synergy', 
      effect: 'Required for absorption', 
      description: 'Retinoids and carotenoids require dietary lipid for micellar solubilization.' 
    })
  }
  if (hasFlag(['turmeric', 'haldi']) && hasFlag(['pepper'])) {
    synergies.push({ 
      title: 'Turmeric + Black Pepper', 
      effect: '2000% boost in bioavailability', 
      description: 'Piperine in pepper inhibits the metabolic pathway that eliminates curcumin.' 
    })
  }
  if (hasFlag(['green tea']) && vitCVal >= 5) {
    synergies.push({ 
      title: 'Green Tea + Vit C', 
      effect: 'Catechin stability', 
      description: 'Vitamin C protects epigallocatechin gallate (EGCG) from degrading in the alkaline environment of the small intestine.' 
    })
  }
  if ((totals.vitaminE || 0) >= 1 && vitCVal >= 10) {
    synergies.push({ 
      title: 'Vitamin E + Vitamin C Synergy', 
      effect: 'Antioxidant regeneration', 
      description: 'Vitamin C regenerates oxidized Vitamin E back to its active form, providing broader antioxidant coverage.' 
    })
  }

  // ANTAGONISMS (Full mirror of backend clinical rules)
  if (ironVal >= 0.5 && hasFlag(['tea', 'coffee', 'chai', 'green tea'])) {
    antagonisms.push({ 
      title: 'Iron blocked by Tannins', 
      effect: '40-60% reduction', 
      description: 'Tannins in tea and coffee bind iron to form an insoluble complex. The #1 cause of iron deficiency in India.', 
      fix: 'Have tea/coffee 1 hour before or after an iron-rich meal.' 
    })
  }
  if (ironVal >= 0.5 && calVal >= 150) {
    antagonisms.push({ 
      title: 'Iron blocked by Calcium', 
      effect: 'Competing absorption', 
      description: 'Calcium and iron compete for the same intestinal transporter.', 
      fix: 'Separate iron-rich and calcium-rich meals by 2 hours.' 
    })
  }
  if (((totals.zinc || 0) >= 0.5 || ironVal >= 0.5) && (totals.fiber || 0) >= 10) {
    antagonisms.push({ 
      title: 'Minerals blocked by Phytates', 
      effect: 'Insoluble complex', 
      description: 'Phytic acid in whole grains and raw legumes binds iron and zinc.', 
      fix: 'Soaking, sprouting, or fermenting breaks phytates and greatly improves absorption.' 
    })
  }
  if (hasFlag(['alcohol', 'wine', 'beer', 'whiskey', 'rum', 'vodka']) && (totals.vitaminB || totals.vitaminB12 || totals.folate)) {
    antagonisms.push({ 
      title: 'Alcohol vs B-Vitamins', 
      effect: 'Severe depletion', 
      description: 'Alcohol inhibits the absorption of thiamine (B1), B12, and folate, while increasing their excretion.', 
      fix: 'Avoid alcohol during vitamin-rich meals or supplement B-Complex separately.' 
    })
  }
  
  return { synergies, antagonisms }
}
