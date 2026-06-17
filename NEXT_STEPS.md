# Next Steps: Phase 1 Implementation

**Status:** Phase 1 COMPLETE & READY TO TEST
**Timeline:** Can start testing immediately
**Team:** Ready for QA + frontend dev

---

## What's Done ✅

### Backend Foundation
- ✅ Global food knowledge base (`server/constants/foods.js`)
- ✅ Nutrition recommendations constants (`server/constants/nutritionRecommendations.js`)
- ✅ Disease recommendation engine (`server/services/disease/diseaseRecommendationEngine.js`)
- ✅ User model updated with trainingType, eatingPattern, menstrualCycle, medicalProfile
- ✅ Nutrition engine updated to use training type + disease context
- ✅ All syntax validated (no errors)

### Ready to Use
- ✅ Bioavailability engine recognizes global foods (couscous, falafel, tacos, etc.)
- ✅ Protein targets now training-type aware (1.2g/kg endurance vs 2.0g/kg resistance)
- ✅ CKD users get safe protein restrictions (protection against harm)
- ✅ Pregnant users get correct folate targets (600µg not 400µg)
- ✅ Medical warnings surface in API responses

---

## Immediate Testing (Today/Tomorrow)

### Test 1: Syntax Check ✅ DONE
All files compile without errors.

### Test 2: API Endpoint Testing
```bash
# 1. Create test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "endurance-test@example.com",
    "password": "test123",
    "name": "Runner"
  }'

# 2. Update user with trainingType
curl -X PATCH http://localhost:5000/api/users/{userId} \
  -H "Authorization: Bearer {token}" \
  -d '{
    "biologicalProfile": {
      "trainingType": "endurance",
      "weight": 70
    }
  }'

# 3. Get nutrition targets
curl -X GET http://localhost:5000/api/nutrition/daily-summary/2026-06-14 \
  -H "Authorization: Bearer {token}"

# 4. VERIFY RESPONSE:
# - trainingContext.trainingType = "endurance"
# - trainingContext.proteinPerKg = "1.20"
# - targets.protein ≈ 84g (for 70kg user)
```

### Test 3: Medical Context Testing
```bash
# Create CKD user
curl -X POST http://localhost:5000/api/users/{userId} \
  -H "Authorization: Bearer {token}" \
  -d '{
    "medicalProfile": {
      "conditions": [{
        "name": "ckd",
        "severity": "stage_3b"
      }]
    },
    "biologicalProfile": {
      "weight": 70
    }
  }'

# Get nutrition targets
curl -X GET http://localhost:5000/api/nutrition/daily-summary/2026-06-14 \
  -H "Authorization: Bearer {token}"

# VERIFY RESPONSE:
# - medicalWarnings array is NOT empty
# - medicalWarnings[0].level = "critical"
# - targets.protein < base (restricted)
```

---

## Frontend Dev Needed (Next 1-2 Days)

### High Priority

#### 1. Add trainingType Selector to Onboarding
**File:** `App/app/(tabs)/index.js` or `App/screens/Onboarding.js`

```javascript
<View>
  <Text>What type of training do you do?</Text>
  <Picker
    selectedValue={trainingType}
    onValueChange={setTrainingType}
  >
    <Picker.Item label="Resistance Training" value="resistance" />
    <Picker.Item label="Endurance (Running/Cycling)" value="endurance" />
    <Picker.Item label="Sports (Cricket/Basketball)" value="sports" />
    <Picker.Item label="Mixed Training" value="mixed" />
    <Picker.Item label="Yoga" value="yoga" />
    <Picker.Item label="Beginner/Not Sure" value="beginner" />
  </Picker>
</View>
```

**Impact:** Users can declare training type → protein targets auto-adjust

#### 2. Add Medical Profile Input to Onboarding
**File:** `App/app/(tabs)/index.js` or `App/screens/Onboarding.js`

```javascript
<View>
  <Text>Do you have any medical conditions?</Text>
  <TouchableOpacity onPress={() => setShowConditionsPicker(true)}>
    <Text>{selectedConditions.length > 0 ? selectedConditions.join(', ') : 'Select conditions...'}</Text>
  </TouchableOpacity>
  
  {selectedConditions.includes('ckd') && (
    <Picker
      label="CKD Stage"
      selectedValue={ckdStage}
      onValueChange={setCkdStage}
    >
      <Picker.Item label="Stage 1" value="stage_1" />
      <Picker.Item label="Stage 2" value="stage_2" />
      <Picker.Item label="Stage 3a" value="stage_3a" />
      <Picker.Item label="Stage 3b" value="stage_3b" />
      <Picker.Item label="Stage 4" value="stage_4" />
    </Picker>
  )}
  
  {selectedConditions.includes('pregnancy') && (
    <Picker
      label="Trimester"
      selectedValue={trimester}
      onValueChange={setTrimester}
    >
      <Picker.Item label="Trimester 1" value="1" />
      <Picker.Item label="Trimester 2" value="2" />
      <Picker.Item label="Trimester 3" value="3" />
    </Picker>
  )}
</View>
```

**Impact:** Users can declare medical conditions → recommendations become disease-safe

#### 3. Add Eating Pattern Selector
**File:** `App/screens/Profile.js` or settings

```javascript
<View>
  <Text>What's your eating pattern?</Text>
  <Picker
    selectedValue={eatingPattern}
    onValueChange={setEatingPattern}
  >
    <Picker.Item label="3 meals a day (Traditional)" value="traditional_3meal" />
    <Picker.Item label="Intermittent Fasting 16:8" value="if_16_8" />
    <Picker.Item label="Intermittent Fasting 20:4" value="if_20_4" />
    <Picker.Item label="OMAD (One Meal A Day)" value="omad" />
    <Picker.Item label="Custom" value="custom" />
  </Picker>
</View>
```

**Impact:** IF users no longer get false meal timing alerts (coming in Phase 2)

#### 4. Display Training Context in Details Tab
**File:** `App/components/Nutrition/DetailsTab.js`

```javascript
// Add to the top of the details
{response.trainingContext && (
  <View style={styles.trainingContextCard}>
    <Text style={styles.cardTitle}>Your Training Profile</Text>
    <Text style={styles.cardText}>
      Training Type: {response.trainingContext.trainingType}
    </Text>
    <Text style={styles.cardText}>
      Phase: {response.trainingContext.phase}
    </Text>
    <Text style={styles.cardText}>
      Protein Target: {response.trainingContext.proteinPerKg}g/kg
    </Text>
    <Text style={styles.cardNote}>
      {response.trainingContext.note}
    </Text>
  </View>
)}
```

**Impact:** Users see their training context reflected in recommendations

#### 5. Display Medical Warnings
**File:** `App/components/Nutrition/DetailsTab.js`

```javascript
// Add warnings section
{response.medicalWarnings && response.medicalWarnings.length > 0 && (
  <View style={styles.warningsCard}>
    <Text style={styles.warningsTitle}>⚠️ Medical Considerations</Text>
    {response.medicalWarnings.map((warning, idx) => (
      <View key={idx} style={[
        styles.warningItem,
        { borderLeftColor: warning.level === 'critical' ? '#ef4444' : '#f59e0b' }
      ]}>
        <Text style={styles.warningLevel}>{warning.level.toUpperCase()}</Text>
        <Text style={styles.warningMessage}>{warning.message}</Text>
      </View>
    ))}
  </View>
)}
```

**Impact:** Users see safety warnings if they have medical conditions

---

## Medium Priority (Next Week)

### 6. Update Nutrition Targets Display
Show training type context:
```
Before:
"Protein: 140g"

After:
"Protein: 84g (1.2g/kg for endurance training)"
```

### 7. Show Micronutrient Targets with Medical Context
```
Before:
"Folate: 400µg"

After:
"Folate: 600µg ⚠️ Pregnancy requirement for fetal development"
```

### 8. Add Eating Pattern Summary
```javascript
// In meal logging, show pattern context
if (eatingPattern === 'if_16_8') {
  <Text>Eating window: Choose your 8-hour window</Text>
}
```

---

## Web App Updates (client/ React)

### Parallel frontend work:
- Add same trainingType selector to web profile
- Add medical profile inputs to web settings
- Display trainingContext & medicalWarnings same as mobile
- Update nutrition dashboard to show training context

---

## Phase 2 Upcoming (When Phase 1 is Deployed)

Once Phase 1 is tested and deployed:

1. **Fix mealTimingEngine.js** (30 mins)
   - IF/OMAD users no longer get false meal alerts

2. **Create SupplementLog Model** (1 hour)
   - Enable supplement tracking

3. **Update priorityGapsEngine.js** (1 hour)
   - Include supplements in deficiency detection

4. **Update carb tolerance analysis** (1 hour)
   - Training-aware (don't flag training day glycogen as low tolerance)

---

## Deployment Checklist

### Before Deploy
- [ ] Test API endpoints (all 3 tests above pass)
- [ ] Test mobile app with new fields
- [ ] Test web app with new fields
- [ ] Run existing tests to ensure no regressions
- [ ] Database migration (if needed) runs successfully

### During Deploy
- [ ] Deploy backend changes
- [ ] Update mobile app and submit to stores (if using native build)
- [ ] Update web app

### After Deploy
- [ ] Monitor logs for errors
- [ ] Check that existing users aren't affected
- [ ] Verify new users can set trainingType & medicalProfile

---

## Success Criteria

✅ Endurance athletes get 1.2g/kg protein (not 2.0g/kg)
✅ CKD users get restricted protein with safety warnings
✅ Pregnant users get 600µg folate (not 400µg)
✅ Medical warnings surface in API responses
✅ Training context displays in recommendations
✅ No regressions on existing functionality

---

## Timeline

| Phase | Task | Days | Status |
|-------|------|------|--------|
| Testing | API endpoint validation | 1 | Ready |
| Frontend | Add trainingType selector | 1 | TODO |
| Frontend | Add medical profile input | 1 | TODO |
| Frontend | Display trainingContext | 0.5 | TODO |
| Frontend | Display warnings | 0.5 | TODO |
| Frontend | Web app updates | 1-2 | TODO |
| QA | Full regression testing | 1-2 | TODO |
| Deploy | Roll out to production | 0.5 | TODO |

**Total: ~7-10 days from now**

---

## Files Changed Summary

```
✅ server/models/User.js
   - Added trainingType, eatingPattern, menstrualCycle, periodization
   - Added medicalProfile with conditions, pregnancy, allergies

✅ server/services/nutritionEngine.js
   - Now async (for disease lookup)
   - Uses training type for protein targets
   - Applies disease context for safety
   - Returns trainingContext & medicalWarnings

✅ server/routes/nutritionRoutes.js
   - Passes userId to calculateDailyTargets

✅ server/constants/foods.js (already created)
   - Global food knowledge

✅ server/constants/nutritionRecommendations.js (already created)
   - All nutrition constants

✅ server/services/disease/diseaseRecommendationEngine.js (already created)
   - Disease-specific logic

TODO: App/app/(tabs)/index.js
   - Add trainingType selector in onboarding

TODO: App/screens/Profile.js
   - Add medical profile inputs
   - Add eating pattern selector

TODO: App/components/Nutrition/DetailsTab.js
   - Display trainingContext
   - Display medicalWarnings

TODO: client/src/components/Profile/...
   - Web app: same updates as mobile

TODO: Tests
   - Add tests for training type logic
   - Add tests for medical context
```

---

## Questions to Resolve

1. **UI/UX for medical conditions:** Should it be:
   - A multi-select checkbox list? ✅ Most user-friendly
   - A dropdown per condition? 
   - A form-based approach?

2. **When to show warnings:** 
   - Always if medical condition exists? ✅ Safety first
   - Only if conflicting with recommendation?

3. **Training phase selector:**
   - Should users change it frequently (bulk/cut/deload)?
   - Or keep it static most of the time?

---

## If Issues Found During Testing

### Common Issues & Fixes

**Issue:** `Cannot read property 'trainingType' of undefined`
**Fix:** User model migration didn't apply. Run migration or set defaults.

**Issue:** Disease lookup returns 404
**Fix:** Ensure userId is passed to calculateDailyTargets. Check route calls.

**Issue:** Protein values unchanged despite trainingType set
**Fix:** Check that `biologicalProfile.trainingType` is actually saved to DB.

---

## Communication

**To Product/Design:** Phase 1 is ready for UI design. New fields available:
- trainingType (enum: 6 options)
- medicalProfile.conditions (array with severity)
- eatingPattern (enum: 5 options)
- menstrualCycle (optional tracking)

**To QA:** Test scripts and expected results are in PHASE1_IMPLEMENTATION_COMPLETE.md

**To Mobile/Web Devs:** Frontend tasks ready in "Frontend Dev Needed" section above.

---

## Success Looks Like

When a user with CKD tries to get nutrition advice:
```
Before: "You need 140g protein for muscle building"
After: "⚠️ CRITICAL: CKD Stage 3b detected. Maximum protein is 60-70g/day to protect your kidneys. Your recommendation of 140g would stress your kidneys."
```

When an endurance athlete gets targets:
```
Before: "Protein: 140g (might not make sense for you)"
After: "Protein: 84g (1.2g/kg - optimized for endurance training). This fuels aerobic performance, not muscle building."
```

When a pregnant woman gets nutrition advice:
```
Before: "Folate: 400µg"
After: "Folate: 600µg ⚠️ CRITICAL for Trimester 2 pregnancy - prevents neural tube defects. You need: leafy greens (spinach, kale) + lentils + prenatal vitamin."
```

