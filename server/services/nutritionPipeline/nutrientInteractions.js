const interactionRules = {
  synergistic: [
    {
      id: 'iron_vitc',
      primary: 'iron_mg',
      secondary: 'vitc_mg',
      type: 'boosting',
      effect: '2x to 3x increase',
      title: 'Iron + Vitamin C Synergy',
      description: 'Vitamin C reduces Fe3+ to Fe2+ (absorbable form) and forms an iron-ascorbate complex that resists phytate/tannin blocking.',
      example: 'Eat rajma WITH lemon squeeze or tomato.',
      thresholdPrimary: 2, // e.g. at least 2mg iron
      thresholdSecondary: 10, // e.g. at least 10mg vit C
    },
    {
      id: 'vitd_fat',
      primary: 'vitd_ug',
      secondary: 'fat_g',
      type: 'boosting',
      effect: 'Requires fat for absorption',
      title: 'Vitamin D + Fat Synergy',
      description: 'Vitamin D is fat-soluble. Consuming it without fat results in near-zero absorption.',
      example: 'Add full-fat dairy or a handful of nuts to your meal.',
      thresholdPrimary: 1, // at least 1ug vit D
      thresholdSecondary: 3, // at least 3g fat
    },
    {
      id: 'vita_fat',
      primary: 'vita_ug',
      secondary: 'fat_g',
      type: 'boosting',
      effect: 'Requires fat for absorption',
      title: 'Vitamin A + Fat Synergy',
      description: 'Vitamin A is fat-soluble. Consuming it without fat results in near-zero absorption.',
      example: 'Add ghee or olive oil dressing to your carrot salad.',
      thresholdPrimary: 100, // at least 100ug vit A
      thresholdSecondary: 3, // at least 3g fat
    },
    {
      id: 'vite_vitc',
      primary: 'vite_mg',
      secondary: 'vitc_mg',
      type: 'boosting',
      effect: 'Synergistic antioxidant regeneration',
      title: 'Vitamin E + Vitamin C Synergy',
      description: 'Vitamin C regenerates oxidized Vitamin E back to its active form, providing broader antioxidant coverage.',
      thresholdPrimary: 2,
      thresholdSecondary: 10,
    },
    {
      id: 'vitk_fat',
      primary: 'vitk_ug',
      secondary: 'fat_g',
      type: 'boosting',
      effect: 'Requires fat for absorption',
      title: 'Vitamin K + Fat Synergy',
      description: 'Vitamin K is fat-soluble. Consuming it without fat results in near-zero absorption.',
      example: 'Must pair leafy green salad with a fat source.',
      thresholdPrimary: 20,
      thresholdSecondary: 3,
    },
    {
      id: 'calcium_vitd',
      primary: 'calcium_mg',
      secondary: 'vitd_ug',
      type: 'boosting',
      effect: '1.5–2x increase',
      title: 'Calcium + Vitamin D Synergy',
      description: 'Vitamin D upregulates calcium transport proteins in the gut. Without adequate D, only 10–15% of dietary calcium is absorbed; with it, 30–40%.',
      thresholdPrimary: 100,
      thresholdSecondary: 1,
    }
  ],
  antagonistic: [
    {
      id: 'iron_calcium',
      primary: 'iron_mg',
      secondary: 'calcium_mg',
      type: 'blocking',
      effect: '30–50% reduction',
      title: 'Iron blocked by Calcium',
      description: 'Calcium and iron compete for the same intestinal transporter. Meaningful inhibition begins at ≥300mg calcium in the same meal (Hallberg 1991).',
      fix: 'Separate iron-rich and calcium-rich meals by 2 hours.',
      thresholdPrimary: 2, // notable iron
      thresholdSecondary: 300, // Hallberg 1991: threshold for meaningful inhibition
    },
    {
      id: 'iron_tannins',
      primary: 'iron_mg',
      type: 'blocking',
      effect: '40–60% reduction',
      title: 'Iron blocked by Tannins (Tea/Coffee)',
      description: 'Tannins in tea and coffee bind iron to form an insoluble complex. This is a common cause of iron deficiency.',
      fix: 'Have tea or coffee 1 hour before or after an iron-rich meal.',
      foodFlags: ['tea', 'coffee', 'chai', 'green tea'], // Foods checking keywords
      thresholdPrimary: 2,
    },
    {
      id: 'iron_phytates',
      primary: 'iron_mg',
      secondary: 'fiber_g', // Using fiber as proxy for phytates in grains/legumes
      type: 'blocking',
      effect: '25–65% reduction',
      title: 'Iron blocked by Phytates',
      description: 'Phytic acid in whole grains and legumes binds iron.',
      fix: 'Soaking, sprouting, or fermenting breaks phytates and greatly improves absorption.',
      thresholdPrimary: 2,
      thresholdSecondary: 10,
    },
    {
      id: 'zinc_phytates',
      primary: 'zinc_mg',
      secondary: 'fiber_g',
      type: 'blocking',
      effect: '25–50% reduction',
      title: 'Zinc blocked by Phytates',
      description: 'Phytates in whole grains bind zinc.',
      fix: 'Soaking, sprouting, or fermenting breaks phytates.',
      thresholdPrimary: 2,
      thresholdSecondary: 10,
    },
    {
      id: 'carotenoids_low_fat',
      primary: 'vita_ug',
      secondary: 'fat_g',
      type: 'blocking',
      effect: '60–90% reduction',
      title: 'Carotenoids blocked by Low Fat',
      description: 'Beta-carotene is highly fat-soluble. Without sufficient fat in the same meal, very little is absorbed.',
      fix: 'Add dressing, ghee, or nuts to meals high in Vitamin A from plant sources.',
      thresholdPrimary: 300,
      thresholdSecondaryMax: 3, // Antagonistic if fat < 3g
    }
  ]
};

/**
 * Evaluates a logged meal (array of food items) against the interaction knowledge graph.
 * @param {Array} foods - Array of food objects. Expected to have a { nutrients } object.
 * @returns {Object} { synergies: [], antagonisms: [] }
 */
function evaluateMealInteractions(foods) {
  // Aggregate meal nutrients
  const totals = {};
  let foodNames = [];
  
  foods.forEach(food => {
    foodNames.push(food.name ? food.name.toLowerCase() : '');
    
    // Support both sub-object 'nutrients' and flat fields (schema-style)
    const n = food.nutrients || food;
    
    const fieldsToCheck = [
      'energy_kcal', 'calories', 'protein_g', 'protein', 'carb_g', 'carbs', 'fat_g', 'fat', 
      'fibre_g', 'fiber', 'freesugar_g', 'sugar', 'sodium_mg', 'sodium', 'potassium_mg', 'potassium',
      'iron_mg', 'iron', 'calcium_mg', 'calcium', 'magnesium_mg', 'magnesium', 'zinc_mg', 'zinc',
      'vita_ug', 'vitaminA', 'vitc_mg', 'vitaminC', 'vite_mg', 'vitaminE', 'vitd_ug', 'vitaminD',
      'vitk_ug', 'vitaminK', 'vitb1_mg', 'vitaminB1', 'vitb2_mg', 'vitaminB2', 'vitb3_mg', 'vitaminB3',
      'vitb6_mg', 'vitaminB6', 'vitb9_ug', 'folate', 'vitb12_ug', 'vitaminB12'
    ];

    fieldsToCheck.forEach(key => {
      if (n[key] !== undefined) {
        // Map common aliases to internal INDB-style keys used by interaction rules
        let targetKey = key;
        if (key === 'calories') targetKey = 'energy_kcal';
        if (key === 'protein') targetKey = 'protein_g';
        if (key === 'carbs') targetKey = 'carb_g';
        if (key === 'fat') targetKey = 'fat_g';
        if (key === 'fiber') targetKey = 'fibre_g';
        if (key === 'sugar') targetKey = 'freesugar_g';
        if (key === 'sodium') targetKey = 'sodium_mg';
        if (key === 'potassium') targetKey = 'potassium_mg';
        if (key === 'iron') targetKey = 'iron_mg';
        if (key === 'calcium') targetKey = 'calcium_mg';
        if (key === 'magnesium') targetKey = 'magnesium_mg';
        if (key === 'zinc') targetKey = 'zinc_mg';
        if (key === 'vitaminA') targetKey = 'vita_ug';
        if (key === 'vitaminC') targetKey = 'vitc_mg';
        if (key === 'vitaminE') targetKey = 'vite_mg';
        if (key === 'vitaminD') targetKey = 'vitd_ug';
        if (key === 'vitaminK') targetKey = 'vitk_ug';
        if (key === 'vitaminB1') targetKey = 'vitb1_mg';
        if (key === 'vitaminB2') targetKey = 'vitb2_mg';
        if (key === 'vitaminB3') targetKey = 'vitb3_mg';
        if (key === 'vitaminB6') targetKey = 'vitb6_mg';
        if (key === 'folate') targetKey = 'vitb9_ug';
        if (key === 'vitaminB12') targetKey = 'vitb12_ug';

        totals[targetKey] = (totals[targetKey] || 0) + (Number(n[key]) || 0);
      }
    });
  });

  const synergies = [];
  const antagonisms = [];

  // Check Synergies
  interactionRules.synergistic.forEach(rule => {
    const pVal = totals[rule.primary] || 0;
    const sVal = totals[rule.secondary] || 0;

    if (pVal >= rule.thresholdPrimary && sVal >= rule.thresholdSecondary) {
      synergies.push({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        effect: rule.effect,
        example: rule.example,
        primaryAmount: pVal,
        secondaryAmount: sVal
      });
    }
  });

  // Check Antagonisms
  interactionRules.antagonistic.forEach(rule => {
    const pVal = totals[rule.primary] || 0;
    let activated = false;

    // Check standard threshold block
    if (rule.secondary) {
      const sVal = totals[rule.secondary] || 0;
      if (rule.thresholdSecondaryMax !== undefined) {
        // e.g. needs fat < 3, so secondary is fat, check against max
        if (pVal >= rule.thresholdPrimary && sVal < rule.thresholdSecondaryMax) {
          activated = true;
        }
      } else if (rule.thresholdSecondary !== undefined) {
         if (pVal >= rule.thresholdPrimary && sVal >= rule.thresholdSecondary) {
           activated = true;
         }
      }
    } else if (rule.foodFlags && rule.foodFlags.length > 0) {
      // Check if meal contains interfering foods (e.g. coffee, tea)
      if (pVal >= rule.thresholdPrimary) {
        const hasFlag = foodNames.some(name => rule.foodFlags.some(flag => name.includes(flag)));
        if (hasFlag) activated = true;
      }
    }

    if (activated) {
      antagonisms.push({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        effect: rule.effect,
        fix: rule.fix
      });
    }
  });

  return { synergies, antagonisms, aggregateNutrients: totals };
}

/**
 * Evaluates interactions across all meals in a day.
 * Evaluates each meal individually to prevent false positives from time-separated consumption.
 * @param {Array} meals - Array of meal objects, each containing foods array
 * @returns {Object} { synergies: [], antagonisms: [] }
 */
function evaluateDayInteractions(meals) {
  const allSynergies = new Map();
  const allAntagonisms = new Map();
  const dailyTotals = {};

  meals.forEach(meal => {
    if (meal.foods && Array.isArray(meal.foods)) {
      const { synergies, antagonisms, aggregateNutrients } = evaluateMealInteractions(meal.foods);
      
      synergies.forEach(s => allSynergies.set(s.id, s));
      antagonisms.forEach(a => allAntagonisms.set(a.id, a));
      
      // Accumulate daily totals
      Object.entries(aggregateNutrients).forEach(([key, val]) => {
        dailyTotals[key] = (dailyTotals[key] || 0) + val;
      });
    }
  });

  return { 
    synergies: Array.from(allSynergies.values()), 
    antagonisms: Array.from(allAntagonisms.values()),
    aggregateNutrients: dailyTotals 
  };
}

module.exports = {
  interactionRules,
  evaluateMealInteractions,
  evaluateDayInteractions
};
