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
  aggressive_loss: -750, // kcal/day
  mild_loss: -350,
  maintenance: 0,
  lean_gain: +300,
  aggressive_gain: +600
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
 * Calculates customized DRI (Macronutrients & Micronutrients)
 * @param {Object} biologicalProfile - Extracted from User.js
 */
const calculateDailyTargets = (biologicalProfile, adaptiveTdeeOverride = null) => {
  if (!biologicalProfile) return null;

  const { 
    biologicalSex, 
    dob, 
    heightCm, 
    weightKg, 
    bodyFatPercentage, 
    activityLevel, 
    metabolicGoal, 
    pregnancyStatus, 
    dietaryPreference, 
    hypertension 
  } = biologicalProfile;

  // Basic Validation
  if (!biologicalSex || !heightCm || !weightKg) return null;

  // Calc Age
  let age = 30; // Default fallback
  if (dob) {
    const diff_ms = Date.now() - new Date(dob).getTime();
    const age_dt = new Date(diff_ms);
    age = Math.abs(age_dt.getUTCFullYear() - 1970);
  }

  // 1. Calculate Basal Metabolic Rate (BMR)
  const bmr = calculateBMR(biologicalSex, age, weightKg, heightCm, bodyFatPercentage);

  // 2. Apply Physical Activity Level (PAL) -> TDEE (Total Daily Energy Expenditure)
  // PAL includes Exercise Activity Thermogenesis (EAT) and Non-Exercise Activity Thermogenesis (NEAT).
  const pal = PAL_MULTIPLIERS[activityLevel] || PAL_MULTIPLIERS.sedentary;
  let baseTdee = bmr * pal;

  // 3. Add Thermic Effect of Food (TEF) - roughly 10% of total energy intake
  // If we have an adaptive TDEE override, it already includes activity and TEF.
  let tdee = adaptiveTdeeOverride ? Number(adaptiveTdeeOverride) : baseTdee * 1.10;

  // 4. Apply Pregnancy Modifiers (ACOG guidelines)
  if (biologicalSex === 'female') {
    if (pregnancyStatus === 'pregnant_trimester_2') tdee += 340;
    if (pregnancyStatus === 'pregnant_trimester_3') tdee += 452;
    if (pregnancyStatus === 'lactating') tdee += 500;
  }

  // 5. Apply Target Goal Offset
  // Using fixed clinical offsets: -500 for steady loss, +300 for lean gain.
  // We can eventually replace this with the Adaptive TDEE delta.
  const modifier = GOAL_MODIFIERS[metabolicGoal] || 0;
  let targetCalories = tdee + modifier;

  // Floor it at healthy minimums (BMR protects organs)
  if (targetCalories < bmr) {
    targetCalories = bmr; // Don't recommend eating below BMR safely
  }
  
  if (biologicalSex === 'female' && targetCalories < 1200) targetCalories = 1200;
  if (biologicalSex === 'male' && targetCalories < 1500) targetCalories = 1500;

  // 6. Construct Macronutrients
  // Protein (Clinical evidence-based ranges: 1.6 to 3.1g per kg)
  let proteinPerKg = 1.6; // Baseline for active adults

  if (metabolicGoal === 'aggressive_loss' || metabolicGoal === 'mild_loss') {
    // High protein needed in a deficit to preserve lean body mass
    proteinPerKg = (activityLevel === 'very_active' || activityLevel === 'extra_active') ? 2.8 : 2.4;
    // Cap at empirical limit to avoid exceeding urea cycle capacity
    if (proteinPerKg > 3.1) proteinPerKg = 3.1;
  } else if (metabolicGoal === 'lean_gain' || metabolicGoal === 'aggressive_gain') {
    // Muscle Building zone
    proteinPerKg = 2.2;
    if (activityLevel === 'very_active' || activityLevel === 'extra_active') proteinPerKg = 2.4;
  } else {
    // Maintenance
    proteinPerKg = (activityLevel === 'sedentary' || activityLevel === 'lightly_active') ? 1.6 : 2.0;
  }

  if (pregnancyStatus && pregnancyStatus !== 'none') proteinPerKg += 0.3;

  const targetProteinGrams = weightKg * proteinPerKg;
  
  // Keep fat to a hormonal baseline (approx 25-30% of target calories)
  let fatPercentage = 0.30;
  if (metabolicGoal === 'aggressive_loss') fatPercentage = 0.25; // drop fat slightly in aggressive cut
  const targetFatGrams = (targetCalories * fatPercentage) / 9; 
  
  // Remaining calories to carbs
  const targetCarbAsRemainingCalories = targetCalories - ((targetProteinGrams * 4) + (targetFatGrams * 9));
  // If carbs drop below 0 (can happen if protein target is very high and cal target is BMR), set to minimal
  const targetCarbsGrams = Math.max(30, targetCarbAsRemainingCalories / 4);

  const targetFiber = biologicalSex === 'male' ? (age < 50 ? 38 : 30) : (age < 50 ? 25 : 21);

  // 6. Deep Micronutrient Construction (NIH DRIs)
  let ironTarget = biologicalSex === 'female' && age >= 19 && age <= 50 ? 18 : 8;
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') ironTarget = 27; // Massive pregnancy bump
  if (biologicalSex === 'female' && pregnancyStatus === 'lactating') ironTarget = 9;
  if (dietaryPreference === 'vegan' || dietaryPreference === 'vegetarian') ironTarget = ironTarget * 1.8; // Bioavailability offset

  let calciumTarget = (age >= 51 && biologicalSex === 'female') || age >= 71 ? 1200 : 1000;
  
  let sodiumTarget = hypertension ? 1500 : 2300; // Blood pressure modifier
  let potassiumTarget = biologicalSex === 'male' ? 3400 : 2600;
  
  let folateTarget = 400; // mcg
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') folateTarget = 600;
  if (pregnancyStatus === 'lactating') folateTarget = 500;

  let vitaminB12Target = 2.4; 
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') vitaminB12Target = 2.6;
  if (pregnancyStatus === 'lactating') vitaminB12Target = 2.8;
  // If vegan/vegetarian, we don't change the biological DRI, but we note it's harder to get.

  let zincTarget = biologicalSex === 'male' ? 11 : 8;
  if (pregnancyStatus !== 'none') zincTarget = 11;

  let vitaminDTarget = age >= 70 ? 20 : 15; // mcg (600 - 800 IU)

  // Additional micronutrient targets
  let magnesiumTarget = biologicalSex === 'male' ? (age >= 31 ? 420 : 400) : (age >= 31 ? 320 : 310); // mg
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') magnesiumTarget = 350;
  if (pregnancyStatus === 'lactating') magnesiumTarget = 310;

  let phosphorusTarget = 700; // mg

  let copperTarget = 0.9; // mg
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') copperTarget = 1.0;
  if (pregnancyStatus === 'lactating') copperTarget = 1.3;

  let manganeseTarget = biologicalSex === 'male' ? 2.3 : 1.8; // mg
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') manganeseTarget = 2.0;
  if (pregnancyStatus === 'lactating') manganeseTarget = 2.6;

  let seleniumTarget = 55; // ug
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') seleniumTarget = 60;
  if (pregnancyStatus === 'lactating') seleniumTarget = 70;

  let vitaminETarget = 15; // mg
  if (pregnancyStatus !== 'none' && pregnancyStatus !== 'lactating') vitaminETarget = 15;
  if (pregnancyStatus === 'lactating') vitaminETarget = 19;

  let omega3Target = biologicalSex === 'male' ? 1600 : 1100; // ALA mg

  return {
    tdee: Math.round(tdee),
    bmr: Math.round(bmr),
    targets: {
      calories: Math.round(targetCalories),
      protein: Math.round(targetProteinGrams),
      fat: Math.round(targetFatGrams),
      carbs: Math.round(targetCarbsGrams),
      fiber: targetFiber,
      
      // Clinical deep limits
      sugar: Math.round((targetCalories * 0.1) / 4), // WHO recommends keeping added sugar < 10% of cals
      saturatedFat: Math.round((targetCalories * 0.1) / 9), // AHA < 10% of cals from sat fat
      monounsaturatedFat: Math.round((targetCalories * 0.15) / 9), // Clinical baseline ~15-20%
      polyunsaturatedFat: Math.round((targetCalories * 0.08) / 9), // Clinical baseline ~5-10%
      cholesterol: 300, // mg (standard clinical cap)

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
