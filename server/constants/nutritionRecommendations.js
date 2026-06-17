/**
 * Global Nutrition Recommendations Constants
 * ──────────────────────────────────────────
 * Centralized knowledge base for all nutrition calculations
 * All values are evidence-based with citations
 *
 * Used by: nutritionEngine, proteinDistributionEngine, all macro calculations
 */

module.exports = {
  // ─────────────────────────────────────────────────────────────────
  // TDEE CALCULATION MODIFIERS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Caloric deficit/surplus by goal
   * Source: ACSM Position Stand on Nutrition & Athletic Performance
   *
   * These are DAILY adjustments to TDEE
   * - Aggressive cut: ~1.5 lbs/week fat loss
   * - Mild cut: ~0.7 lbs/week fat loss
   * - Lean gain: ~0.6 lbs/week muscle gain
   * - Aggressive bulk: ~1.2 lbs/week weight gain
   */
  CALORIC_MODIFIERS_KCAL_PER_DAY: {
    aggressive_loss: -750,    // Strong deficit
    mild_loss: -350,          // Sustainable deficit
    maintenance: 0,           // Weight stable
    lean_gain: 200,           // Controlled surplus
    aggressive_gain: 350,     // Moderate surplus (avoids excess fat gain)
  },

  /**
   * Katch-McArdle BMR Formula
   * Source: Katch & McArdle (1977)
   * Formula: BMR = 370 + (21.6 × LBM_kg)
   *
   * LBM = Lean Body Mass (total weight - fat mass)
   * Most accurate for normal body composition
   */
  KATCH_MCARDLE: {
    INTERCEPT: 370,          // Base metabolic rate intercept
    SLOPE: 21.6,             // Per kg of lean body mass
    REFERENCE: 'Katch & McArdle (1977)',
    BEST_FOR: 'Normal to athletic body compositions'
  },

  // ─────────────────────────────────────────────────────────────────
  // PROTEIN TARGETS BY TRAINING TYPE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Protein requirements (g/kg body weight) by training type and phase
   * Source: ISSN Position Stand 2017 - Protein & Exercise
   *
   * All values are per kg of body weight (NOT lean body mass for simplicity)
   * - Sedentary: baseline for non-exercisers
   * - Endurance: aerobic athletes (runners, cyclists)
   * - Resistance: strength, hypertrophy focus
   * - Sports: team sports, skill-based (cricket, basketball)
   * - Yoga: flexibility, low-intensity
   * - Beginner: conservative for first-timers
   */
  PROTEIN_TARGETS_G_PER_KG: {
    resistance: {
      maintenance: 1.6,       // ISSN: 1.6-2.0 for muscle maintenance
      cut: 2.2,               // Higher protein preserves muscle during deficit
      bulk: 1.8,              // Supports muscle growth
      deload: 1.6,            // Maintenance during recovery weeks
      reference: 'ISSN 2017'
    },

    endurance: {
      maintenance: 1.6,       // ISSN 2017 Position Stand: 1.4-1.7 g/kg for endurance athletes (not 1.2)
      cut: 1.8,               // Higher during deficit to preserve muscle
      bulk: 1.6,              // Building supporting muscle
      deload: 1.4,
      reference: 'ISSN 2017 Position Stand — endurance athletes 1.4-1.7g/kg'
    },

    sports: {
      maintenance: 1.4,       // Cricket, basketball, sports-specific
      cut: 1.8,               // Maintain performance during weight loss
      bulk: 1.6,
      deload: 1.4,
      reference: 'Sport-specific adaptations'
    },

    mixed: {
      maintenance: 1.6,       // Balanced resistance + endurance
      cut: 2.0,
      bulk: 1.8,
      deload: 1.6,
      reference: 'Combined training modality'
    },

    yoga: {
      maintenance: 1.2,       // Flexibility focus, lower protein needs
      cut: 1.4,
      bulk: 1.4,
      deload: 1.2,
      reference: 'Low-intensity movement'
    },

    beginner: {
      maintenance: 1.6,       // Start conservative, adjust based on training
      cut: 2.0,               // Higher during cut to preserve muscle
      bulk: 1.8,
      deload: 1.6,
      reference: 'Beginner protocol'
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // CARBOHYDRATE TARGETS BY TRAINING TYPE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Carbohydrate requirements (g/kg) by training type
   * Source: IOC Consensus Statement on Relative Energy Deficiency in Sport
   *
   * Higher for aerobic/endurance, lower for strength training
   * Adjust based on training volume (hours/week)
   */
  // CARB_TARGETS_G_PER_KG and FAT_TARGETS_G_PER_KG removed — these tables were defined but
  // never consumed by nutritionEngine.js (which uses percentage-based macro splits instead).
  // Keeping them caused developer confusion about which approach was authoritative.

  // ─────────────────────────────────────────────────────────────────
  // MICRONUTRIENT RDA (RECOMMENDED DIETARY ALLOWANCE)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Daily micronutrient targets for healthy adults
   * Source: USDA/WHO/ISSN
   */
  MICRONUTRIENT_TARGETS: {
    // Minerals
    calcium: { mg: 1000, note: 'Adult RDA. Higher for women >50 (1200mg)' },
    iron: { mg: 18, note: 'Women 19-50. Men 8mg. Post-menopausal women 8mg' },
    magnesium: { mg: 420, note: 'Adult men RDA. Women 320mg' },
    potassium: { mg: 3500, note: 'Adequate intake level' },
    zinc: { mg: 11, note: 'Adult men RDA. Women 8mg' },
    phosphorus: { mg: 700, note: 'Adult RDA' },
    copper: { mg: 0.9, note: 'Adult RDA' },
    selenium: { µg: 55, note: 'Adult RDA' },
    manganese: { mg: 2.3, note: 'Adult men RDA. Women 1.8mg' },
    sodium: { mg: 1500, note: 'Adequate intake (lower is better, max 2300)' },

    // Fat-soluble vitamins
    vitaminA: { µg: 900, note: 'Adult men. Women 700µg (RAE - Retinol Activity Equivalents)' },
    vitaminD: { µg: 15, note: 'IOM RDA 15µg (600 IU) for most. Varies by sun exposure' },
    vitaminE: { mg: 15, note: 'Adult RDA' },
    vitaminK: { µg: 120, note: 'Adult men RDA. Women 90µg' },

    // Water-soluble vitamins (B-complex)
    vitaminB1_thiamine: { mg: 1.2, note: 'Adult men. Women 1.1mg' },
    vitaminB2_riboflavin: { mg: 1.3, note: 'Adult men. Women 1.1mg' },
    vitaminB3_niacin: { mg: 16, note: 'Adult men (NE units). Women 14mg' },
    vitaminB5_pantothenic: { mg: 5, note: 'Adult AI' },
    vitaminB6: { mg: 1.3, note: 'Adults 19-50' },
    vitaminB7_biotin: { µg: 30, note: 'Adult AI' },
    vitaminB9_folate: { µg: 400, note: 'Adult DFE. Pregnancy 600µg (critical for neural tube)' },
    vitaminB12: { µg: 2.4, note: 'Adult RDA' },
    vitaminC: { mg: 90, note: 'Adult men. Women 75mg' },

    // Special cases
    choline: { mg: 550, note: 'Adult men. Women 425mg' },
    inositol: { mg: 0, note: 'No RDA (myo-inositol helpful for PCOS: 2-4g/day)' },
  },

  // ─────────────────────────────────────────────────────────────────
  // BIOAVAILABILITY CONSTANTS
  // ─────────────────────────────────────────────────────────────────

  /**
   * How much of consumed nutrients the body actually absorbs
   * These are baseline values; interactions modify them
   */
  NUTRIENT_BIOAVAILABILITY_BASELINE: {
    iron_heme: 0.25,           // 25% absorption (animal sources)
    iron_non_heme: 0.10,       // 10% absorption (plant sources)
    calcium: 0.32,             // 32% with adequate Vitamin D
    vitaminD: 0.65,            // 65% with adequate fat
    vitaminA_retinol: 0.75,    // 75% (animal source)
    vitaminA_beta_carotene: 0.12, // 12% (plant source)
    zinc: 0.35,                // 35% absorption
    magnesium: 0.45,           // 45% absorption
  },

  /**
   * Interactions that modify bioavailability
   */
  BIOAVAILABILITY_MODIFIERS: {
    iron_vitamin_c: { multiplier: 3.0, note: 'Vitamin C enhances iron absorption 3x' },
    iron_calcium_antagonist: { multiplier: 0.8, note: 'High calcium reduces iron absorption ~20%' },
    iron_phytate_antagonist: { multiplier: 0.7, note: 'Phytates reduce iron absorption ~30%' },
    calcium_vitamin_d: { multiplier: 3.0, note: 'Vitamin D enables calcium transport' },
    vitaminD_fat_synergy: { multiplier: 0.5, note: 'Without fat, Vit D absorption drops 50%' },
    zinc_phytate_antagonist: { multiplier: 0.8, note: 'Phytates reduce zinc absorption ~20%' },
  },

  // ─────────────────────────────────────────────────────────────────
  // MEAL COMPOSITION GUIDELINES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Post-workout meal guidelines
   * Source: ISSN 2017
   */
  POST_WORKOUT_MEAL: {
    timing: '0-2 hours after training',
    protein: '0.25g/kg body weight',
    carbs: '0.8-1.2g/kg body weight',
    fat: '0.1g/kg body weight (or just include in food)',
    reasoning: 'Spike amino acids for MPS (muscle protein synthesis), replenish glycogen',
    examples: [
      'Chicken rice + vegetables',
      'Paneer with roti + dal',
      'Egg whites with toast + banana',
      'Protein shake with fruit',
    ]
  },

  /**
   * Protein per meal optimal amount
   * Source: ISSN 2017 - MPS (Muscle Protein Synthesis)
   */
  PROTEIN_PER_MEAL_OPTIMAL: {
    threshold: 20,  // Grams
    ceiling: 40,    // Grams (MPS caps out around 40g for most people)
    note: 'Spreading protein across meals may be beneficial for muscle growth',
    spread_example: {
      breakfast: 30,
      lunch: 40,
      dinner: 40,
      snacks: 10,
      total: 120,
    }
  },

  /**
   * Meal timing for different goals
   */
  MEAL_TIMING: {
    fat_loss: '4-5 meals/day, smaller portions, stable blood sugar',
    muscle_gain: '3-4 meals/day, +protein, adequate calories',
    maintenance: '3 meals/day, flexible',
    endurance: '3 meals + 1-2 snacks, carb-focused',
  },

  // ─────────────────────────────────────────────────────────────────
  // NUTRIENT INTERACTION RULES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Critical nutrient pairs that interact
   */
  CRITICAL_INTERACTIONS: [
    {
      type: 'antagonistic',
      nutrients: ['iron', 'calcium'],
      effect: 'Calcium inhibits iron absorption',
      recommendation: 'Separate iron-rich meals from high-calcium by 2+ hours if possible',
      severity: 'high'
    },
    {
      type: 'synergistic',
      nutrients: ['iron', 'vitaminC'],
      effect: 'Vitamin C enhances iron absorption 3x',
      recommendation: 'Add lemon juice, orange, or tomato to iron-rich meals',
      severity: 'high'
    },
    {
      type: 'synergistic',
      nutrients: ['calcium', 'vitaminD'],
      effect: 'Vitamin D enables calcium absorption',
      recommendation: 'Ensure adequate Vitamin D (sun exposure, supplements, fatty fish)',
      severity: 'high'
    },
    {
      type: 'antagonistic',
      nutrients: ['zinc', 'phytates'],
      effect: 'Phytates reduce zinc absorption ~20%',
      recommendation: 'Soak/sprout legumes and grains to reduce phytates',
      severity: 'medium'
    },
  ],

  // ─────────────────────────────────────────────────────────────────
  // GENERAL GUIDELINES
  // ─────────────────────────────────────────────────────────────────

  GENERAL_GUIDELINES: {
    fiber_target_g_per_day: 25,
    sugar_max_percent_calories: 0.10,  // No more than 10% from added sugars
    sodium_max_mg_per_day: 2300,
    water_ml_per_kg: 35,  // ~35ml per kg body weight as baseline
    meal_frequency: '3-4 meals for most (varies by preference)',
  },

  // ─────────────────────────────────────────────────────────────────
  // CITATIONS & REFERENCES
  // ─────────────────────────────────────────────────────────────────

  REFERENCES: [
    'ISSN Position Stand (2017) - Protein & Exercise',
    'ACSM Position Stand - Nutrition & Athletic Performance',
    'Katch & McArdle (1977) - BMR Formula',
    'Hurrell & Egli (2010) - Iron Bioavailability',
    'Holick (2007) - Vitamin D Metabolism',
    'IOC Consensus - Relative Energy Deficiency in Sport',
    'USDA/WHO - RDA & AI Guidelines',
  ],
};
