const interactionRules = {
  synergistic: [
    {
      id: 'iron_vitc',
      primary: 'iron',
      secondary: 'vitaminC',
      type: 'boosting',
      effect: '2x to 3x increase',
      title: 'Iron + Vitamin C Synergy',
      description: 'Vitamin C reduces Fe3+ to Fe2+ (absorbable form) and forms an iron-ascorbate complex that resists phytate/tannin blocking.',
      example: 'Eat rajma WITH lemon squeeze or tomato.',
      thresholdPrimary: 0.5, // detectable iron
      thresholdSecondary: 10, // notable vit c
    },
    {
      id: 'vitd_fat',
      primary: 'vitaminD',
      secondary: 'fat',
      type: 'boosting',
      effect: 'Requires fat for absorption',
      title: 'Vitamin D + Fat Synergy',
      description: 'Vitamin D is fat-soluble. Consuming it without fat results in near-zero absorption.',
      example: 'Add full-fat dairy or a handful of nuts to your meal.',
      thresholdPrimary: 1, 
      thresholdSecondary: 3, 
    },
    {
      id: 'vita_fat',
      primary: 'vitaminA',
      secondary: 'fat',
      type: 'boosting',
      effect: 'Requires fat for absorption',
      title: 'Vitamin A + Fat Synergy',
      description: 'Vitamin A is fat-soluble. Consuming it without fat results in near-zero absorption.',
      example: 'Add ghee or olive oil dressing to your carrot salad.',
      thresholdPrimary: 100, 
      thresholdSecondary: 3, 
    },
    {
      id: 'vite_vitc',
      primary: 'vitaminE',
      secondary: 'vitaminC',
      type: 'boosting',
      effect: 'Synergistic antioxidant regeneration',
      title: 'Vitamin E + Vitamin C Synergy',
      description: 'Vitamin C regenerates oxidized Vitamin E back to its active form, providing broader antioxidant coverage.',
      thresholdPrimary: 2,
      thresholdSecondary: 10,
    },
    {
      id: 'vitk_fat',
      primary: 'vitaminK', // Assuming vitaminK might be tracked, fallback if not
      secondary: 'fat',
      type: 'boosting',
      effect: 'Requires fat for absorption',
      title: 'Vitamin K + Fat Synergy',
      description: 'Vitamin K is fat-soluble. Consuming it without fat results in near-zero absorption.',
      example: 'Must pair leafy green salad with a fat source.',
      thresholdPrimary: 10, // Assuming ug
      thresholdSecondary: 3,
    },
    {
      id: 'calcium_vitd',
      primary: 'calcium',
      secondary: 'vitaminD',
      type: 'boosting',
      effect: '1.5–2x increase',
      title: 'Calcium + Vitamin D Synergy',
      description: 'Vitamin D upregulates calcium transport proteins in the gut. Without adequate D, only 10–15% of dietary calcium is absorbed; with it, 30–40%.',
      thresholdPrimary: 100,
      thresholdSecondary: 1,
    },
    {
      id: 'magnesium_vitd',
      primary: 'magnesium',
      secondary: 'vitaminD',
      type: 'boosting',
      effect: 'Mutual activation',
      title: 'Magnesium + Vitamin D Synergy',
      description: 'Magnesium is required to activate Vitamin D (convert to its active hormone form). Low Magnesium means Vitamin D supplementation cannot work properly.',
      thresholdPrimary: 50,
      thresholdSecondary: 1,
    },
    {
      id: 'zinc_vita',
      primary: 'zinc',
      secondary: 'vitaminA',
      type: 'boosting',
      effect: 'Mutual dependency',
      title: 'Zinc + Vitamin A Synergy',
      description: 'Zinc is required to mobilize Vitamin A from liver stores, and Vitamin A is required for zinc absorption in gut.',
      thresholdPrimary: 2,
      thresholdSecondary: 100,
    },
    {
      id: 'turmeric_piperine',
      primary: 'curcumin', // Need pseudo-nutrient check or food flag
      secondary: 'piperine', 
      type: 'boosting',
      effect: '20x increase in curcumin absorption',
      title: 'Turmeric + Black Pepper',
      description: 'Piperine inhibits the enzyme that rapidly metabolizes curcumin. Traditional dal/curry with turmeric and black pepper is nutritionally optimal.',
      foodFlagsPrimary: ['turmeric', 'haldi', 'curry powder'],
      foodFlagsSecondary: ['black pepper', 'pepper'],
    },
    {
      id: 'b12_protein',
      primary: 'vitaminB12',
      secondary: 'protein',
      type: 'boosting',
      effect: 'Requires acid for release from food',
      title: 'Vitamin B12 + Protein',
      description: 'B12 is bound to proteins in food. Stomach acid (stimulated by protein) releases it.',
      thresholdPrimary: 0.5,
      thresholdSecondary: 10,
    },
    {
      id: 'selenium_vite',
      primary: 'selenium',
      secondary: 'vitaminE',
      type: 'boosting',
      effect: 'Synergistic antioxidant protection',
      title: 'Selenium + Vitamin E',
      description: 'Work together in glutathione peroxidase system. Both needed for full antioxidant protection.',
      thresholdPrimary: 10,
      thresholdSecondary: 2,
    },
    {
      id: 'lycopene_fat_heat',
      primary: 'lycopene', 
      secondary: 'fat',
      type: 'boosting',
      effect: '400% increase with cooked fat',
      title: 'Tomatoes + Oil (Lycopene + Fat)',
      description: 'Lycopene from tomatoes is tightly bound to cell walls. Heat and fat (like olive oil) drastically improve its absorption.',
      foodFlagsPrimary: ['tomato', 'tomatoes'],
      thresholdSecondary: 3, 
    },
    {
      id: 'catechins_vitc',
      primary: 'catechins', 
      secondary: 'vitaminC',
      type: 'boosting',
      effect: '5x to 10x absorption of EGCG',
      title: 'Green Tea + Vitamin C',
      description: 'Adding a squeeze of lemon (Vitamin C) to green tea stabilizes catechins during digestion, dramatically increasing their absorption.',
      foodFlagsPrimary: ['green tea', 'matcha'],
      thresholdSecondary: 5, 
    },
    {
      id: 'allium_iron_zinc',
      primary: 'allium', 
      secondary: 'minerals', 
      type: 'boosting',
      effect: '50-70% higher mineral bioavailability',
      title: 'Allium + Grains/Legumes (Iron & Zinc Synergy)',
      description: 'Onions and garlic contain sulfur compounds that bind to zinc and iron in plant foods (like dal or rice), helping to pull them past phytate blockers.',
      foodFlagsPrimary: ['garlic', 'onion', 'allium', 'shallot', 'lehsun', 'pyaaz'],
      foodFlagsSecondary: ['rice', 'dal', 'lentil', 'bean', 'chickpea', 'rajma', 'chana', 'roti', 'wheat', 'grain', 'paneer'],
    }
  ],
  antagonistic: [
    {
      id: 'iron_calcium',
      primary: 'iron',
      secondary: 'calcium',
      type: 'blocking',
      effect: '50–60% reduction',
      title: 'Iron blocked by Calcium',
      description: 'Calcium and iron compete for the same intestinal transporter.',
      fix: 'Separate iron-rich and calcium-rich meals by 2 hours.',
      thresholdPrimary: 0.5, 
      thresholdSecondary: 150, 
    },
    {
      id: 'iron_tannins',
      primary: 'iron',
      secondary: 'tannins', 
      type: 'blocking',
      effect: '40–60% reduction',
      title: 'Iron blocked by Tannins (Tea/Coffee)',
      description: 'Tannins in tea and coffee bind iron to form an insoluble complex. The #1 cause of iron deficiency in India.',
      fix: 'Have chai 1 hour before or after an iron-rich meal.',
      foodFlagsSecondary: ['tea', 'coffee', 'chai', 'green tea', 'matcha'], 
      thresholdPrimary: 0.5,
    },
    {
      id: 'iron_phytates',
      primary: 'iron',
      secondary: 'fiber', 
      type: 'blocking',
      effect: '25–65% reduction',
      title: 'Iron blocked by Phytates',
      description: 'Phytic acid in whole grains and raw legumes binds iron.',
      fix: 'Soaking, sprouting, or fermenting breaks phytates and greatly improves absorption.',
      thresholdPrimary: 0.5,
      thresholdSecondary: 5,
    },
    {
      id: 'zinc_phytates',
      primary: 'zinc',
      secondary: 'fiber',
      type: 'blocking',
      effect: '25–50% reduction',
      title: 'Zinc blocked by Phytates',
      description: 'Phytates in whole grains bind zinc.',
      fix: 'Soaking, sprouting, or fermenting grains/legumes breaks phytates.',
      thresholdPrimary: 2,
      thresholdSecondary: 10,
    },
    {
      id: 'zinc_calcium',
      primary: 'zinc',
      secondary: 'calcium',
      type: 'blocking',
      effect: 'Competes at absorption',
      title: 'Zinc + High Calcium',
      description: 'Only relevant at supplement doses > 600mg calcium. Competes for absorption.',
      thresholdPrimary: 5,
      thresholdSecondary: 600,
    },
    {
      id: 'k_a_supps',
      primary: 'vitaminK',
      secondary: 'vitaminA',
      type: 'blocking',
      effect: 'Interferes with K activity',
      title: 'Vitamin K blocked by excessive Vitamin A',
      description: 'Preformed Vitamin A in very high doses (from supplements, liver overconsumption) interferes with Vitamin K metabolism. Food sources are safe.',
      thresholdPrimary: 10,
      thresholdSecondary: 3000, 
    },
    {
      id: 'mg_cal_supps',
      primary: 'magnesium',
      secondary: 'calcium',
      type: 'blocking',
      effect: 'Compete for absorption',
      title: 'Magnesium vs High Calcium',
      description: 'At very high supplemental calcium doses, magnesium absorption is impaired.',
      thresholdPrimary: 100,
      thresholdSecondary: 1000, 
    },
    {
      id: 'vitd_mg_def',
      primary: 'vitaminD',
      secondary: 'magnesium',
      type: 'blocking',
      effect: 'Vitamin D cannot activate without Mg',
      title: 'Vitamin D requires Magnesium',
      description: 'Indirect block: Magnesium is required for Vitamin D activation. Without Mg, supplementing Vitamin D does nothing.',
      thresholdPrimary: 10,
      thresholdSecondaryMax: 50, // if meal has low Mg, it's not a block, but maybe a body-level warning. Still good to show.
    },
    {
      id: 'carotenoids_low_fat',
      primary: 'vitaminA',
      secondary: 'fat',
      type: 'blocking',
      effect: '60–90% reduction',
      title: 'Carotenoids blocked by Low Fat',
      description: 'Beta-carotene is highly fat-soluble. Without sufficient fat in the same meal, very little is absorbed.',
      fix: 'Add dressing, ghee, or nuts to meals high in Vitamin A from plant sources.',
      thresholdPrimary: 300,
      thresholdSecondaryMax: 3, 
    },
    {
      id: 'b_vitamins_alcohol',
      primary: 'vitaminB', // Pseudo nutrient 
      secondary: 'alcohol',
      type: 'blocking',
      effect: 'Blocks B1, B2, B6, B9, B12',
      title: 'B-vitamins blocked by Alcohol',
      description: 'Alcohol interferes with B-vitamin absorption at multiple points.',
      fix: 'Avoid alcohol during highly nutritious meals.',
      foodFlagsSecondary: ['beer', 'wine', 'vodka', 'whiskey', 'rum', 'alcohol', 'cocktail'],
      foodFlagsPrimary: [],
      thresholdPrimary: 0, // Always triggers if alcohol is present and checking for B-vits (handled specially or generic)
    },
    {
      id: 'folate_heat',
      primary: 'folate', // Often mapped to vitaminB9 
      secondary: 'heat',
      type: 'blocking',
      effect: '50–80% destroyed in high heat',
      title: 'Folate lost to high heat',
      description: 'Folate is highly heat-labile. Boiling vegetables destroys most of their folate.',
      fix: 'Steaming or eating raw preserves far more folate. Flag overcooking patterns.',
      foodFlagsSecondary: ['boiled', 'fried', 'roasted', 'baked'],
      thresholdPrimary: 50,
    }
  ]
};

/**
 * Evaluates a logged meal (array of food items) against the interaction knowledge graph.
 * @param {Array} foods - Array of food objects. Expected to have flat nutrient properties like { calories, iron, vitaminC }
 * @returns {Object} { synergies: [], antagonisms: [], aggregateNutrients: {} }
 */
function evaluateMealInteractions(foods) {
  console.log('[InteractionEngine] Evaluating meal with', foods?.length, 'foods');
  // Aggregate meal nutrients
  const totals = {};
  let foodNames = [];
  
  (foods || []).forEach(food => {
    foodNames.push(food.name ? food.name.toLowerCase() : '');
    // Usually frontend passes flat nutrient fields on the food object itself
    // Or it might be nested under `nutrients`. We handle both.
    const source = food.nutrients || food;
    Object.keys(source).forEach(key => {
      if (typeof source[key] === 'number') {
        totals[key] = (totals[key] || 0) + source[key];
      }
    });

    // Handle b-vitamins and folate mapping
    if (source.vitaminB1 || source.vitaminB2 || source.vitaminB3 || source.vitaminB6 || source.vitaminB12) {
      totals.vitaminB = (totals.vitaminB || 0) + 1;
    }
    if (source.vitaminB9) {
      totals.folate = (totals.folate || 0) + source.vitaminB9;
    }
  });

  const synergies = [];
  const antagonisms = [];

  // Helper to check flags using word boundaries to prevent 'steak' matching 'tea'
  const hasFlag = (flags) => {
    if (!flags || flags.length === 0) return false;
    return foodNames.some(name => flags.some(flag => {
      try {
        const regex = new RegExp(`\\b${flag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        return regex.test(name);
      } catch (e) {
        return name.includes(flag); // fallback just in case
      }
    }));
  };

  // Check Synergies
  interactionRules.synergistic.forEach(rule => {
    let activated = false;
    const pVal = totals[rule.primary] || 0;
    const sVal = totals[rule.secondary] || 0;

    if (rule.foodFlagsPrimary && rule.foodFlagsSecondary) {
      if (hasFlag(rule.foodFlagsPrimary) && hasFlag(rule.foodFlagsSecondary)) {
        activated = true;
      }
    } else if (rule.foodFlagsPrimary && rule.thresholdSecondary !== undefined) {
      if (hasFlag(rule.foodFlagsPrimary) && sVal >= rule.thresholdSecondary) {
        activated = true;
      }
    } else if (pVal >= rule.thresholdPrimary && sVal >= rule.thresholdSecondary) {
      activated = true;
    }

    if (activated) {
      synergies.push({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        effect: rule.effect,
        example: rule.example,
        primaryAmount: pVal,
        secondaryAmount: sVal,
      });
    }
  });

  // Check Antagonisms
  interactionRules.antagonistic.forEach(rule => {
    const pVal = totals[rule.primary] || 0;
    let activated = false;

    // First check if primary is present
    const primaryMet = rule.thresholdPrimary === 0 ? hasFlag(rule.foodFlagsPrimary) : pVal >= rule.thresholdPrimary;

    if (primaryMet || (rule.foodFlagsPrimary && rule.foodFlagsPrimary.length === 0 && totals[rule.primary] !== undefined)) {
      if (rule.secondary && rule.secondary !== 'tannins' && rule.secondary !== 'heat' && rule.secondary !== 'alcohol') {
        const sVal = totals[rule.secondary] || 0;
        if (rule.thresholdSecondaryMax !== undefined) {
          if (sVal < rule.thresholdSecondaryMax) activated = true;
        } else if (rule.thresholdSecondary !== undefined) {
          if (sVal >= rule.thresholdSecondary) activated = true;
        }
      } else if (rule.foodFlagsSecondary) {
        if (hasFlag(rule.foodFlagsSecondary)) activated = true;
      } else if (rule.foodFlags) { // Back compat 
        if (hasFlag(rule.foodFlags)) activated = true;
      }
      
      // Special case B vitamins + Alcohol where primary is vitaminB (pseudo)
      if (rule.id === 'b_vitamins_alcohol' && totals.vitaminB > 0 && hasFlag(rule.foodFlagsSecondary)) {
        activated = true;
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

  console.log('[InteractionEngine] Found', synergies.length, 'synergies and', antagonisms.length, 'antagonisms');
  return { synergies, antagonisms, aggregateNutrients: totals };
}

/**
 * Evaluates interactions across an entire day (multiple meals)
 * @param {Array} meals 
 * @returns {Object} { synergies: [], antagonisms: [] }
 */
function evaluateDayInteractions(meals) {
  if (!meals || meals.length === 0) return { synergies: [], antagonisms: [] };
  
  // For now, we perform a whole-day aggregation to detect if the user's overall 
  // combinations are optimal or blocking.
  const allFoods = meals.flatMap(m => m.foods || []);
  return evaluateMealInteractions(allFoods);
}

module.exports = {
  interactionRules,
  evaluateMealInteractions,
  evaluateDayInteractions
};
