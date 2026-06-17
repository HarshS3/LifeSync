/**
 * Nutrition Engine
 *
 * Calculates Highly Personalized Daily Recommended Intakes (DRI) based on
 * NIH/WHO standard clinical calculations: Mifflin-St Jeor / Katch-McArdle equations,
 * Physical Activity Level (PAL) multipliers, and custom clinical dietary offsets.
 */

const PAL_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9
};

const GOAL_MODIFIERS = {
  aggressive_loss: -750, // kcal/day — user's explicit choice; engine warns but does not override
  mild_loss: -350,
  maintenance: 0,
  lean_gain: +200,
  aggressive_gain: +350
};

// Calculates Lean Body Mass
const calculateLBM = (weightKg, bodyFat) => {
  return weightKg * (1 - bodyFat / 100);
};

/**
 * Calculate BMR
 * Prefers Katch-McArdle if body fat is known
 * Fallback to Mifflin-St Jeor
 */
const calculateBMR = (sex, age, weightKg, heightCm, bodyFat) => {
  // Guard implausible inputs
  if (!weightKg || weightKg <= 0 || weightKg > 500) return 1500;
  if (!heightCm || heightCm <= 0 || heightCm > 300) return 1500;
  if (bodyFat && (bodyFat < 3 || bodyFat > 60)) bodyFat = null; // extreme BF% makes Katch-McArdle unreliable

  if (bodyFat && bodyFat > 0) {
    // Katch-McArdle Formula (Most accurate, ignores gender/age because LBM represents metabolic tissue)
    const lbm = calculateLBM(weightKg, bodyFat);
    return 370 + (21.6 * lbm);
  } else {
    // Mifflin-St Jeor
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return sex === 'male' ? base + 5 : base - 161;
  }
};

/**
 * Calculate age from date of birth using correct calendar arithmetic.
 * Returns 30 as a safe default if dob is missing or invalid.
 */
function getAge(dob) {
  if (!dob) return 30;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 30;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return Math.max(1, age);
}

/**
 * Calculates customized DRI (Macronutrients & Micronutrients)
 * @param {Object} biologicalProfile - Extracted from User.js
 * @param {number|null} adaptiveTdeeOverride
 * @param {Object|null} labMarkers - User's clinical lab markers (e.g. lipids)
 * @param {number|null} bmrOverride - High-fidelity BMR from body scan (OCR)
 * @param {Object|null} dynamicContext - Live training context: { trainingType, weeklySessionCount }
 */
const calculateDailyTargets = (biologicalProfile, adaptiveTdeeOverride = null, labMarkers = null, bmrOverride = null, dynamicContext = null) => {
  if (!biologicalProfile) return null;

  const {
    biologicalSex,
    dob,
    heightCm,
    weightKg,
    bodyFatPercentage,
    activityLevel,
    metabolicGoal,
    dietaryPreference,
    hypertension,
    insulinSensitivity = 'normal'
  } = biologicalProfile;

  // Basic Validation
  if (!biologicalSex || !heightCm || !weightKg) return null;

  // Calc Age using correct calendar arithmetic
  const age = getAge(dob);

  // 1. Calculate Basal Metabolic Rate (BMR)
  // Use high-fidelity override (e.g. from InBody OCR) if available, otherwise calculate from formula.
  const bmr = bmrOverride ? Number(bmrOverride) : calculateBMR(biologicalSex, age, weightKg, heightCm, bodyFatPercentage);

  // 2. Apply Physical Activity Level (PAL) -> TDEE (Total Daily Energy Expenditure)
  // PAL multipliers (1.2–1.9) already incorporate TEF and NEAT/EAT components.
  // Do NOT add a separate 1.10 TEF factor — that causes double-counting.
  const pal = PAL_MULTIPLIERS[activityLevel] || PAL_MULTIPLIERS.sedentary;
  let baseTdee = bmr * pal;

  // 3. TDEE — use adaptive override if available, otherwise use PAL-adjusted BMR directly (no extra TEF)
  let tdee = adaptiveTdeeOverride ? Number(adaptiveTdeeOverride) : baseTdee;

  // 4. Apply Target Goal Offset
  // Using fixed clinical offsets: -750 for aggressive loss, +350 for aggressive gain.
  const modifier = GOAL_MODIFIERS[metabolicGoal] || 0;
  let targetCalories = tdee + modifier;

  // Floor it at healthy minimums (BMR protects organs)
  if (targetCalories < bmr) {
    targetCalories = bmr; // Don't recommend eating below BMR safely
  }

  if (biologicalSex === 'female' && targetCalories < 1200) targetCalories = 1200;
  if (biologicalSex === 'male' && targetCalories < 1500) targetCalories = 1500;

  // 5. Construct Macronutrients
  // Protein (Clinical evidence-based ranges: 1.6 to 3.1g per kg)
  // dynamicContext.trainingType overrides profile-based protein targets when present.
  // Sources: ISSN 2017 position stand, Witard et al. 2022
  const trainingType = dynamicContext?.trainingType || biologicalProfile.trainingType || null;
  let proteinPerKg = 1.6; // Baseline for active adults

  if (metabolicGoal === 'aggressive_loss' || metabolicGoal === 'mild_loss') {
    // High protein needed in a deficit to preserve lean body mass
    if (trainingType === 'endurance') {
      proteinPerKg = 1.6; // Endurance athletes in deficit: 1.4-1.7g/kg (ISSN)
    } else {
      proteinPerKg = (activityLevel === 'very_active' || activityLevel === 'extra_active') ? 2.8 : 2.4;
    }
    // Cap at empirical limit to avoid exceeding urea cycle capacity
    if (proteinPerKg > 3.1) proteinPerKg = 3.1;
  } else if (metabolicGoal === 'lean_gain' || metabolicGoal === 'aggressive_gain') {
    // Muscle Building zone
    if (trainingType === 'endurance') {
      proteinPerKg = 1.4; // Endurance athletes building phase: 1.2-1.6g/kg
    } else {
      proteinPerKg = 2.2;
      if (activityLevel === 'very_active' || activityLevel === 'extra_active') proteinPerKg = 2.4;
    }
  } else {
    // Maintenance
    if (trainingType === 'endurance') {
      proteinPerKg = (activityLevel === 'sedentary' || activityLevel === 'lightly_active') ? 1.2 : 1.4;
    } else {
      proteinPerKg = (activityLevel === 'sedentary' || activityLevel === 'lightly_active') ? 1.6 : 2.0;
    }
  }

  // Dynamic session-count override: if user is training 5+ sessions/week but profile says
  // lightly_active, their actual protein demand is higher than the PAL-derived baseline.
  // Add 0.1g/kg per session above 4/week (capped at +0.3g/kg to stay conservative).
  const weeklySessionCount = dynamicContext?.weeklySessionCount ?? 0;
  if (weeklySessionCount > 4) {
    const sessionBonus = Math.min(0.3, (weeklySessionCount - 4) * 0.1);
    proteinPerKg = Math.min(3.1, proteinPerKg + sessionBonus);
  }

  const targetProteinGrams = weightKg * proteinPerKg;

  // 6. Construct Fat & Carb Distribution (Adjusted by Metabolic Sensitivity)
  // Standard baseline: 30% fat.
  // Insulin Resistant / Diabetic profiles require higher fat/lower carb to manage spikes.
  let fatPercentage = 0.30;

  if (insulinSensitivity === 'high') {
    fatPercentage = 0.20; // High carb preference for athletes
  } else if (insulinSensitivity === 'low') {
    fatPercentage = 0.35;
  } else if (insulinSensitivity === 'insulin_resistant') {
    fatPercentage = 0.40;
  } else if (insulinSensitivity === 'diabetic') {
    fatPercentage = 0.45;
  }

  // Goal-based secondary adjustment
  if (metabolicGoal === 'aggressive_loss' && insulinSensitivity === 'normal') {
    fatPercentage = 0.25; // drop fat slightly in aggressive cut only if insulin sensitivity is normal
  }

  // Remaining calories to carbs — enforce IOM minimum of 100g for brain function
  const remainingCaloriesForCarbsAndFat = targetCalories - (targetProteinGrams * 4);
  const fatCalories = targetCalories * fatPercentage;
  const targetCarbAsRemainingCalories = remainingCaloriesForCarbsAndFat - fatCalories;
  // IOM minimum: 100g carbs/day to prevent ketosis without medical supervision
  const targetCarbsGrams = Math.max(100, targetCarbAsRemainingCalories / 4);

  // Recalculate fat to ensure macros don't exceed targetCalories after carbs floor is applied
  const targetFatGrams = Math.max(
    20, // absolute fat floor (essential fatty acids)
    Math.round((targetCalories - (targetProteinGrams * 4) - (targetCarbsGrams * 4)) / 9)
  );

  const targetFiber = biologicalSex === 'male' ? (age < 50 ? 38 : 30) : (age < 50 ? 25 : 21);

  // 7. Deep Micronutrient Construction (NIH DRIs)
  let ironTarget = biologicalSex === 'female' && age >= 19 && age <= 50 ? 18 : 8;
  if (dietaryPreference === 'vegan' || dietaryPreference === 'vegetarian') ironTarget = ironTarget * 1.8; // Bioavailability offset

  let calciumTarget = (age >= 51 && biologicalSex === 'female') || age >= 71 ? 1200 : 1000;

  let sodiumTarget = hypertension ? 1500 : 2300; // Blood pressure modifier
  // NIH DRI 2019: males 3400mg, females 2600mg
  let potassiumTarget = biologicalSex === 'male' ? 3400 : 2600;

  let folateTarget = 400; // mcg

  let vitaminB12Target = 2.4;

  let zincTarget = biologicalSex === 'male' ? 11 : 8;

  let vitaminDTarget = age >= 70 ? 20 : 15; // mcg (600 - 800 IU)

  // Additional micronutrient targets
  let magnesiumTarget = biologicalSex === 'male' ? (age >= 31 ? 420 : 400) : (age >= 31 ? 320 : 310); // mg

  let phosphorusTarget = 700; // mg

  let copperTarget = 0.9; // mg

  let manganeseTarget = biologicalSex === 'male' ? 2.3 : 1.8; // mg

  let seleniumTarget = 55; // ug

  let vitaminETarget = 15; // mg

  let omega3Target = biologicalSex === 'male' ? 1600 : 1100; // ALA mg

  // Warn when deficit exceeds safe unsupervised threshold — but do NOT override user's choice
  const deficitWarning = modifier <= -500
    ? `You are in a ${Math.abs(modifier)} kcal/day deficit. This is aggressive — ensure adequate protein (${Math.round(targetProteinGrams)}g/day) to protect muscle mass.`
    : null;

  return {
    tdee: Math.round(tdee),
    bmr: Math.round(bmr),
    deficitWarning,
    targets: {
      calories: Math.round(targetCalories),
      protein: Math.round(targetProteinGrams),
      fat: Math.round(targetFatGrams),
      carbs: Math.round(targetCarbsGrams),
      fiber: targetFiber,

      // Clinical deep limits
      addedSugar: Math.round((targetCalories * 0.1) / 4), // WHO: added sugar < 10% of cals (not total sugar)
      saturatedFat: Math.round((targetCalories * 0.1) / 9), // AHA < 10% of cals from sat fat
      monounsaturatedFat: Math.round((targetCalories * 0.15) / 9), // Clinical baseline ~15-20%
      polyunsaturatedFat: Math.round((targetCalories * 0.08) / 9), // Clinical baseline ~5-10%

      // AHA/ACC Dynamic Cholesterol Target based on user's serum total cholesterol
      // Desirable: < 200 mg/dL  -> 300 mg/day dietary cap (standard)
      // Borderline: 200-239     -> 200 mg/day (AHA borderline-high guidance)
      // High: >= 240 mg/dL      -> 150 mg/day (AHA high-risk/ACC therapeutic lifestyle)
      // Very High (>= 300):     -> 100 mg/day (cardiologist-level restriction)
      ...(() => {
        const serumTotalCholesterol = parseFloat(
          labMarkers?.lipids?.totalCholesterol?.value ||
          labMarkers?.totalCholesterol?.value ||
          0
        );
        let cholesterolTarget = 300;
        let cholesterolRationale = 'Standard AHA dietary cap (<300 mg/day).';
        if (serumTotalCholesterol >= 300) {
          cholesterolTarget = 100;
          cholesterolRationale = `Your serum total cholesterol (${serumTotalCholesterol} mg/dL) is very high. Therapeutic dietary restriction (<100 mg/day) recommended.`;
        } else if (serumTotalCholesterol >= 240) {
          cholesterolTarget = 150;
          cholesterolRationale = `Your serum total cholesterol (${serumTotalCholesterol} mg/dL) is high. AHA recommends reducing dietary cholesterol to <150 mg/day.`;
        } else if (serumTotalCholesterol >= 200) {
          cholesterolTarget = 200;
          cholesterolRationale = `Your serum total cholesterol (${serumTotalCholesterol} mg/dL) is borderline-high. AHA recommends limiting dietary cholesterol to <200 mg/day.`;
        }
        return { cholesterol: cholesterolTarget, cholesterolRationale };
      })(),

      micronutrients: {
        sodium: sodiumTarget, // Keep beneath this
        potassium: potassiumTarget,
        iron: ironTarget,
        calcium: calciumTarget,
        vitaminB12: vitaminB12Target,
        vitaminD: vitaminDTarget,
        vitaminC: biologicalSex === 'male' ? 90 : 75,
        vitaminA: biologicalSex === 'male' ? 900 : 700,
        folate: folateTarget,
        zinc: zincTarget,
        magnesium: magnesiumTarget,
        phosphorus: phosphorusTarget,
        copper: copperTarget,
        manganese: manganeseTarget,
        selenium: seleniumTarget,
        vitaminE: vitaminETarget,
        omega3: omega3Target
      }
    }
  };
};

module.exports = {
  calculateBMR,
  calculateDailyTargets
};
