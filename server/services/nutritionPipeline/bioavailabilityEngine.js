/**
 * Bioavailability Engine
 * ─────────────────────────────────────────────────────────────────
 * Computes how much of each consumed nutrient the body ACTUALLY absorbs,
 * given the meal context (blockers, synergists, food types).
 *
 * Sources:
 *  - Hurrell & Egli (2010) Am J Clin Nutr — Iron bioavailability
 *  - Holick (2007) NEJM — Vitamin D absorption
 *  - Tanumihardjo (2002) J Nutr — Vitamin A/carotenoid bioavailability
 *  - Lönnerdal (2000) Am J Clin Nutr — Zinc & mineral interactions
 *  - McNulty & Pentieva (2004) Proc Nutr Soc — Folate heat lability
 *  - Nordin (1997) Am J Clin Nutr — Calcium absorption & Vitamin D
 */

// ─────────────────────────────────────────────────────────────────
// FOOD-TYPE FLAG HELPERS
// ─────────────────────────────────────────────────────────────────

const HEME_IRON_FLAGS = [
  'chicken', 'beef', 'mutton', 'lamb', 'pork', 'fish', 'salmon', 'tuna',
  'sardine', 'anchovy', 'prawn', 'shrimp', 'crab', 'lobster', 'egg',
  'liver', 'kidney', 'meat', 'keema', 'minced meat', 'turkey', 'duck',
];

const TANNIN_FLAGS = [
  'tea', 'chai', 'coffee', 'green tea', 'black tea', 'matcha', 'oolong',
];

const PHYTATE_FLAGS = [
  'wheat', 'bran', 'oat', 'rye', 'barley', 'rice', 'corn', 'soybean',
  'chickpea', 'chana', 'lentil', 'dal', 'rajma', 'kidney bean', 'bean',
  'legume', 'roti', 'chapati', 'bread', 'cereal',
];

const HIGH_HEAT_FLAGS = [
  'boiled', 'fried', 'deep fried', 'roasted', 'baked', 'overcooked',
];

const ALLIUM_FLAGS = [
  'onion', 'garlic', 'shallot', 'leek', 'chive', 'pyaaz', 'lehsun',
];

const ALCOHOL_FLAGS = [
  'beer', 'wine', 'vodka', 'whiskey', 'rum', 'alcohol', 'cocktail',
  'whisky', 'brandy', 'gin', 'sake', 'tequila',
];

/**
 * Checks if any food name in the meal matches any of the given flags
 * using word-boundary regex to prevent false positives (e.g. "steak" → "tea").
 */
function hasFlag(foodNames, flags) {
  if (!flags || flags.length === 0 || !foodNames || foodNames.length === 0) return false;
  return foodNames.some(name =>
    flags.some(flag => {
      try {
        const escaped = flag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(name);
      } catch {
        return name.toLowerCase().includes(flag.toLowerCase());
      }
    })
  );
}

// ─────────────────────────────────────────────────────────────────
// AGGREGATE MEAL CONTEXT
// ─────────────────────────────────────────────────────────────────

function buildMealContext(foods) {
  const totals = {};
  const foodNames = [];

  (foods || []).forEach(food => {
    if (food.name) foodNames.push(food.name.toLowerCase());
    const src = food.nutrients || food;
    Object.keys(src).forEach(key => {
      if (typeof src[key] === 'number') {
        totals[key] = (totals[key] || 0) + src[key];
      }
    });
    // Combine B-vitamin sub-fields into a single vitaminB signal
    if (src.vitaminB1 || src.vitaminB2 || src.vitaminB3 || src.vitaminB6 || src.vitaminB12) {
      totals._hasBvitamins = true;
    }
    if (src.vitaminD2 || src.vitaminD3) {
      totals.vitaminD = (totals.vitaminD || 0) + (src.vitaminD2 || 0) + (src.vitaminD3 || 0);
    }
  });

  return {
    totals,
    foodNames,
    isHemeSource: hasFlag(foodNames, HEME_IRON_FLAGS),
    hasTannins:   hasFlag(foodNames, TANNIN_FLAGS),
    hasPhytates:  hasFlag(foodNames, PHYTATE_FLAGS),
    hasHighHeat:  hasFlag(foodNames, HIGH_HEAT_FLAGS),
    hasAlliums:   hasFlag(foodNames, ALLIUM_FLAGS),
    hasAlcohol:   hasFlag(foodNames, ALCOHOL_FLAGS),
  };
}

// ─────────────────────────────────────────────────────────────────
// PER-NUTRIENT CALCULATORS
// ─────────────────────────────────────────────────────────────────

/**
 * IRON
 * ─────
 * Baseline absorption:
 *   Heme iron (meat): 15–35%, median ~25%. Barely affected by inhibitors.
 *   Non-heme iron (plant): 2–20%, median ~10%. Heavily affected.
 *
 * Key inhibitors (non-heme):
 *   Tannins:   −50% (Hurrell 1999, Br J Nutr)
 *   Calcium:   −45% if >150mg in same meal (Hallberg 1991)
 *   Phytates:  −60% if high-phytate foods present (Hurrell 2003)
 *
 * Key enhancers:
 *   Vitamin C: Dynamic. Every 25mg of Vit C roughly doubles absorption.
 *              Caps at 3× enhancement. Formula: min(vitC_mg/25, 3.0)
 *              Vit C can PARTIALLY overcome tannin and phytate blocking.
 *   Alliums:   +20% partial phytate offset (Gautam 2010)
 *
 * Heme iron is minimally affected: tannins only reduce it by ~10%.
 */
function calculateIron(ctx) {
  const consumed = ctx.totals.iron || 0;
  if (consumed < 0.5) return null; // Below meaningful threshold

  const interactions = [];

  if (ctx.isHemeSource) {
    // Heme iron — minimal inhibitor effect; baseline ~25%
    let multiplier = 0.25;
    if (ctx.hasTannins) {
      multiplier *= 0.90; // ~10% reduction for heme
      interactions.push({ type: 'blocker', agent: 'tannins', effect: '−10%', note: 'Heme iron is largely resistant to tannins.' });
    }
    // Heme iron doesn't interact significantly with calcium or phytates
    return buildResult('iron', consumed, multiplier, interactions, 'high', 'mg',
      'Heme iron (from animal foods) absorbs well at ~25% baseline.');

  } else {
    // Non-heme iron — heavily affected; baseline ~10%
    let multiplier = 0.10;
    if (ctx.hasTannins) {
      multiplier *= 0.50; // −50%
      interactions.push({ type: 'blocker', agent: 'tannins', effect: '−50%', note: ctx.foodNames.find(n => TANNIN_FLAGS.some(f => n.includes(f))) || 'tea/coffee' });
    }
    const calcium = ctx.totals.calcium || 0;
    if (calcium >= 300) {
      const calReduction = calcium >= 600 ? 0.50 : 0.70; // Hallberg 1991: 300-600mg → 0.70; >600mg → 0.50
      multiplier *= calReduction;
      const pct = Math.round((1 - calReduction) * 100);
      interactions.push({ type: 'blocker', agent: 'calcium', effect: `−${pct}%`, note: `${Math.round(calcium)}mg calcium in meal` });
    }
    if (ctx.hasPhytates) {
      multiplier *= 0.60; // −40% reduction in remaining
      interactions.push({ type: 'blocker', agent: 'phytates', effect: '−40%', note: 'Whole grains/legumes contain phytic acid.' });
    }

    // Enhancers
    const vitC = ctx.totals.vitaminC || 0;
    if (vitC >= 15) {
      const vitCBoost = Math.min(vitC / 25, 3.0); // caps at 3× enhancement factor
      multiplier *= vitCBoost;
      // Absolute cap: non-heme with optimal VitC should not exceed 0.30 (30%)
      multiplier = Math.min(multiplier, 0.30);
      interactions.push({ type: 'booster', agent: 'vitamin_c', effect: `+${vitCBoost.toFixed(1)}×`, note: `${Math.round(vitC)}mg Vit C partially offsets inhibitors.` });
    }
    if (ctx.hasAlliums) {
      multiplier *= 1.20; // +20%
      interactions.push({ type: 'booster', agent: 'alliums', effect: '+20%', note: 'Onion/garlic sulfur compounds improve mineral uptake.' });
    }

    const confidence = (ctx.hasTannins || ctx.hasPhytates || vitC >= 15) ? 'high' : 'medium';
    return buildResult('iron', consumed, multiplier, interactions, confidence, 'mg',
      ctx.isHemeSource ? '' : 'Non-heme iron (plant source). Absorption is highly context-dependent.');
  }
}

/**
 * CALCIUM
 * ────────
 * Without Vitamin D (<1µg): absorbs at ~10–15% (passive diffusion only).
 * With Vitamin D (>=5µg): absorbs at ~30–40% (active transport upregulated).
 * Very high phosphorus (>1000mg) can mildly impair absorption.
 *
 * Threshold: Only meaningful at ≥50mg in a meal.
 */
function calculateCalcium(ctx) {
  const consumed = ctx.totals.calcium || 0;
  if (consumed < 50) return null;

  const interactions = [];
  // Baseline 30% regardless of meal Vit D (Vit D status is serum-based, not per-meal)
  let multiplier = 0.30;

  const vitD = ctx.totals.vitaminD || 0;
  if (vitD >= 5) {
    multiplier *= 1.15; // small bonus when meal itself provides meaningful Vit D
    interactions.push({ type: 'booster', agent: 'vitamin_d', effect: '+15% vs baseline', note: `${vitD.toFixed(1)}µg Vitamin D present in meal.` });
  }

  const confidence = vitD >= 5 ? 'high' : 'medium';
  return buildResult('calcium', consumed, multiplier, interactions, confidence, 'mg',
    'Calcium absorption baseline ~30%. Vitamin D status (serum) is the primary regulator, not per-meal intake.');
}

/**
 * VITAMIN D
 * ──────────
 * Fat-soluble — requires dietary fat for micelle formation.
 *   Without fat (<3g): absorbs at ~10–20%
 *   With adequate fat (>=5g): absorbs at ~50–80%
 * Magnesium required for activation (enzyme CYP2R1):
 *   Without Mg (<50mg): activated form (calcitriol) not properly formed,
 *   reducing effective bioactivity by ~40%.
 *
 * Threshold: Only meaningful at ≥0.5µg in a meal.
 */
function calculateVitaminD(ctx) {
  const consumed = ctx.totals.vitaminD || 0;
  if (consumed < 0.5) return null;

  const interactions = [];
  let multiplier = 0.65; // baseline with fat

  const fat = ctx.totals.fat || 0;
  if (fat < 3) {
    multiplier *= 0.20; // −80% without fat
    interactions.push({ type: 'blocker', agent: 'low_fat', effect: '−80%', note: `Only ${fat.toFixed(1)}g fat in meal. Vitamin D needs micelles (fat) to absorb.` });
  } else if (fat >= 10) {
    multiplier *= 1.15; // slight boost with generous fat
    interactions.push({ type: 'booster', agent: 'fat', effect: 'optimal absorption', note: `${fat.toFixed(1)}g fat present. Good for Vit D uptake.` });
  } else {
    interactions.push({ type: 'neutral', agent: 'fat', effect: 'adequate', note: `${fat.toFixed(1)}g fat present.` });
  }

  const mg = ctx.totals.magnesium || 0;
  if (mg < 50) {
    multiplier *= 0.60; // −40% bioactivity without Mg
    interactions.push({ type: 'blocker', agent: 'low_magnesium', effect: '−40% bioactivity', note: 'Magnesium activates Vitamin D. Low Mg meals reduce its effectiveness.' });
  }

  if (ctx.hasAlcohol) {
    multiplier *= 0.70;
    interactions.push({ type: 'blocker', agent: 'alcohol', effect: '−30%', note: 'Alcohol impairs Vit D metabolism.' });
  }

  return buildResult('vitaminD', consumed, multiplier, interactions, fat >= 3 ? 'high' : 'medium', 'µg',
    'Vitamin D is fat-soluble and requires magnesium for activation.');
}

/**
 * VITAMIN A (beta-carotene / retinol)
 * ─────────────────────────────────────
 * Retinol (animal): absorbs at ~70–90%. Relatively unaffected by fat status.
 * Beta-carotene (plant): absorbs at 3–20% depending heavily on:
 *   - Fat presence: WITHOUT fat (<3g) → only ~3–5% absorbed (−75%)
 *   - Cooking: cooked/heated tomatoes release more lycopene/carotene
 *
 * We can't distinguish retinol vs beta-carotene without food DB data,
 * so if meal has plant Vit A sources (carrot, spinach, etc.), we apply
 * fat modifier. Otherwise, assume mixed.
 *
 * Threshold: Only meaningful at ≥50µg in a meal.
 */
const BETA_CAROTENE_FLAGS = ['carrot', 'spinach', 'kale', 'sweet potato', 'mango', 'papaya', 'pumpkin', 'leafy', 'greens', 'palak'];

function calculateVitaminA(ctx) {
  const consumed = ctx.totals.vitaminA || 0;
  if (consumed < 50) return null;

  const interactions = [];
  const fat = ctx.totals.fat || 0;
  const isPlantSource = hasFlag(ctx.foodNames, BETA_CAROTENE_FLAGS);

  let multiplier = isPlantSource ? 0.12 : 0.75; // plant vs animal baseline

  if (isPlantSource) {
    if (fat < 3) {
      multiplier = 0.03; // near-zero without fat
      interactions.push({ type: 'blocker', agent: 'low_fat', effect: '−75%', note: 'Beta-carotene requires fat for solubilization. Add oil/ghee to salads.' });
    } else if (fat >= 10) {
      multiplier = 0.20; // well-absorbed with good fat
      interactions.push({ type: 'booster', agent: 'fat', effect: '+optimal absorption', note: `${fat.toFixed(1)}g fat enables proper carotenoid absorption.` });
    } else {
      multiplier = 0.12;
      interactions.push({ type: 'neutral', agent: 'fat', effect: 'partial', note: `${fat.toFixed(1)}g fat present. 5g+ is optimal for beta-carotene.` });
    }
  } else {
    interactions.push({ type: 'neutral', agent: 'retinol', effect: 'good baseline', note: 'Animal-source Vitamin A (retinol) absorbs well regardless of fat.' });
  }

  const confidence = isPlantSource ? 'high' : 'medium';
  return buildResult('vitaminA', consumed, multiplier, interactions, confidence, 'µg',
    isPlantSource ? 'Beta-carotene (plant Vit A) is highly fat-dependent.' : 'Retinol (animal Vit A) absorbs independently.');
}

/**
 * VITAMIN K
 * ──────────
 * Fat-soluble. Absorption pattern similar to Vitamin A.
 * Without fat (<3g): only ~5–10% absorbed.
 * With fat (>=5g): 50–70% absorbed.
 *
 * Threshold: ≥10µg in a meal.
 */
function calculateVitaminK(ctx) {
  const consumed = ctx.totals.vitaminK || 0;
  if (consumed < 10) return null;

  const interactions = [];
  const fat = ctx.totals.fat || 0;
  let multiplier = 0.60; // baseline with fat

  if (fat < 3) {
    multiplier = 0.07; // near-zero without fat
    interactions.push({ type: 'blocker', agent: 'low_fat', effect: '−85%', note: 'Vitamin K is fat-soluble. Leafy greens must be eaten with oil/ghee.' });
  } else if (fat >= 5) {
    interactions.push({ type: 'booster', agent: 'fat', effect: 'optimal', note: `${fat.toFixed(1)}g fat enables Vit K absorption.` });
  }

  return buildResult('vitaminK', consumed, multiplier, interactions, fat >= 3 ? 'high' : 'medium', 'µg', '');
}

/**
 * VITAMIN E
 * ──────────
 * Fat-soluble. Absorption is strongly fat-dependent.
 * Without fat (<3g): ~10–20% absorbed.
 * With fat (>=5g): ~50–70% absorbed.
 * Vitamin C regenerates oxidized Vitamin E (α-tocopheryl radical) — this is
 * not an absorption effect but a BIOACTIVITY boost (increases functional pool).
 *
 * Threshold: ≥2mg in a meal.
 */
function calculateVitaminE(ctx) {
  const consumed = ctx.totals.vitaminE || 0;
  if (consumed < 2) return null;

  const interactions = [];
  const fat = ctx.totals.fat || 0;
  let multiplier = 0.55;

  if (fat < 3) {
    multiplier = 0.15;
    interactions.push({ type: 'blocker', agent: 'low_fat', effect: '−70%', note: 'Vitamin E is fat-soluble. Needs dietary fat for uptake.' });
  } else {
    interactions.push({ type: 'booster', agent: 'fat', effect: 'adequate absorption', note: `${fat.toFixed(1)}g fat present.` });
  }

  const vitC = ctx.totals.vitaminC || 0;
  if (vitC >= 30) {
    multiplier *= 1.20; // Vit C regenerates Vit E — ~20% boost in active pool
    interactions.push({ type: 'booster', agent: 'vitamin_c', effect: '+20% active pool', note: 'Vit C regenerates oxidized Vit E, extending its functional activity.' });
  }

  return buildResult('vitaminE', consumed, multiplier, interactions, fat >= 3 ? 'high' : 'medium', 'mg', '');
}

/**
 * ZINC
 * ─────
 * Baseline absorption: ~20–30% from mixed diet.
 * Key inhibitors:
 *   Phytates (−40%): strongest inhibitor of zinc (Lönnerdal 2000)
 *   High calcium (>600mg): (−25%) — only at supplement doses
 *   High iron in same meal: (−15%) — competitive transport
 * Key enhancers:
 *   Protein: chelates zinc, makes it more absorbable (+20%)
 *   Alliums: +15% (Gautam 2010)
 *
 * Threshold: ≥1mg in a meal.
 */
function calculateZinc(ctx) {
  const consumed = ctx.totals.zinc || 0;
  if (consumed < 1) return null;

  const interactions = [];
  let multiplier = 0.26; // baseline mixed diet

  if (ctx.hasPhytates) {
    multiplier *= 0.60; // −40%
    interactions.push({ type: 'blocker', agent: 'phytates', effect: '−40%', note: 'Phytic acid in grains/legumes forms insoluble zinc complex.' });
  }
  const calcium = ctx.totals.calcium || 0;
  if (calcium >= 600) {
    multiplier *= 0.75; // −25%
    interactions.push({ type: 'blocker', agent: 'high_calcium', effect: '−25%', note: 'Very high calcium (supplement-level) competes with zinc.' });
  }
  const iron = ctx.totals.iron || 0;
  if (iron >= 5) {
    multiplier *= 0.85; // −15% competitive
    interactions.push({ type: 'blocker', agent: 'high_iron', effect: '−15%', note: 'High iron competes for shared intestinal transporter.' });
  }

  // Enhancers
  const protein = ctx.totals.protein || 0;
  if (protein >= 15) {
    multiplier *= 1.20;
    interactions.push({ type: 'booster', agent: 'protein', effect: '+20%', note: 'Protein chelates zinc, improving its transport.' });
  }
  if (ctx.hasAlliums) {
    multiplier *= 1.15;
    interactions.push({ type: 'booster', agent: 'alliums', effect: '+15%', note: 'Onion/garlic sulfur compounds improve zinc bioavailability.' });
  }

  return buildResult('zinc', consumed, multiplier, interactions, ctx.hasPhytates ? 'high' : 'medium', 'mg', '');
}

/**
 * FOLATE (B9)
 * ────────────
 * Highly heat-labile. Boiling vegetables can destroy 50–80% of folate.
 * Alcohol strongly depletes folate absorption and increases excretion.
 * Baseline absorption of food folate: ~50% (vs 85% for synthetic folic acid).
 *
 * Threshold: ≥30µg in a meal.
 */
function calculateFolate(ctx, foods) {
  const consumed = (ctx.totals.folate || 0) + (ctx.totals.vitaminB9 || 0);
  if (consumed < 30) return null;

  const interactions = [];
  let multiplier = 0.50; // food folate baseline

  // Only apply high-heat penalty when the meal actually contains folate-rich foods;
  // prevents false positives (e.g. "baked chicken" triggering a folate penalty).
  const hasFolateRichFood = (foods || []).some(f =>
    /spinach|kale|broccoli|lentil|bean|pea|asparagus|lettuce|chickpea|edamame/i.test(String(f.name || ''))
  );
  if (ctx.hasHighHeat && hasFolateRichFood) {
    multiplier *= 0.30; // −70% from boiling
    interactions.push({ type: 'blocker', agent: 'high_heat', effect: '−70%', note: 'Boiling/frying destroys most folate. Prefer steaming or raw.' });
  }
  if (ctx.hasAlcohol) {
    multiplier *= 0.50; // −50% from alcohol
    interactions.push({ type: 'blocker', agent: 'alcohol', effect: '−50%', note: 'Alcohol severely impairs folate absorption and increases excretion.' });
  }
  const vitC = ctx.totals.vitaminC || 0;
  if (vitC >= 20) {
    multiplier *= 1.15; // Vit C stabilizes folate
    interactions.push({ type: 'booster', agent: 'vitamin_c', effect: '+15%', note: 'Vitamin C reduces folate oxidation.' });
  }

  return buildResult('folate', consumed, multiplier, interactions, (ctx.hasHighHeat && hasFolateRichFood) ? 'high' : 'medium', 'µg', '');
}

/**
 * VITAMIN B12
 * ────────────
 * Requires intrinsic factor (IF) secreted by stomach parietal cells.
 * Absorption of food B12 is ~50% baseline.
 * Without adequate stomach acid (coffee, antacids, PPI-type eating):
 *   absorption can fall to 10–20%.
 * Alcohol reduces by ~30%.
 * High protein meal HELPS (protein in food binds B12, stimulates acid).
 *
 * Threshold: ≥0.5µg in a meal.
 */
function calculateVitaminB12(ctx) {
  const consumed = ctx.totals.vitaminB12 || 0;
  if (consumed < 0.5) return null;

  const interactions = [];

  // B12 absorption is saturated via intrinsic factor (IF) at ~1.5µg per meal;
  // the remainder enters via passive diffusion at ~1%.
  let ifAbsorbed = Math.min(consumed * 0.50, 1.5);
  let passiveAbsorbed = consumed * 0.01;

  if (ctx.hasAlcohol) {
    ifAbsorbed *= 0.70;
    interactions.push({ type: 'blocker', agent: 'alcohol', effect: '−30%', note: 'Alcohol damages stomach parietal cells that produce intrinsic factor.' });
  }
  // Coffee/tannins mildly reduce B12 by reducing acid
  if (ctx.hasTannins) {
    ifAbsorbed *= 0.85;
    interactions.push({ type: 'blocker', agent: 'tannins', effect: '−15%', note: 'Tannins reduce gastric acid slightly, impairing B12 release from protein.' });
  }
  const protein = ctx.totals.protein || 0;
  if (protein >= 15) {
    ifAbsorbed *= 1.10;
    interactions.push({ type: 'booster', agent: 'protein', effect: '+10%', note: 'Protein stimulates gastric acid, improving B12 release from food.' });
  }

  const effectiveAmount = parseFloat((ifAbsorbed + passiveAbsorbed).toFixed(3));
  const multiplier = consumed > 0 ? effectiveAmount / consumed : 0;

  return {
    nutrient: 'vitaminB12',
    consumed_amount: parseFloat(consumed.toFixed(3)),
    effective_amount: effectiveAmount,
    multiplier: parseFloat(multiplier.toFixed(3)),
    unit: 'µg',
    confidence: 'medium',
    interactions,
    note: 'B12 absorbs via intrinsic factor (saturates at ~1.5µg/meal) plus 1% passive diffusion.',
  };
}

/**
 * MAGNESIUM
 * ──────────
 * Baseline absorption: 20–45% depending on Mg status (deficient people absorb more).
 * High calcium (>1000mg supplement doses) reduces Mg absorption by ~30%.
 * Phytates mildly reduce Mg (~15%).
 * Vitamin D mildly improves Mg absorption (+10%).
 *
 * Threshold: ≥30mg in a meal.
 */
function calculateMagnesium(ctx) {
  const consumed = ctx.totals.magnesium || 0;
  if (consumed < 30) return null;

  const interactions = [];
  let multiplier = 0.35; // baseline

  const calcium = ctx.totals.calcium || 0;
  if (calcium >= 1000) {
    multiplier *= 0.70; // −30% at very high Ca
    interactions.push({ type: 'blocker', agent: 'very_high_calcium', effect: '−30%', note: 'Supplement-level calcium (>1000mg) competes with magnesium.' });
  }
  if (ctx.hasPhytates) {
    multiplier *= 0.85;
    interactions.push({ type: 'blocker', agent: 'phytates', effect: '−15%', note: 'Phytates mildly bind magnesium.' });
  }
  const vitD = ctx.totals.vitaminD || 0;
  if (vitD >= 5) {
    multiplier *= 1.10;
    interactions.push({ type: 'booster', agent: 'vitamin_d', effect: '+10%', note: 'Vitamin D slightly improves magnesium absorption.' });
  }

  return buildResult('magnesium', consumed, multiplier, interactions, 'medium', 'mg', '');
}

// ─────────────────────────────────────────────────────────────────
// RESULT BUILDER
// ─────────────────────────────────────────────────────────────────

function buildResult(nutrient, consumed, multiplier, interactions, confidence, unit, note) {
  // Cap multiplier at a reasonable ceiling (can't absorb more than chemically possible)
  const clampedMultiplier = Math.min(Math.max(multiplier, 0.01), 3.5);
  const effective = parseFloat((consumed * clampedMultiplier).toFixed(3));

  return {
    nutrient,
    consumed_amount: parseFloat(consumed.toFixed(3)),
    effective_amount: effective,
    multiplier: parseFloat(clampedMultiplier.toFixed(3)),
    unit,
    confidence, // 'high' | 'medium' | 'low'
    interactions,
    note,
  };
}

// ─────────────────────────────────────────────────────────────────
// NARRATIVE SUMMARY GENERATOR (Actionable Templates)
// ─────────────────────────────────────────────────────────────────

function generateNarratives(results) {
  const narratives = [];

  const iron = results.iron;
  if (iron) {
    if (iron.interactions.some(i => i.agent === 'tannins')) {
      narratives.push('🚨 Your meal has good iron, but drinking tea/coffee with it cuts absorption by up to 60%. Have chai 1 hour before or after your meal.');
    } else if (iron.interactions.some(i => i.agent === 'calcium') && iron.consumed_amount > 3) {
      narratives.push('🚨 Calcium in this meal is blocking your iron absorption. Consider separating dairy products from iron-rich foods by 2 hours.');
    }
    
    if (iron.consumed_amount > 2 && !iron.interactions.some(i => i.agent === 'vitamin_c')) {
      narratives.push('💡 Add a squeeze of lemon or tomato to this meal — Vitamin C can triple the iron you actually absorb from plant sources.');
    }
  }

  const vitA = results.vitaminA;
  if (vitA && vitA.interactions.some(i => i.agent === 'low_fat')) {
    narratives.push('🚨 Vitamin A in this meal cannot absorb without fat. Add ghee, dressing, or nuts to this meal so the beta-carotene actually gets absorbed.');
  }

  const vitD = results.vitaminD;
  if (vitD && vitD.interactions.some(i => i.agent === 'low_fat')) {
    narratives.push('🚨 Vitamin D is fat-soluble and needs fat in the same meal to absorb. Add a fat source like oil or dairy to this meal.');
  }

  const vitK = results.vitaminK;
  if (vitK && vitK.interactions.some(i => i.agent === 'low_fat')) {
    narratives.push('🚨 The Vitamin K in these leafy greens needs fat. Add some dressing, ghee, or olive oil to your salad.');
  }

  const folate = results.folate;
  if (folate && folate.interactions.some(i => i.agent === 'high_heat')) {
    narratives.push('💡 High heat destroyed most of the folate in this meal. Prefer lightly steaming or eating leafy greens raw next time.');
  }

  const calcium = results.calcium;
  if (calcium && calcium.consumed_amount > 100 && calcium.interactions.some(i => i.agent === 'low_vitamin_d')) {
    narratives.push('💡 You consumed calcium, but without enough Vitamin D, only ~12% of it can be absorbed. Make sure you are meeting your daily Vitamin D needs.');
  }

  return narratives;
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate effective nutrient absorption for a meal.
 * @param {Array} foods - array of food objects with flat nutrient fields
 * @returns {Object} { results: {}, narratives: [], overallConfidence: '' }
 */
function calculateEffectiveNutrients(foods) {
  const ctx = buildMealContext(foods);

  const calculators = [
    calculateIron,
    calculateCalcium,
    calculateVitaminD,
    calculateVitaminA,
    calculateVitaminK,
    calculateVitaminE,
    calculateZinc,
    calculateVitaminB12,
    calculateMagnesium,
  ];

  const results = {};
  const confidenceLevels = [];

  calculators.forEach(fn => {
    const result = fn(ctx);
    if (result) {
      results[result.nutrient] = result;
      confidenceLevels.push(result.confidence);
    }
  });

  // calculateFolate needs the raw foods array for folate-rich food detection
  const folateResult = calculateFolate(ctx, foods);
  if (folateResult) {
    results[folateResult.nutrient] = folateResult;
    confidenceLevels.push(folateResult.confidence);
  }

  const narratives = generateNarratives(results);

  // Overall confidence = minimum confidence across all results
  const overallConfidence = confidenceLevels.includes('low') ? 'low'
    : confidenceLevels.includes('medium') ? 'medium' : 'high';

  return {
    results,       // keyed by nutrient name
    narratives,    // array of human-readable strings
    overallConfidence,
    mealContext: {
      isHemeSource: ctx.isHemeSource,
      hasTannins: ctx.hasTannins,
      hasPhytates: ctx.hasPhytates,
      hasAlcohol: ctx.hasAlcohol,
    },
  };
}

module.exports = { calculateEffectiveNutrients };
