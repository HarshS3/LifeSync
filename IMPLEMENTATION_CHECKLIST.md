# Implementation Checklist: Logic Fixes

**Scope:** Fix all 10 logic failures for India-based users with global food support.

**Priority:** High (blocks full assistant functionality)

---

## PHASE 1: Data Model (Week 1)

### User Model Updates
- [ ] Add `biologicalProfile.eatingPattern` (traditional_3meal/if_16_8/omad/custom)
- [ ] Add `biologicalProfile.customMealTimes[]` (for custom patterns)
- [ ] Add `biologicalProfile.trainingType` (resistance/endurance/sports/mixed/yoga/beginner)
- [ ] Add `biologicalProfile.periodization.phase` (bulk/cut/maintenance/deload/recovery)
- [ ] Add `biologicalProfile.menstrualCycle` (enabled, cycleLength, lastPeriodStart)
- [ ] Add `medicalProfile.conditions[]` (with severity, medications)
- [ ] Add `medicalProfile.pregnancy` (isPregnant, trimester, dueDate)
- [ ] Add `medicalProfile.allergies[]`
- [ ] Add `medicalProfile.dietaryRestrictions[]`

### Create New Models
- [ ] Create `SupplementLog` model with supplements array
- [ ] Add indexing on `user` + `date` for fast queries

### Create Constants
- [ ] Create `/server/constants/foods.js` with:
  - FOOD_CATEGORIES (indian, global, general)
  - FOOD_ALIASES (regional names)
  - PHYTATE_FLAGS
  - HEME_IRON_FLAGS
  - NON_HEME_IRON_FLAGS

---

## PHASE 2: Meal Pattern Logic (Week 1-2)

### Backend Updates
- [ ] Update `mealTimingEngine.js`:
  - Add `validateForIF()` function
  - Add `validateForOMAD()` function
  - Add condition check in main function
  
- [ ] Update `proteinDistributionEngine.js`:
  - Move to `PROTEIN_TARGETS_BY_TRAINING_TYPE` constant
  - Add eating pattern logic
  - Add conditional recommendations

- [ ] Update API routes to include `eatingPattern` in nutrition endpoints

### Frontend Updates (Mobile)
- [ ] Add eating pattern selection in onboarding (`App/app/(tabs)/index.js`)
- [ ] Show eating pattern summary in TodayTab (`App/components/Nutrition/TodayTab.js`)
- [ ] Show meal recommendations based on pattern

### Frontend Updates (Web)
- [ ] Add eating pattern selection in user settings (`client/src/components/Profile/...`)
- [ ] Show eating pattern in Nutrition dashboard (`client/src/components/Nutrition/...`)

---

## PHASE 3: Training Type & Protein Targets (Week 2-3)

### Backend Updates
- [ ] Create `/server/constants/nutritionRecommendations.js` with:
  - PROTEIN_TARGETS_BY_TRAINING_TYPE
  - CARB_TARGETS_BY_TRAINING_TYPE
  - FAT_TARGETS_BY_TRAINING_TYPE

- [ ] Update `nutritionEngine.js`:
  - Add `calculateDailyTargets()` that checks training type
  - Move magic numbers to constants
  - Add source citations for each formula

- [ ] Create `calculateCarbTarget()` function based on training type
- [ ] Create `calculateFatTarget()` function based on training type

### Frontend Updates (Mobile)
- [ ] Show training type in DetailsTab (`App/app/nutrition/details.js`)
- [ ] Show phase (bulk/cut/maintenance) selector
- [ ] Show macros broken down by purpose

### Frontend Updates (Web)
- [ ] Add training type selection in profile
- [ ] Show macro recommendations with training context

---

## PHASE 4: Water Retention Detection (Week 3)

### Backend Updates
- [ ] Update `adaptiveTdeeEngine.js`:
  - Add `detectWaterRetention()` function
  - Add signal detection (sodium, menstrual cycle, training volume, stress)
  - Adjust TDEE calculation based on fat change, not weight change
  - Add warning message for user

- [ ] Add `calculateMenstrualPhase()` helper function
- [ ] Add `calculateTrainingVolume()` helper function

### Frontend Updates (Mobile)
- [ ] Update DetailsTab to show water retention banner
- [ ] Show fat change estimate vs weight change

### Frontend Updates (Web)
- [ ] Same as mobile

---

## PHASE 5: Global Food Support (Week 4)

### Backend Updates
- [ ] Update `bioavailabilityEngine.js`:
  - Add global food flag checks (heme/non-heme, phytates)
  - Add regional food interactions
  - Keep existing India-specific logic

- [ ] Update `gutHealthEngine.js`:
  - Add global plant categories
  - Support all cuisine types for diversity calculation

- [ ] Update `canonicalFoodResolver.js`:
  - Query MongoDB aggregated food DB first
  - Use fuzzy matching for global foods
  - Update fallback to provisional foods

- [ ] Ensure MongoDB food DB includes:
  - Indian cuisines
  - Western foods
  - Middle Eastern
  - Asian cuisines
  - Mexican foods
  - European foods
  - African foods

### No Frontend Changes Needed
Food detection is backend-only. UI already supports any food name.

---

## PHASE 6: Supplement Tracking (Week 4-5)

### Backend Updates
- [ ] Create `SupplementLog` model (migration if needed)
- [ ] Create `/api/nutrition/supplements` endpoints:
  - POST (log supplement)
  - GET (list supplements)
  - DELETE (remove supplement)

- [ ] Update `priorityGapsEngine.js`:
  - Query both NutritionLog and SupplementLog
  - Combine nutrients from both sources
  - Adjust recommendations based on supplement intake

- [ ] Create `determineRecommendation()` function:
  - Recommend supplement if food is low
  - Recommend increase dosage if supplement exists but insufficient
  - Flag possible deficiency if both sources are low

### Frontend Updates (Mobile)
- [ ] Add supplement logging UI in LogMealTab
- [ ] Show supplement intake in DetailsTab
- [ ] Show deficiency status with supplement context

### Frontend Updates (Web)
- [ ] Same as mobile

---

## PHASE 7: New User Insights (Week 5)

### Backend Updates
- [ ] Update `progressEngine.js`:
  - Add `generateOnboardingInsights()` function
  - Add `generateEarlyInsights()` function
  - Lower thresholds for days <= 14

- [ ] Ensure progress endpoints work with < 3 workouts
- [ ] Add encouragement/education insights for early stage

### Frontend Updates (Mobile)
- [ ] Show early-stage insights on home screen (`App/app/(tabs)/index.js`)
- [ ] Celebrate first workout, first weight log, etc.

### Frontend Updates (Web)
- [ ] Show early-stage insights on dashboard

---

## PHASE 8: Disease Context & Safety (Week 5-6)

### Backend Updates
- [ ] Create `/server/services/disease/diseaseRecommendationEngine.js` with:
  - DISEASE_PROTOCOLS object with all conditions
  - Stage-specific recommendations (CKD stages, pregnancy trimesters)

- [ ] Add `getRecommendationsForConditions()` function
- [ ] Add `calculateProteinTargetWithConditions()` function
- [ ] Override protein targets for CKD, pregnancy, etc.

- [ ] Update all nutrition endpoints to query medical profile

### Safety Checks
- [ ] Validate that CKD users never get "increase protein"
- [ ] Ensure pregnant users get folate recommendations
- [ ] Flag dangerous combinations (e.g., high potassium + high protein)

### Frontend Updates (Mobile)
- [ ] Add medical condition input in onboarding (`App/app/(tabs)/index.js`)
- [ ] Show medical considerations in DetailsTab (`App/app/nutrition/details.js`)
- [ ] Show disease-specific nutrition guidance

### Frontend Updates (Web)
- [ ] Add medical profile settings
- [ ] Show disease context throughout app

---

## PHASE 9: Carb Tolerance Training-Aware (Week 6)

### Backend Updates
- [ ] Update `nutritionalToleranceEngine.js`:
  - Add `detectCarbTolerance()` function
  - Separate training day vs rest day spikes
  - Use different thresholds (1kg training day normal, 0.5kg rest day normal)
  - Don't flag training day glycogen+water as low tolerance

### Frontend Updates (Mobile)
- [ ] Update InsightsTab to show training-aware carb tolerance
- [ ] Show difference between training day and rest day

### Frontend Updates (Web)
- [ ] Same as mobile

---

## PHASE 10: Cross-Domain Links (Week 6-7)

From claudecode.md: Focus on cross-domain insights.

### Backend Updates
- [ ] Create `/server/services/insights/crossDomainLinksEngine.js`:
  - Link nutrition → workout performance
  - Link sleep → readiness → recovery → TDEE
  - Link glucose curve → training timing
  - Link iron intake → workout performance

- [ ] Add `linkNutritionToWorkout()` function
- [ ] Add `linkSleepToReadiness()` function
- [ ] Add `linkGlucoseToTraining()` function

### Frontend Updates (Mobile)
- [ ] Display cross-domain insights in DailyIntelligencePanel
- [ ] Example: "Low iron + afternoon lift = suboptimal performance"
- [ ] Example: "Sleep ↓1.5h → readiness ↓3 → avoid heavy squats"

### Frontend Updates (Web)
- [ ] Same insights displayed in dashboard

---

## Testing Checklist

### Unit Tests
- [ ] Test `validateForIF()` with various meal times and workouts
- [ ] Test `validateForOMAD()` with single and multiple meals
- [ ] Test protein targets for all training types
- [ ] Test water retention detection (high sodium, menstrual cycle, training)
- [ ] Test food resolution (global foods, fuzzy matching)
- [ ] Test disease logic (CKD protein reduction, pregnancy folate)
- [ ] Test supplement + food nutrient combination

### Integration Tests
- [ ] User (IF pattern) logs 1 meal → no pre-workout alert
- [ ] User (endurance training) gets 1.2g/kg protein, not 2.0g/kg
- [ ] User (female, menstrual) with weight spike → correctly identified as water
- [ ] User logs "couscous" → recognized, bioavailability calculated
- [ ] User with CKD → protein target reduced, no harmful suggestions
- [ ] New user (day 3) → gets early-stage insights, not silence
- [ ] User logs supplement → deficiency detection includes it

### Manual Testing
- [ ] Test all UI changes in mobile app (iOS + Android)
- [ ] Test all UI changes in web app
- [ ] Test onboarding flow (new user sees all new fields)
- [ ] Test eating pattern changes mid-journey
- [ ] Test disease context + nutrition recommendations
- [ ] Test cross-domain insights display

---

## Deployment Checklist

- [ ] Database migrations for new user fields
- [ ] Database migrations for SupplementLog model
- [ ] API version updates (new endpoints)
- [ ] Documentation updates (API docs)
- [ ] Mobile app release (both Android and iOS)
- [ ] Web app deployment
- [ ] Feature flags for gradual rollout (optional)
- [ ] Monitor logs for errors in new logic

---

## Timeline

| Phase | Weeks | Tasks |
|-------|-------|-------|
| 1 | Week 1 | Data model updates |
| 2 | Week 1-2 | Meal pattern logic |
| 3 | Week 2-3 | Training type & protein |
| 4 | Week 3 | Water retention |
| 5 | Week 4 | Global food support |
| 6 | Week 4-5 | Supplement tracking |
| 7 | Week 5 | New user insights |
| 8 | Week 5-6 | Disease context |
| 9 | Week 6 | Carb tolerance |
| 10 | Week 6-7 | Cross-domain links |
| — | Week 7 | Testing & deployment |

**Total: ~7-8 weeks for full implementation**

---

## Key Files to Modify/Create

### Create
- `/server/constants/foods.js`
- `/server/constants/nutritionRecommendations.js`
- `/server/models/SupplementLog.js`
- `/server/services/disease/diseaseRecommendationEngine.js`
- `/server/services/insights/crossDomainLinksEngine.js`

### Modify
- `server/models/User.js`
- `server/services/nutritionPipeline/mealTimingEngine.js`
- `server/services/nutritionPipeline/proteinDistributionEngine.js`
- `server/services/nutritionPipeline/bioavailabilityEngine.js`
- `server/services/nutritionPipeline/gutHealthEngine.js`
- `server/services/nutritionPipeline/adaptiveTdeeEngine.js`
- `server/services/nutritionEngine.js`
- `server/services/nutritionPipeline/priorityGapsEngine.js`
- `server/services/nutritionPipeline/nutritionalToleranceEngine.js`
- `server/services/insights/progressEngine.js`
- `server/services/nutritionPipeline/canonicalFoodResolver.js`
- All mobile nutrition components
- All web nutrition components
- All API routes (nutrition, user, goals)

---

## Notes

- All changes reflect claudecode.md priorities
- India-focused but global food support
- No timezone changes (stays IST)
- Focus on cross-domain insights (nutrition ↔ workout, sleep ↔ readiness, glucose ↔ timing)
- Build for both web and mobile simultaneously
- Follow recent training/nutrition page improvements
