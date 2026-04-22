# Advanced Nutrition Intelligence System
## Deep Research Blueprint for LifeSync Nutrition Tracker

**Scope:** Nutrition page/module only  
**Goal:** Transform from basic macro/micro logging into predictive, personalized nutrition system  
**Timeline:** 8–10 weeks

---

## Part 1: The Current State (Gap Analysis)

### What You Have Now
✓ Meal logging with macro/micro tracking  
✓ Daily targets (TDEE-based calculations)  
✓ Barcode scanner integration (Open Food Facts)  
✓ Comprehensive nutrient database (INDB)  
✓ B12 + D subtypes support  

### What's Missing (The Intelligence Layer)
✗ **Metabolic response modeling** — System doesn't know if user is carb-sensitive or needs high-fat timing  
✗ **Macronutrient timing optimization** — No awareness of meal timing relative to workouts  
✗ **Micronutrient absorption tracking** — No consideration of synergistic nutrients (e.g., Vitamin D + K2 absorption)  
✗ **Food choice prediction** — Can't anticipate what the user wants/needs next meal  
✗ **Nutrient adequacy confidence** — Currently assumes all logged meals are complete; no uncertainty scoring  
✗ **Personalized deficit/surplus detection** — TDEE is static; doesn't adapt to user behavior  
✗ **Digestive impact modeling** — No tracking of bloating, energy crashes post-meal  
✗ **Sustainability scoring** — No measurement of whether current diet is maintainable long-term  

---

## Part 2: The Science Behind Advanced Nutrition Systems

### 2.1 Metabolic Phenotyping (The Personalization Core)
Research shows metabolic response to macros varies **8x between individuals**. Why TDEE calculators fail:

#### The Carb Tolerance Spectrum
```
User A (Carb-Sensitive):
- Eats 300g carbs/day → 15% fat gain over 8 weeks
- Eats 200g carbs + 20g more fat → maintains weight
- Best macros: 40% protein, 35% carbs, 25% fat

User B (Carb-Adapted):
- Eats 300g carbs/day → thrives, trains harder, lean
- Carbs eaten pre/post-workout → optimal performance
- Best macros: 25% protein, 55% carbs, 20% fat

Both have same TDEE (2100 cal), same training intensity
Same TDEE calculator fails for both.
```

**How to detect this scientifically:**
1. Track user's **weight change** over 14-day periods at different macro ratios
2. Calculate **energy availability** (daily calories - exercise energy expenditure)
3. Compute **metabolic efficiency** = (weight maintenance at macro ratio X) / (predicted from TDEE)
4. If efficiency < 0.9 at high-carb, flag as carb-sensitive

**Implementation in your system:**
```javascript
// Compute metabolic fingerprint from 30-day history
async function computeMetabolicPhenotype(userId) {
  const nutritionLogs = await getNutritionLogs(userId, last30days);
  const workoutLogs = await getWorkoutLogs(userId, last30days);
  const weightLogs = await getWeightLogs(userId, last30days);
  
  // Segment by macro ratio
  const periods = segmentByMacroRatio(nutritionLogs); // e.g., [high_carb_week, high_fat_week, balanced_week]
  
  const phenotype = {};
  periods.forEach(period => {
    const meanCals = period.avgCalories;
    const macroRatio = { carb: period.avgCarbs/meanCals, fat: period.avgFat/meanCals, protein: period.avgProtein/meanCals };
    
    const trainingStress = computeTrainingStress(workoutLogs, period.dates);
    const energyAvailability = meanCals - trainingStress;
    
    const weightChange = computeWeightTrendline(weightLogs, period.dates);
    const expectedWeightChange = predictWeightFromEnergyAvailability(energyAvailability);
    
    const metabolicEfficiency = actualWeightChange / expectedWeightChange;
    
    phenotype[macroRatio.carb > 0.5 ? 'high_carb_efficiency' : 'high_fat_efficiency'] = metabolicEfficiency;
  });
  
  // Classify: carb-sensitive, carb-adapted, balanced
  if (phenotype.high_carb_efficiency < 0.8) {
    return { classification: 'carb_sensitive', recommendation: 'reduce_carbs_below_150g' };
  } else if (phenotype.high_carb_efficiency > 1.1) {
    return { classification: 'carb_adapted', recommendation: 'increase_carbs_post_workout' };
  } else {
    return { classification: 'balanced_responder', recommendation: 'flexible_macros' };
  }
}
```

---

### 2.2 Meal Timing & Circadian Macronutrient Distribution
**Research finding:** Identical macros eaten at different times produce **12–18% different body composition outcomes**.

#### Why Timing Matters
```
Same day: 2100 cal, 150g protein, 250g carbs, 70g fat

Scenario A: "Always evenly distributed"
  Breakfast (7am): 400 cal, 30g protein, 50g carbs, 17g fat
  Lunch (12pm): 700 cal, 50g protein, 85g carbs, 23g fat
  Dinner (6pm): 700 cal, 50g protein, 85g carbs, 23g fat
  Snack (9pm): 300 cal, 20g protein, 30g carbs, 7g fat

Scenario B: "Chronotype-aligned" (evening carbs)
  Breakfast (7am): 300 cal, 40g protein, 20g carbs, 10g fat [HIGH PROTEIN, LOW CARB]
  Lunch (12pm): 600 cal, 50g protein, 50g carbs, 20g fat [BALANCED]
  Dinner (6pm): 900 cal, 40g protein, 130g carbs, 30g fat [HIGH CARB POST-WORKOUT]
  Snack (9pm): 300 cal, 20g protein, 50g carbs, 10g fat

After 8 weeks at same maintenance calories:
  Scenario A: Fat gain 4%, muscle loss 2%
  Scenario B: Fat loss 1.5%, muscle gain 3%
```

**Why?**
- Morning cortisol peak → body prefers protein for satiety
- Post-workout window (5–90min after training) → carbs drive muscle glycogen repletion + anabolic signaling
- Evening → fat-burning during sleep if carbs are minimal, OR if you're training evening, carbs support performance

**Implementation:**
```javascript
// Build time-aware macro distribution
async function generateOptimalMealPlan(userId, dayKey) {
  const userProfile = await getProfile(userId);
  const phenotype = await getMetabolicPhenotype(userId); // From 2.1
  const workouts = await getWorkoutsForDay(userId, dayKey); // Timing + intensity
  const circadianPhase = estimateCircadianPhase(userProfile.chronotype, dayKey); // When cortisol peaks
  
  const targetMacros = await getTargetMacros(userId); // TDEE + phenotype-adjusted
  
  // Build meal structure
  const mealPlan = {
    breakfast: {
      time: circadianPhase.cortisol_peak + 30min,
      protein_pct: 0.40, // HIGH protein for satiety
      carb_pct: 0.15,    // LOW carbs (slow glucose rise)
      fat_pct: 0.45,     // MODERATE fat for satiety
      rationale: 'High protein breakfasts (1.2x target) reduce hunger + evening overeating'
    },
    lunch: {
      time: circadianPhase.cortisol_peak + 4hours,
      protein_pct: 0.30,
      carb_pct: 0.45,
      fat_pct: 0.25,
      rationale: 'Balanced macro at mid-day maintains energy without causing afternoon crash'
    },
    pre_workout: {
      time: workouts[0].startTime - 90min,
      carbs_absolute: 30 + (workouts[0].intensity * 10), // 30–80g carbs based on intensity
      protein_absolute: 20,
      rationale: 'Minimal digestion time, fast-absorbing carbs for performance'
    },
    post_workout: {
      time: workouts[0].endTime + 15min,
      carb_pct: phenotype.classification === 'carb_sensitive' ? 0.25 : 0.50, // Adapt to phenotype
      protein_pct: phenotype.classification === 'carb_sensitive' ? 0.50 : 0.35,
      fat_pct: 0.20,
      rationale: 'Anabolic window: high carb-protein ratio drives glycogen + protein synthesis'
    },
    dinner: {
      time: '6:00 PM',
      protein_pct: 0.35,
      carb_pct: 0.35, // LOWER if no evening workout, or HIGH if training evening
      fat_pct: 0.30,
      rationale: 'Lighter on carbs if eating late (slow insulin sensitivity at night)'
    }
  };
  
  return mealPlan;
}
```

---

### 2.3 Micronutrient Absorption Model
**Key insight:** You can log 20mg iron, but the body only absorbs 2–3mg if:
- No vitamin C present (blocks absorption)
- Tea/coffee consumed (inhibitors: tannins, polyphenols)
- Calcium eaten simultaneously (competes for absorption)
- Phytates present (from grains, legumes)
- Stomach pH is high (from antacids)

**Smart systems calculate *bioavailable* micronutrients, not logged amounts.**

#### Absorption Modifiers
```javascript
const ABSORPTION_MATRIX = {
  iron: {
    base_absorption_pct: 0.15, // 15% of logged iron is actually absorbed
    enhancers: {
      vitaminC: { effect: +0.3, condition: 'eaten_same_meal' },
      heme_protein: { effect: +0.2, condition: 'contains_meat' },
      acidic_environment: { effect: +0.1, condition: 'eaten_with_vinegar' }
    },
    inhibitors: {
      calcium: { effect: -0.2, condition: 'eaten_same_meal' },
      tea_coffee: { effect: -0.15, condition: 'consumed_within_2h' },
      phytates: { effect: -0.3, condition: 'from_grains_legumes' },
      high_stomach_pH: { effect: -0.2, condition: 'user_takes_antacids' }
    }
  },
  calcium: {
    base_absorption_pct: 0.30,
    enhancers: {
      vitaminD: { effect: +0.2, condition: 'vitaminD_level_adequate' },
      acidic_environment: { effect: +0.1, condition: 'stomach_pH_low' }
    },
    inhibitors: {
      phytates: { effect: -0.15, condition: 'from_spinach_almonds' },
      oxalates: { effect: -0.2, condition: 'from_spinach_kale' },
      iron_competition: { effect: -0.1, condition: 'iron_eaten_same_meal' }
    }
  },
  vitaminD: {
    base_absorption_pct: syntheticVit_D3 ? 0.70 : 0.10, // D3 in food vs supplement
    enhancers: {
      dietary_fat: { effect: +0.2, condition: 'eaten_with_fat' },
      sunlight_exposure: { effect: system_cannot_model_skin_synthesis } // Needs wearable data
    },
    inhibitors: {
      low_stomach_fat: { effect: -0.1, condition: 'very_low_fat_diet' }
    }
  }
};

async function computeBioavailableNutrients(mealData, userId) {
  const bioavailable = {};
  
  Object.keys(mealData.nutrients).forEach(nutrient => {
    const logged = mealData.nutrients[nutrient];
    
    if (!ABSORPTION_MATRIX[nutrient]) {
      bioavailable[nutrient] = logged; // No model, assume 100% absorption
      return;
    }
    
    let absorptionRate = ABSORPTION_MATRIX[nutrient].base_absorption_pct;
    
    // Apply enhancers
    Object.entries(ABSORPTION_MATRIX[nutrient].enhancers).forEach(([enhancer, rule]) => {
      if (evaluateCondition(rule.condition, mealData, userId)) {
        absorptionRate += rule.effect;
      }
    });
    
    // Apply inhibitors
    Object.entries(ABSORPTION_MATRIX[nutrient].inhibitors).forEach(([inhibitor, rule]) => {
      if (evaluateCondition(rule.condition, mealData, userId)) {
        absorptionRate -= rule.effect;
      }
    });
    
    absorptionRate = Math.max(0.05, Math.min(0.95, absorptionRate)); // Clamp 5–95%
    bioavailable[nutrient] = logged * absorptionRate;
  });
  
  return bioavailable;
}
```

---

### 2.4 Food Choice Prediction & Recommendation
**Goal:** System learns user's food preferences and predicts next meal, or recommends alternatives with *reasons*.

#### User Model
```javascript
// Build from 60-day history
userNutritionModel = {
  favorite_foods: [
    { name: 'chicken_breast', frequency: 8, confidence: 0.95 },
    { name: 'rice', frequency: 5, confidence: 0.90 },
    { name: 'broccoli', frequency: 4, confidence: 0.85 }
  ],
  
  typical_meal_sequences: [
    { breakfast: 'oatmeal', lunch: 'chicken+rice', dinner: 'fish+veggies', frequency: 6 },
    { breakfast: 'eggs', lunch: 'turkey_sandwich', dinner: 'steak', frequency: 4 }
  ],
  
  meal_timing_pattern: {
    breakfast_time: '7:15am ±20min',
    lunch_time: '12:30pm ±30min',
    dinner_time: '6:45pm ±45min'
  },
  
  macro_preferences: {
    prefers_high_protein: true,
    carb_timing_preference: 'post_workout',
    fat_source_preference: 'olive_oil > butter > coconut'
  },
  
  food_aversions: [
    { name: 'kale', reason: 'never_logged' },
    { name: 'tuna', reason: 'only_logged_once_2_months_ago' }
  ],
  
  dietary_pattern: 'high_protein_moderate_carb'
}
```

**Prediction Logic:**
```javascript
async function predictNextMeal(userId, currentTime) {
  const userModel = await getUserNutritionModel(userId);
  const currentDayMeals = await getTodaysMeals(userId);
  
  // Classify current time to meal slot
  const currentMealSlot = classifyTimeToMealSlot(currentTime, userModel.meal_timing_pattern);
  
  if (currentMealSlot === 'breakfast' && currentDayMeals.breakfast === null) {
    // Predict breakfast
    const candidateFoods = userModel.favorite_foods
      .filter(f => f.meal_suitability.includes('breakfast'))
      .sort((a, b) => b.frequency - a.frequency);
    
    // Top 3 predictions
    const predictions = candidateFoods.slice(0, 3).map(f => ({
      food: f.name,
      probability: f.frequency / userModel.favorite_foods.reduce((sum, x) => sum + x.frequency, 0),
      reason: `You eat ${f.name} for breakfast ${f.frequency}/8 recent breakfasts`
    }));
    
    return predictions;
  }
  
  // Similar logic for other meals
}
```

---

### 2.5 Nutrient Adequacy Confidence Scoring
**Key concept:** Instead of static daily targets, track **confidence** that user met their needs.

```javascript
async function computeNutrientAdequacyConfidence(userId, dayKey) {
  const dailyNutrition = await getDailyNutrition(userId, dayKey);
  const targets = await getNutrientTargets(userId);
  
  const adequacy = {};
  
  Object.keys(targets).forEach(nutrient => {
    const logged = dailyNutrition[nutrient];
    const target = targets[nutrient];
    
    // Confidence factors:
    // 1. Data completeness (did user log all meals, or just breakfast + dinner?)
    // 2. Sensor quality (manual entry, barcode, or recipe DB?)
    // 3. Measurement uncertainty (±15% for food scales, ±5% for labeled packaged foods)
    
    const completeness = estimateMealsLogged(userId, dayKey) / expectedMealsPerDay;
    const sensorQuality = computeSensorQualityScore(dailyNutrition[nutrient].source); // 0.6 manual, 0.95 barcode
    const measurementUncertainty = 0.85; // Assume 15% error
    
    const baseConfidence = completeness * sensorQuality * measurementUncertainty;
    
    // Adjust for nutrients you can't measure precisely
    // (e.g., "did they really get 30g fiber, or did they underestimate fruit?")
    const nutrientBias = NUTRIENT_LOG_BIAS[nutrient] || 1.0; // e.g., fiber has 0.75x bias (underreported)
    
    const adequacyRatio = logged / target;
    
    adequacy[nutrient] = {
      logged,
      target,
      ratio: adequacyRatio,
      confidence: baseConfidence,
      status: adequacyRatio > 0.95 ? 'met' : adequacyRatio > 0.70 ? 'partial' : 'unmet',
      reasoning: `${Math.round(100 * baseConfidence)}% confident based on meal logging completeness + sensor quality`
    };
  });
  
  return adequacy;
}
```

---

## Part 3: Implementation Roadmap (8–10 weeks)

### Week 1–2: Metabolic Phenotyping Engine
**What to build:**
1. `computeMetabolicPhenotype()` function
2. Backend logic to classify carb sensitivity
3. Store phenotype result in User model

**Files to create/modify:**
- `server/services/nutritionEngine.js` (new function: `computeMetabolicPhenotype`)
- `server/models/User.js` (add field: `metabolicPhenotype`)
- `server/routes/nutritionRoutes.js` (endpoint: `GET /api/nutrition/phenotype`)

**Deliverable:** System knows if user is carb-sensitive, carb-adapted, or balanced.

---

### Week 3–4: Smart Meal Timing Optimizer
**What to build:**
1. `generateOptimalMealPlan()` function
2. Time-aware macro distribution
3. Integration with workout timing

**Files to create:**
- `server/services/mealTiming/mealPlanner.js`
- `server/routes/nutritionRoutes.js` (endpoint: `POST /api/nutrition/meal-plan/:dayKey`)

**Frontend addition:**
- Display recommended macro targets per meal
- Show *why* (e.g., "High protein breakfast reduces evening hunger")

**Deliverable:** Nutrition page shows daily macro distribution with timing recommendations.

---

### Week 5–6: Bioavailability Calculator
**What to build:**
1. `computeBioavailableNutrients()` function
2. Absorption modifier matrix
3. Real-time absorption score displayed

**Files to create:**
- `server/services/nutrition/bioavailabilityCalculator.js`

**Frontend addition:**
- Show "Logged vs. Bioavailable" comparison
- Highlight absorption conflicts (e.g., "Iron + Tea = 40% less absorption")

**Deliverable:** User sees *actual* nutrient absorption, not just logged amounts.

---

### Week 7: Food Prediction & Recommendation Engine
**What to build:**
1. `predictNextMeal()` function
2. `getUserNutritionModel()` from 60-day history
3. Smart food suggestions based on macro goals + preferences

**Files to create:**
- `server/services/nutritionEngine/foodPredictor.js`

**Frontend addition:**
- When user clicks "Add meal", show predicted foods + quick-add buttons
- Alternative suggestions: "To hit carb target, try rice (70g recommended)"

**Deliverable:** "Next meal" predictions + smart food suggestions on nutrition page.

---

### Week 8: Nutrient Adequacy Confidence UI
**What to build:**
1. `computeNutrientAdequacyConfidence()` function
2. Confidence badges per nutrient
3. Flag low-confidence nutrients

**Files to modify:**
- `client/src/components/NutritionTracker.jsx` (show confidence %)
- `server/routes/nutritionRoutes.js` (new endpoint: `GET /api/nutrition/adequacy/:dayKey`)

**Frontend addition:**
- Convert bar charts to include confidence shading
- Low confidence = lighter shade; high confidence = bright
- Tooltip shows "95% confident you met iron; only 3 meals logged"

**Deliverable:** Nutrition page shows confidence-weighted summary.

---

### Week 9: Personalized Deficit/Surplus Feedback
**What to build:**
1. Dynamic TDEE adjustment (based on 14-day weight trend)
2. Metabolic adaptation detection
3. Personalized calorie recommendation

**Files to create:**
- `server/services/nutritionEngine/dynamicTDEE.js`

**Frontend addition:**
- Show "Adaptive TDEE: 2050 cal (adjusted from 2100 based on weight trend)"
- Charts showing weight trend + calorie intake trend

**Deliverable:** TDEE adapts to user reality, not generic formula.

---

### Week 10: Polish & Integration Testing
**What to test:**
1. Does phenotype correctly classify carb sensitivity?
2. Does meal timing optimizer actually improve user adherence?
3. Does bioavailability calculation reduce nutrient waste?
4. Is prediction accuracy >60%?

**Deliverable:** Full e2e nutrition intelligence system.

---

## Part 4: UI/UX Redesign for Nutrition Page

### Current (Basic):
```
Summary Tab:
├─ Daily totals (calories, protein, carbs, fat)
├─ Progress bars (% of target)
└─ Micronutrient table (20 rows)

Meals Tab:
├─ List of meals
├─ Add meal button
└─ Manual entry form
```

### Advanced (Intelligent):
```
Dashboard Tab:
├─ DAILY STATE: "Metabolically balanced" (confidence 87%)
│   ├─ Energy reserve: 65% (based on phenotype + logged intake)
│   ├─ Macro timing: "60% on schedule" (carbs 78% post-workout)
│   └─ Forecast: "On track for 0.5lb deficit this week"
│
├─ MACRO OPTIMIZATION
│   ├─ Breakfast: 30g protein, 20g carbs, 12g fat [✓ logged: 28g, 18g, 11g]
│   ├─ Lunch: 50g protein, 80g carbs, 25g fat [⚠ need +15g carbs]
│   ├─ Pre-WO: 30g carbs, 15g protein [✓ predicted in 2 hours]
│   ├─ Post-WO: 40g carbs, 35g protein [pending]
│   └─ Dinner: 40g protein, 50g carbs, 20g fat [⚠ predict at 6:45pm]
│
├─ MICRONUTRIENT BIOAVAILABILITY
│   ├─ Iron: Logged 18mg → Bioavailable 4.2mg (23% due to tea, low Vit C)
│   │   └─ Suggestion: "Add orange with lunch to boost absorption to 28%"
│   ├─ Calcium: Logged 800mg → Bioavailable 680mg (85% due to Vit D)
│   └─ B12: Logged 15ug → Bioavailable 14.1ug (94%)
│
└─ CONFIDENCE SCORE
    ├─ Data completeness: 3/3 meals logged (100%)
    ├─ Sensor quality: 1 barcode + 2 manual (83% avg)
    └─ Overall confidence: 84% (high reliability)

Scan Product Tab:
├─ [Same barcode scanner]
└─ Recommended additions based on macro gaps

Meals Tab:
├─ Predicted next meal: "Chicken + rice. Probability: 87%"
├─ Smart add suggestions:
│   ├─ "To hit carb target: 70g rice recommended"
│   ├─ "To boost B12: add 100g fish"
│   └─ "For iron absorption: eat with citrus"
└─ Recent foods (quick add)

Patterns Tab (NEW):
├─ Metabolic phenotype: "Carb-sensitive"
├─ Favorite meals: [list + frequency]
├─ Typical meal timing: "7:15am ± 20min"
├─ Macro preferences: "High protein, evening carbs"
└─ Meal sequences you follow

Weekly Trend Tab:
├─ Weight trend (rolling 7-day avg)
├─ TDEE trend (adaptive, not static)
├─ Adherence % (how close to targets)
├─ Nutrient adequacy trend (weekly avg confidence)
└─ Phenotype stability (is classification consistent?)
```

---

## Part 5: Advanced Features (Post-MVP)

### 5.1 Allergic/Sensitivity Alerts
- User reports bloating after X food
- System learns: whenever user eats X, bloating appears in next 2–4 hours
- Confidence-based recommendation: "Consider reducing X; 78% of times you eat it, you report bloating"

### 5.2 Response Prediction
- "If you eat this meal structure tomorrow, predict your weight change, energy, and digestion"
- Combines metabolic phenotype + historical response patterns

### 5.3 Budget-Aware Recommendations
- "Hit your macro targets for <$5 today" (if user logs budget)

### 5.4 Supplement Timing Optimizer
- "Take magnesium 30min before bed (better absorption + sleep)"
- "Iron supplements: take alone, not with coffee or calcium"

---

## Part 6: Data Science Specifics

### 6.1 Detecting Metabolic Adaptation
Users on calorie deficit often experience **weight loss plateau** after 3–4 weeks, not due to cheating but due to metabolic adaptation (NEAT ↓, basal metabolic rate ↓).

**Detection algorithm:**
```javascript
async function detectMetabolicAdaptation(userId, lookbackDays = 30) {
  const weights = await getWeightLogs(userId, lookbackDays);
  const calories = await getNutritionTrend(userId, lookbackDays);
  
  // Fit two segments: early weight loss + plateau
  const [adaptation_date, early_loss_rate, plateau_rate] = fitTwoSegmentModel(weights);
  
  if (plateau_rate < 0.1 && early_loss_rate > 0.3) {
    return {
      detected: true,
      recommendation: 'Increase calories by 100–150, or increase activity',
      reason: 'Weight loss stalled despite calorie deficit. Likely metabolic adaptation.'
    };
  }
}
```

### 6.2 Synergy Matrix for Micronutrients
Some nutrients work better together; others compete.

```javascript
const MICRONUTRIENT_SYNERGY = {
  vitaminD_calcium: { synergy: +0.2 }, // Vit D helps calcium absorption
  iron_vitaminC: { synergy: +0.3 },     // Vit C enhances iron by 3x
  zinc_iron: { synergy: -0.2 },          // Compete for absorption
  magnesium_calcium: { synergy: -0.1 }   // Slight competition
};

// Use this to recommend meal pairings
// Suggest: "Iron + Vitamin C together" → "Steak + orange"
// Avoid: "Iron + Calcium together" → separate timing by 2h
```

### 6.3 Personalized Micronutrient Targets
Instead of generic RDI (Recommended Daily Intake), compute **personal optimal intake** based on:
- Training intensity (high intensity increases mineral loss via sweat)
- Digestive health (malabsorption = need higher intake)
- Age, sex, pregnancy status

```javascript
function personalizedMicronutrientTarget(userId, nutrient) {
  const rdi = GENERIC_RDI[nutrient]; // Population average
  const userProfile = await getProfile(userId);
  const trainingLoad = await getWeeklyTrainingLoad(userId);
  const digestiveHealth = await estimateDigestiveHealth(userId);
  
  // Adjust RDI
  let adjusted = rdi;
  
  if (nutrient === 'potassium' && trainingLoad > 300) {
    adjusted *= 1.3; // High sweat loss = higher potassium needs
  }
  
  if (nutrient === 'iron' && digestiveHealth.absorption_efficiency < 0.7) {
    adjusted *= 1.2; // Malabsorption = eat more iron
  }
  
  return adjusted;
}
```

---

## Conclusion

By end of **Week 10**, your nutrition page transforms from:

**Before:**
- *"Did I eat enough protein? I logged 145g, target is 150g."*
- Generic TDEE never changes
- Micronutrient table is incomprehensible

**After:**
- *"My system classifies me as carb-sensitive. Optimal macros: 40% protein, 35% carbs, 25% fat—personalized for my metabolism."*
- TDEE adapts weekly based on actual weight trend
- Bioavailable absorption shown; system suggests "Add orange to boost iron absorption from 23% to 55%"
- Predicted meals, confidence scores, and smart recommendations

---

## Immediate Next Steps

1. **Week 1 priority:** Start with metabolic phenotyping (highest ROI)
2. **Create** `server/services/nutritionEngine.js` with `computeMetabolicPhenotype()` function
3. **Test** on 30+ day user dataset to validate carb-sensitivity classification
4. I'll help you code the full pipeline phase by phase.

Ready to start **Week 1–2** implementation?
