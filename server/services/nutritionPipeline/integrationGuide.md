# Integration Guide: New Logic Fixes

This document shows how to integrate the new global foods, disease context, and training-aware logic into existing services.

## Files Created

1. `/server/constants/foods.js` — Global food knowledge base
2. `/server/constants/nutritionRecommendations.js` — Centralized nutrition constants
3. `/server/services/disease/diseaseRecommendationEngine.js` — Medical condition-aware logic

## Integration Points

### 1. Bioavailability Engine (DONE ✅)

**File:** `server/services/nutritionPipeline/bioavailabilityEngine.js`

Already updated to:
- Import global foods from `foods.js`
- Support all cuisines (Indian + global)
- Detect international food bioavailability interactions

**What now works:**
- ✅ "Couscous" recognized as grain (has phytates)
- ✅ "Falafel" recognized as legume (phytate source)
- ✅ "Tacos" recognized with corn tortilla + meat interaction
- ✅ Vitamin C source detection for any cuisine
- ✅ Iron-vitamin C boost for "orange juice + spinach" (any cuisine)

---

### 2. Nutrition Engine (NEEDS UPDATE 🔄)

**File:** `server/services/nutritionEngine.js`

**What to update:**

```javascript
// At top of file
const NUTRITION_RECOMMENDATIONS = require('../../constants/nutritionRecommendations');
const { getProteinTargetWithMedicalContext } = require('../disease/diseaseRecommendationEngine');

// In calculateDailyTargets function
// Before: hardcoded proteinPerKg = 1.6
// After: Check training type + medical conditions

async function calculateDailyTargets(biologicalProfile, adaptiveTdeeOverride, labMarkers, bmrOverride) {
  // ... existing code ...

  // NEW: Get base protein based on training type
  const trainingType = biologicalProfile.trainingType || 'resistance';
  const metabolicGoal = biologicalProfile.metabolicGoal || 'maintenance';
  const baseProteinPerKg = NUTRITION_RECOMMENDATIONS.PROTEIN_TARGETS_G_PER_KG[trainingType][metabolicGoal];

  // NEW: Adjust for medical conditions
  const proteinContext = await getProteinTargetWithMedicalContext(userId, baseProteinPerKg);
  const proteinPerKg = proteinContext.target;
  
  const targetProteinGrams = weightKg * proteinPerKg;
  
  // Continue with rest of calculation...
}
```

**What this enables:**
- ✅ Endurance athletes get 1.2g/kg (not 2.0)
- ✅ CKD users get reduced protein (safe)
- ✅ Pregnant women get +10g extra protein
- ✅ IF users no longer flagged for missing meals

---

### 3. Protein Distribution Engine (NEEDS UPDATE 🔄)

**File:** `server/services/nutritionPipeline/proteinDistributionEngine.js`

**What to update:**

```javascript
// At top of file
const { PROTEIN_TARGETS_G_PER_KG } = require('../../constants/nutritionRecommendations');

// NEW: Add eating pattern check
async function calculateOptimalProteinDistribution(userId, dailyProtein, meals) {
  const user = await User.findById(userId).select('biologicalProfile').lean();
  const eatingPattern = user?.biologicalProfile?.eatingPattern || 'traditional_3meal';
  
  const recommendations = {
    traditional_3meal: {
      mealCount: 3,
      optimalPerMeal: Math.round(dailyProtein / 3),
      reasoning: 'Spread across 3 meals for optimal MPS (muscle protein synthesis).',
    },
    if_16_8: {
      mealCount: 2,
      optimalPerMeal: Math.round(dailyProtein / 2),
      reasoning: 'Two meals in eating window. MPS elevated for 3-5h after each meal.',
    },
    omad: {
      mealCount: 1,
      optimalPerMeal: dailyProtein,
      reasoning: 'One large meal. MPS sustained through day with single protein dose.',
    }
  };
  
  return recommendations[eatingPattern];
}
```

**What this enables:**
- ✅ IF users no longer see "Missing Pre-Workout Fuel" alerts
- ✅ OMAD users don't get nagged for multiple meals
- ✅ Each pattern gets pattern-specific guidance

---

### 4. Meal Timing Engine (NEEDS UPDATE 🔄)

**File:** `server/services/nutritionPipeline/mealTimingEngine.js`

**What to update:**

```javascript
// NEW: Check eating pattern before validating meal timing
async function validateMealTiming(userId, meals, workouts) {
  const user = await User.findById(userId).select('biologicalProfile').lean();
  const pattern = user?.biologicalProfile?.eatingPattern || 'traditional_3meal';
  
  // Skip pre-workout meal validation for IF/OMAD
  if (pattern === 'if_16_8' || pattern === 'omad') {
    return [];  // No alerts for these patterns
  }
  
  // Traditional pattern: existing validation logic
  return validateTraditional(meals, workouts);
}
```

**What this enables:**
- ✅ IF user with breakfast at 12 PM + afternoon workout = no alerts
- ✅ OMAD user with one meal = no "missing meals" alerts

---

### 5. Deficiency Detection (NEEDS UPDATE 🔄)

**File:** `server/services/nutritionPipeline/priorityGapsEngine.js`

**What to update:**

```javascript
// NEW: Include supplements in deficiency analysis
async function computePriorityGaps(userId, daysAnalyzed = 7) {
  const NutritionLog = require('../../models/Logs').NutritionLog;
  const SupplementLog = require('../../models/SupplementLog');  // New model
  
  const nutritionLogs = await NutritionLog.find({ user: userId, date: { $gte: sevenDaysAgo } });
  const supplementLogs = await SupplementLog.find({ user: userId, date: { $gte: sevenDaysAgo } });
  
  // Aggregate from BOTH food and supplements
  const foodNutrients = aggregateFromFoods(nutritionLogs);
  const supplementNutrients = aggregateFromSupplements(supplementLogs);
  
  const totalNutrients = {
    ...foodNutrients,
    ...supplementNutrients  // Supplements override/add to food nutrients
  };
  
  // Now check against targets
  // Deficiency only flagged if total < 70% of target
}
```

**What this enables:**
- ✅ User taking Vitamin D supplement no longer flagged as deficient
- ✅ User with iron supplement + low-iron food intake = no "eat more iron" alert
- ✅ Pregnant user on prenatal vitamin = correct folate status

---

### 6. Nutrient Targets with Medical Context (NEEDS UPDATE 🔄)

**File:** `server/services/nutritionPipeline/priorityGapsEngine.js` or `nutritionEngine.js`

**What to add:**

```javascript
// NEW: Get nutrient targets adjusted for medical conditions
const { getNutrientTargetWithMedicalContext } = require('../disease/diseaseRecommendationEngine');

// When calculating any micronutrient target
const potassiumTarget = await getNutrientTargetWithMedicalContext(userId, 'potassium', 3500);
// → Returns 1500 if user has CKD Stage 3b (restricted)
// → Returns 3500 if user has normal kidney function

const phosphorusTarget = await getNutrientTargetWithMedicalContext(userId, 'phosphorus', 700);
// → Returns 600 if user has CKD Stage 4 (restricted)

const folateTarget = await getNutrientTargetWithMedicalContext(userId, 'folate', 400);
// → Returns 600 if user is pregnant (critical)
```

**What this enables:**
- ✅ CKD user never gets "increase potassium" (would be harmful)
- ✅ Pregnant user gets 600µg folate (not 400)
- ✅ Type 1 diabetic gets GI-aware recommendations

---

### 7. Carb Tolerance Analysis (NEEDS UPDATE 🔄)

**File:** `server/services/insights/nutritionalToleranceEngine.js`

**What to update:**

```javascript
// NEW: Separate training day vs rest day spikes
async function detectCarbTolerance(userId, daysAnalyzed = 14) {
  const logs = await NutritionLog.find({ user: userId, date: { $gte: nDaysAgo } });
  const weights = await WeightLog.find({ user: userId, date: { $gte: nDaysAgo } });
  const workouts = await Workout.find({ user: userId, date: { $gte: nDaysAgo } });
  
  const trainingDaySpikes = [];
  const restDaySpikes = [];
  
  logs.forEach(log => {
    if (log.dailyTotals.carbs < 300) return;  // High carb day
    
    const nextWeight = findWeightForDate(log.date + 1);
    const spike = nextWeight - currentWeight;
    
    const wasTrainingDay = workouts.some(w => w.date === log.date);
    
    if (wasTrainingDay) {
      trainingDaySpikes.push(spike);
    } else {
      restDaySpikes.push(spike);
    }
  });
  
  // Threshold: 1kg on training day = normal (glycogen+water)
  // 0.5kg on rest day = normal
  
  const trainingDayTolerance = avgTrainingDaySpike <= 1.0 ? 'normal' : 'watch';
  const restDayTolerance = avgRestDaySpike <= 0.5 ? 'normal' : 'high_spike';
  
  return {
    trainingDayTolerance,
    restDayTolerance,
    interpretation: 'Training day carbs are normal. Focus on rest day carbs if spike.'
  };
}
```

**What this enables:**
- ✅ Athlete eats carbs on training day + gains 1kg = "normal, not low tolerance"
- ✅ Same athlete eats carbs on rest day + gains 0.8kg = "reduce rest day carbs"
- ✅ Clear distinction between glycogen+water vs fat gain

---

## Summary: What to Update

| Service | Change | Enabled |
|---------|--------|---------|
| bioavailabilityEngine | ✅ DONE | Global foods work |
| nutritionEngine | 🔄 TODO | Training type → protein targets |
| proteinDistributionEngine | 🔄 TODO | Eating pattern → meal split |
| mealTimingEngine | 🔄 TODO | No false pre-workout alerts for IF |
| priorityGapsEngine | 🔄 TODO | Supplements counted in deficiency |
| — | 🔄 TODO | Nutrient targets adjusted for medical |
| nutritionalToleranceEngine | 🔄 TODO | Training-aware carb analysis |

---

## Testing After Integration

### Test 1: Global Foods
```
User logs "couscous + orange juice"
Expected: System recognizes couscous (grain, phytate source) + orange juice (vitamin C source)
Bioavailability report should show: "Vitamin C enhances any minerals. Phytates present but offset."
```

### Test 2: IF User
```
User: eatingPattern = "if_16_8"
Logs: 1 meal at 2 PM, workout at 4 PM
Expected: NO "Missing Pre-Workout Fuel" alert
Protein distributed: "Eat ~80g at 2 PM meal (covers day)"
```

### Test 3: CKD User
```
User: medicalProfile.conditions = [{name: 'ckd', severity: 'stage_3b'}]
System calculates protein target
Expected: 0.7g/kg (restricted), NOT 1.6g/kg
Alert: "CKD Stage 3b: Keep protein low to protect kidneys."
```

### Test 4: Pregnant User
```
User: medicalProfile.pregnancy = {isPregnant: true, trimester: 2}
System calculates folate target
Expected: 600µg (not 400µg)
Alert: "Pregnancy: Folate is critical. Ensure leafy greens, fortified grains, or supplements."
```

### Test 5: Athlete on Training Day
```
User: trainingType = "resistance"
Logs: Day 1: 350g carbs + workout, weight gain +1kg
Day 2: Rest day, 250g carbs, weight gain +0.6kg
Expected Carb Tolerance: "Training day carbs normal (1kg = glycogen+water). Rest day fine too."
NOT: "You have low carb tolerance."
```

---

## Deployment Checklist

- [ ] Create `/server/constants/foods.js`
- [ ] Create `/server/constants/nutritionRecommendations.js`
- [ ] Create `/server/services/disease/diseaseRecommendationEngine.js`
- [ ] Create `SupplementLog` model
- [ ] Update `bioavailabilityEngine.js` (import foods)
- [ ] Update `nutritionEngine.js` (training type logic)
- [ ] Update `proteinDistributionEngine.js` (eating pattern logic)
- [ ] Update `mealTimingEngine.js` (IF/OMAD skip validation)
- [ ] Update `priorityGapsEngine.js` (include supplements)
- [ ] Update `nutritionalToleranceEngine.js` (training-aware)
- [ ] Add tests for each scenario
- [ ] Deploy to staging
- [ ] QA testing with real users
- [ ] Deploy to production

