/**
 * Disease-Specific Nutrition Recommendation Engine
 * ─────────────────────────────────────────────────
 * Provides medical condition-aware nutrition guidance
 *
 * Conditions supported:
 *  - Diabetes Type 1 & 2
 *  - Chronic Kidney Disease (CKD) with stages
 *  - Pregnancy (by trimester)
 *  - PCOS
 *  - Hypertension
 *  - Celiac / Gluten sensitivity
 */

const DISEASE_PROTOCOLS = {
  diabetes: {
    type_1: {
      protein_target: { min: 1.0, max: 1.5, unit: 'g/kg', note: 'Standard protein for T1D' },
      carb_strategy: 'carb_counting_critical',
      carb_timing: 'distribute_evenly_with_insulin',
      gi_focus: 'low_glycemic_load',
      meal_frequency: '3-4 meals + snacks',
      warnings: [
        'High GI foods (white bread, sugary drinks, candy)',
        'Rapid carbs without protein/fat buffer',
        'Skipping meals with insulin dosing',
        'Alcohol without food'
      ],
      key_nutrients: ['chromium', 'magnesium', 'zinc'],
      resources: ['carb counting guide', 'GI chart', 'insulin timing'],
    },

    type_2: {
      protein_target: { min: 1.2, max: 1.6, unit: 'g/kg', note: 'Higher protein aids satiety' },
      carb_strategy: 'low_glycemic_load',
      carb_timing: 'with_fiber_and_protein',
      gi_focus: 'prioritize_whole_grains',
      meal_frequency: '3 meals, minimal snacks (aim for weight loss)',
      warnings: [
        'Refined carbs and sugar',
        'Large meals (split into smaller portions)',
        'Liquid calories (sugary drinks, juices)',
        'High sodium (can raise BP)'
      ],
      key_nutrients: ['fiber', 'chromium', 'magnesium', 'cinnamon'],
      resources: ['diabetes prevention program', 'low GI foods list', 'weight loss strategies'],
    },
  },

  ckd: {
    stage_1: {
      // eGFR ≥ 90
      protein_target: { min: 0.8, max: 1.0, unit: 'g/kg', note: 'Normal protein, monitor progression' },
      potassium: { target: 2500, unit: 'mg/day', note: 'Monitor, not usually restricted' },
      phosphorus: { target: 1000, unit: 'mg/day', note: 'Monitor' },
      sodium: { target: 2300, unit: 'mg/day', note: 'General hypertension prevention' },
      fluid: 'no restriction',
      monitoring: 'annual labs',
    },

    stage_2: {
      // eGFR 60-89
      protein_target: { min: 0.8, max: 1.0, unit: 'g/kg', note: 'Reduce slightly' },
      potassium: { target: 2500, unit: 'mg/day', note: 'Begin monitoring' },
      phosphorus: { target: 1000, unit: 'mg/day', note: 'Monitor' },
      sodium: { target: 2000, unit: 'mg/day', note: 'Lower for BP control' },
      fluid: 'no restriction',
      monitoring: 'every 6 months',
      warnings: ['High potassium foods (banana, dal, nuts, coconut water)']
    },

    stage_3a: {
      // eGFR 45-59
      protein_target: { min: 0.8, max: 0.9, unit: 'g/kg', note: 'Reduce to slow progression' },
      potassium: { target: 2000, unit: 'mg/day', note: 'RESTRICT - monitor blood levels' },
      phosphorus: { target: 900, unit: 'mg/day', note: 'RESTRICT - avoid dairy, process meats' },
      sodium: { target: 1500, unit: 'mg/day', note: 'Strict control' },
      fluid: 'no restriction',
      monitoring: 'every 3 months',
      warnings: [
        'High potassium: banana, dal, spinach, nuts, coconut',
        'High phosphorus: milk, cheese, paneer, chicken, processed meats',
        'Phosphate additives in packaged foods'
      ],
      foods_to_limit: ['dairy', 'legumes', 'nuts', 'whole grains', 'potatoes'],
      foods_to_choose: ['white rice', 'white bread', 'lean meat in moderation', 'egg whites'],
    },

    stage_3b: {
      // eGFR 30-44
      protein_target: { min: 0.6, max: 0.8, unit: 'g/kg', note: 'Further reduction needed' },
      potassium: { target: 1500, unit: 'mg/day', note: 'STRICT - high risk of hyperkalemia' },
      phosphorus: { target: 800, unit: 'mg/day', note: 'STRICT - consider binders' },
      sodium: { target: 1500, unit: 'mg/day', note: 'Strict' },
      fluid: 'usually not restricted (depends on labs)',
      monitoring: 'monthly labs',
      warnings: [
        'CRITICAL: High potassium can cause cardiac arrhythmia',
        'Avoid: banana, avocado, tomato sauce, cooked spinach',
        'Avoid: dairy, whole grains, nuts, legumes',
        'Read labels for phosphate additives'
      ],
      medical_support: 'Consider referral to renal dietitian'
    },

    stage_4: {
      // eGFR 15-29
      protein_target: { min: 0.6, max: 0.8, unit: 'g/kg', note: 'Severe restriction' },
      potassium: { target: 1500, unit: 'mg/day', note: 'STRICT - lab-directed' },
      phosphorus: { target: 600, unit: 'mg/day', note: 'STRICT - likely needs binders' },
      sodium: { target: 1000, unit: 'mg/day', note: 'Very strict' },
      fluid: 'restricted (24h urine output + 500ml)',
      monitoring: 'monthly + specialist visits',
      warnings: [
        'CRITICAL: Requires nephrologist supervision',
        'Very limited food choices',
        'Likely needs dialysis preparation discussion',
        'Supplements may be restricted'
      ],
      medical_support: 'MUST see renal dietitian. Prepare for dialysis/transplant.',
    },

    stage_5: {
      // eGFR < 15 (on dialysis or transplant)
      requires_specialist: true,
      note: 'Nutrition protocols change with dialysis type (HD vs PD)',
      medical_support: 'Managed by nephrologist + renal dietitian',
    },
  },

  pregnancy: {
    trimester_1: {
      energy_extra: { kcal: 0, note: 'No extra calories first trimester' },
      protein_extra: { g: 0, note: 'Normal protein needs' },
      folate_critical: true,
      folate_target: { µg: 600, note: 'CRITICAL - neural tube defects prevented by folate' },
      calcium: { mg: 1000, note: 'Maintain normal intake' },
      iron: { mg: 27, note: 'Increased from 18mg (non-pregnant)' },
      warnings: ['Raw/undercooked meat', 'Soft cheeses', 'High mercury fish', 'Excess caffeine (>200mg)'],
      key_foods: ['leafy greens (folate)', 'lean meat (B12, iron)', 'dairy (calcium)'],
    },

    trimester_2: {
      energy_extra: { kcal: 300, note: 'Add ~1 bowl rice or 2 roti' },
      protein_extra: { g: 10, note: '+10g per day for fetal growth' },
      folate_critical: true,
      folate_target: { µg: 600 },
      calcium: { mg: 1000, note: 'Critical for fetal bone development' },
      iron: { mg: 27, note: 'Anemia common in pregnancy' },
      warnings: ['Same as T1 + watch for gestational diabetes (GDM screening)'],
    },

    trimester_3: {
      energy_extra: { kcal: 450, note: 'Add ~1.5 bowl rice or 3 roti' },
      protein_extra: { g: 10, note: 'Continued protein for growth' },
      folate: { µg: 600 },
      calcium: { mg: 1000, note: 'Critical - fetal needs increase' },
      iron: { mg: 27, note: 'Risk of anemia highest' },
      warnings: [
        'Watch for swelling (sodium control)',
        'Blood pressure monitoring critical (preeclampsia risk)',
        'GDM management if diagnosed',
      ],
      extra_monitoring: ['weekly BP', 'glucose tolerance if GDM', 'weight gain tracking'],
    },
  },

  pcos: {
    // Polycystic Ovary Syndrome
    protein_target: { min: 1.4, max: 1.8, unit: 'g/kg', note: 'Higher protein aids satiety + hormone balance' },
    carb_strategy: 'low_glycemic_load',
    carb_timing: 'with_protein_and_fat',
    gi_focus: 'very_strict',
    inositol: { note: 'Myo-inositol 2-4g/day helpful (supplement or whole grains)' },
    weight_management: 'even 5-10% weight loss improves insulin sensitivity',
    warnings: [
      'Refined carbs exacerbate insulin resistance',
      'Inflammatory foods (processed, high omega-6)',
      'Dairy may trigger symptoms in some',
      'Caffeine can worsen anxiety'
    ],
    key_focus: ['insulin sensitivity', 'anti-inflammatory foods', 'regular protein intake'],
  },

  hypertension: {
    sodium_target: { mg: 1500, note: 'Keep low for BP control' },
    potassium_target: { mg: 3500, note: 'Helps offset sodium' },
    calcium_target: { mg: 1200, note: 'Associated with lower BP' },
    magnesium_target: { mg: 420, note: 'Vasodilator effect' },
    protein: { unit: 'g/kg', note: 'Plant > animal protein better for BP' },
    alcohol: 'limit to 1 drink/day for women',
    warnings: [
      'High sodium processed foods',
      'Canned soups/broths',
      'Pickled items',
      'High-fat meats',
      'Added salt in cooking'
    ],
    dietary_pattern: 'DASH diet recommended (vegetables, fruits, whole grains, lean protein)',
  },

  celiac: {
    gluten_free: 'STRICT - even trace amounts can damage intestines',
    nutrient_deficiencies_common: [
      'Iron (from damaged villi)',
      'Vitamin B12',
      'Folate',
      'Calcium',
      'Vitamin D',
      'Zinc'
    ],
    foods_to_avoid: [
      'Wheat, barley, rye (all bread, pasta, cereals with these)',
      'Some oats (cross-contamination)',
      'Processed foods with hidden gluten',
      'Soy sauce, malt vinegar, many sauces'
    ],
    safe_options: [
      'Rice, corn, tapioca, potatoes (gluten-free grains)',
      'Certified gluten-free products',
      'Naturally gluten-free: vegetables, fruits, meat, dairy, eggs'
    ],
    supplementation_important: 'Iron, B12, folate often needed during healing',
    medical_support: 'Consider GI specialist + dietitian (gut healing takes 6-12 months)',
  },
};

// Helper to get disease protocol
async function getDiseaseProtocol(conditionName, severity = null) {
  const protocol = DISEASE_PROTOCOLS[conditionName];

  if (!protocol) {
    return {
      found: false,
      message: `No protocol available for ${conditionName}. Please consult a healthcare provider.`
    };
  }

  // If condition has stages/types (like CKD, diabetes), get specific one
  if (severity && protocol[severity]) {
    return {
      found: true,
      condition: conditionName,
      severity,
      protocol: protocol[severity],
    };
  }

  return {
    found: true,
    condition: conditionName,
    protocol,
  };
}

// Validate protein target for medical conditions
async function getProteinTargetWithMedicalContext(userId, baseProteinPerKg) {
  const User = require('../../models/User');
  const user = await User.findById(userId).select('medicalProfile').lean();

  if (!user?.medicalProfile?.conditions || user.medicalProfile.conditions.length === 0) {
    return {
      target: baseProteinPerKg,
      reason: 'No medical conditions affecting protein',
      adjusted: false,
    };
  }

  const conditions = user.medicalProfile.conditions;
  let adjustedTarget = baseProteinPerKg;
  let reason = [];
  let isRestricted = false;

  for (const condition of conditions) {
    const protocol = await getDiseaseProtocol(condition.name, condition.severity);

    if (!protocol.found) continue;

    const proto = protocol.protocol;

    // Check if protein is restricted
    if (proto.protein_target?.max) {
      if (proto.protein_target.max < baseProteinPerKg) {
        adjustedTarget = Math.min(adjustedTarget, proto.protein_target.max);
        reason.push(`${condition.name} (${condition.severity}): max ${proto.protein_target.max}g/kg`);
        isRestricted = true;
      }
    }

    if (proto.protein?.unit === 'g/kg' && proto.protein?.note) {
      reason.push(proto.protein.note);
    }
  }

  return {
    target: adjustedTarget,
    reason: reason.join(' | '),
    adjusted: isRestricted,
    warnings: getProteinWarnings(user.medicalProfile.conditions),
  };
}

// Get critical warnings for conditions
function getProteinWarnings(conditions) {
  const warnings = [];

  conditions?.forEach(condition => {
    if (condition.name === 'ckd' && ['stage_3b', 'stage_4'].includes(condition.severity)) {
      warnings.push({
        level: 'critical',
        message: `CKD ${condition.severity}: Excess protein stresses kidneys. ${DISEASE_PROTOCOLS.ckd[condition.severity]?.protein_target?.note}`,
      });
    }

    if (condition.name === 'diabetes' && condition.severity === 'type_1') {
      warnings.push({
        level: 'high',
        message: 'Type 1 Diabetes: Coordinate protein intake with insulin dosing. Carb counting is critical.',
      });
    }

    if (condition.name === 'pregnancy') {
      warnings.push({
        level: 'high',
        message: `Pregnancy: Ensure adequate folate (600µg), calcium (1000mg), iron (27mg). Monitor blood sugar.`,
      });
    }
  });

  return warnings;
}

// Check if nutrient target needs adjustment for conditions
async function getNutrientTargetWithMedicalContext(userId, nutrient, baseTarget) {
  const User = require('../../models/User');
  const user = await User.findById(userId).select('medicalProfile').lean();

  if (!user?.medicalProfile?.conditions) {
    return { target: baseTarget, adjusted: false, reason: '' };
  }

  const conditions = user.medicalProfile.conditions;
  let adjustedTarget = baseTarget;
  let reason = [];

  for (const condition of conditions) {
    const protocol = await getDiseaseProtocol(condition.name, condition.severity);
    if (!protocol.found) continue;

    const proto = protocol.protocol;

    // Check for specific nutrient targets
    if (nutrient === 'potassium' && proto.potassium) {
      adjustedTarget = proto.potassium.target || baseTarget;
      reason.push(`${condition.name}: ${proto.potassium.note}`);
    }

    if (nutrient === 'phosphorus' && proto.phosphorus) {
      adjustedTarget = proto.phosphorus.target || baseTarget;
      reason.push(`${condition.name}: ${proto.phosphorus.note}`);
    }

    if (nutrient === 'sodium' && proto.sodium) {
      adjustedTarget = proto.sodium.target || baseTarget;
      reason.push(`${condition.name}: ${proto.sodium.note}`);
    }

    if (nutrient === 'folate' && proto.folate_critical) {
      adjustedTarget = 600;  // Pregnancy requires 600µg
      reason.push('Pregnancy: Critical for fetal neural development');
    }

    if (nutrient === 'calcium' && proto.calcium) {
      adjustedTarget = proto.calcium.mg || baseTarget;
      reason.push(`${condition.name}: ${proto.calcium.note}`);
    }
  }

  return {
    target: adjustedTarget,
    adjusted: adjustedTarget !== baseTarget,
    reason: reason.join(' | '),
  };
}

module.exports = {
  DISEASE_PROTOCOLS,
  getDiseaseProtocol,
  getProteinTargetWithMedicalContext,
  getNutrientTargetWithMedicalContext,
  getProteinWarnings,
};
