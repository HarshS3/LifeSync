# End-to-End API Test Scenarios

**Status:** Ready to test immediately
**Backend:** ✅ Complete
**Frontend:** Ready for development

---

## Scenario 1: Endurance Athlete

### Setup
```bash
# Create user
POST /api/auth/register
{
  "email": "runner@example.com",
  "password": "test123",
  "name": "Marathon Runner"
}

# Update profile
PATCH /api/users/{userId}
{
  "biologicalProfile": {
    "trainingType": "endurance",
    "weight": 70,
    "heightCm": 180,
    "activityLevel": "very_active"
  }
}
```

### Test
```bash
GET /api/nutrition/daily-summary/2026-06-14
Authorization: Bearer {token}
```

### Expected Response
```json
{
  "targets": {
    "calories": 2800,
    "protein": 84,      // ✓ 1.2g/kg (NOT 140g)
    "carbs": 420,       // ✓ Higher carbs for endurance
    "fat": 90,
    "fiber": 38
  },
  "trainingContext": {
    "trainingType": "endurance",
    "phase": "maintenance",
    "proteinPerKg": "1.20",
    "note": "Based on endurance training in maintenance phase"
  },
  "medicalWarnings": [],
  "tdeeSource": "adaptive"
}
```

### Verify
- ✅ Protein = 84g (1.2 × 70kg)
- ✅ Carbs significantly higher than resistance athlete
- ✅ trainingContext includes endurance type
- ✅ No medical warnings (healthy user)

---

## Scenario 2: CKD User (Stage 3b)

### Setup
```bash
# Create user
POST /api/auth/register
{
  "email": "ckd-patient@example.com",
  "password": "test123",
  "name": "John Doe"
}

# Update profile with medical condition
PATCH /api/users/{userId}
{
  "biologicalProfile": {
    "weight": 70,
    "heightCm": 175
  },
  "medicalProfile": {
    "conditions": [{
      "name": "ckd",
      "severity": "stage_3b",
      "medications": ["ACE inhibitor", "phosphate binder"]
    }]
  }
}
```

### Test
```bash
GET /api/nutrition/daily-summary/2026-06-14
Authorization: Bearer {token}
```

### Expected Response
```json
{
  "targets": {
    "calories": 2100,
    "protein": 56,      // ✓ Reduced to 0.8g/kg (NOT 140g)
    "carbs": 280,
    "fat": 70,
    "micronutrients": {
      "potassium": 1500, // ✓ Restricted (not 3500)
      "phosphorus": 600, // ✓ Restricted (not 1000)
      "sodium": 1500     // ✓ Restricted for BP control
    }
  },
  "trainingContext": {
    "trainingType": "resistance",
    "phase": "maintenance",
    "proteinPerKg": "0.80",
    "note": "Based on resistance training in maintenance phase"
  },
  "medicalWarnings": [
    {
      "level": "critical",
      "message": "CKD Stage 3b detected. Maximum protein is 56g/day (0.8g/kg) to protect your kidneys. Excess protein accelerates kidney damage. Also monitor: Potassium (target 1500mg/day), Phosphorus (target 600mg/day), Sodium (target 1500mg/day)."
    }
  ],
  "tdeeSource": "formula"
}
```

### Verify
- ✅ Protein restricted to 56g (0.8 × 70kg) - NOT increased
- ✅ Potassium restricted to 1500mg (CKD requirement)
- ✅ Phosphorus restricted to 600mg (CKD requirement)
- ✅ CRITICAL warning present
- ✅ message includes kidney protection context
- ✅ **PREVENTS HARM:** If doctor said "increase protein" earlier, app now shows it's medically unsafe

---

## Scenario 3: Pregnant User (Trimester 2)

### Setup
```bash
# Create user
POST /api/auth/register
{
  "email": "pregnant@example.com",
  "password": "test123",
  "name": "Sarah"
}

# Update profile
PATCH /api/users/{userId}
{
  "biologicalProfile": {
    "weight": 65,
    "heightCm": 165,
    "biologicalSex": "female",
    "pregnancyStatus": "pregnant_trimester_2"
  },
  "medicalProfile": {
    "pregnancy": {
      "isPregnant": true,
      "trimester": 2,
      "dueDate": "2026-12-25"
    }
  }
}
```

### Test
```bash
GET /api/nutrition/daily-summary/2026-06-14
Authorization: Bearer {token}
```

### Expected Response
```json
{
  "targets": {
    "calories": 2350,   // +350 for T2
    "protein": 126,     // +10g for T2
    "carbs": 310,
    "fat": 78,
    "micronutrients": {
      "folate": 600,    // ✓ 600µg (NOT 400µg)
      "calcium": 1000,
      "iron": 27,       // ✓ Increased from 18
      "vitaminD": 15
    }
  },
  "trainingContext": {
    "trainingType": "resistance",
    "phase": "maintenance",
    "proteinPerKg": "1.94",
    "note": "Based on resistance training in maintenance phase + pregnancy adjustment"
  },
  "medicalWarnings": [
    {
      "level": "high",
      "message": "Pregnancy Trimester 2 detected. Folate is CRITICAL (600µg/day) to prevent neural tube defects in fetus. Get folate from: spinach (150µg/cup cooked), lentils (180µg/cup cooked), prenatal vitamin (400-600µg). Also ensure: Calcium 1000mg (bone development), Iron 27mg (blood volume expansion)."
    }
  ],
  "tdeeSource": "formula"
}
```

### Verify
- ✅ Calories +350 for trimester 2
- ✅ Protein +10g for pregnancy
- ✅ Folate = 600µg (50% INCREASE from 400µg)
- ✅ Iron = 27mg (increased from 18mg baseline)
- ✅ HIGH severity warning with specific food sources
- ✅ **PREVENTS HARM:** Insufficient folate causes birth defects (prevented by this alert)

---

## Scenario 4: IF User (No False Alerts)

### Setup
```bash
# Create user
POST /api/auth/register
{
  "email": "if-user@example.com",
  "password": "test123",
  "name": "Intermittent Faster"
}

# Update profile
PATCH /api/users/{userId}
{
  "biologicalProfile": {
    "weight": 75,
    "heightCm": 178,
    "eatingPattern": "if_16_8",
    "trainingType": "resistance"
  }
}

# Log workout at 5 PM
POST /api/gym/log-workout
{
  "date": "2026-06-14",
  "time": "17:00",
  "name": "Upper Body",
  "exercises": [...]
}

# Log meal at 2 PM (eating window 2-10 PM)
POST /api/nutrition/logs
{
  "date": "2026-06-14",
  "meals": [{
    "mealType": "lunch",
    "time": "14:00",
    "foods": [...]
  }]
}
```

### Test
```bash
GET /api/nutrition/daily-summary/2026-06-14
Authorization: Bearer {token}
```

### Expected Response
```json
{
  "targets": {
    "protein": 120,
    "carbs": 300,
    "fat": 100
  },
  "trainingContext": {
    "trainingType": "resistance",
    "phase": "maintenance",
    "proteinPerKg": "1.60",
    "note": "Based on resistance training in maintenance phase"
  },
  "mealTimingAlerts": [
    {
      "type": "timing_info",
      "title": "✓ Fasted Training",
      "text": "Your IF 16:8 eating pattern allows fasted training. Make sure your eating window covers post-workout recovery nutrition."
    }
  ],
  "medicalWarnings": []
}
```

### Verify
- ✅ **NO** "Missing Pre-Workout Fuel" alert (was the problem before)
- ✅ "Fasted Training" info message instead (positive framing)
- ✅ Suggests eating window covers post-workout
- ✅ IF pattern recognized and respected
- ✅ **NO FALSE ALERTS:** Removed the main complaint from IF users

---

## Scenario 5: Multi-Condition User (Safety Stack)

### Setup
```bash
# Create complex user
PATCH /api/users/{userId}
{
  "biologicalProfile": {
    "weight": 60,
    "heightCm": 160,
    "biologicalSex": "female",
    "pregnancyStatus": "pregnant_trimester_3",
    "trainingType": "yoga"
  },
  "medicalProfile": {
    "conditions": [{
      "name": "diabetes",
      "severity": "type_2",
      "medications": ["metformin"]
    }],
    "pregnancy": {
      "isPregnant": true,
      "trimester": 3,
      "dueDate": "2026-08-14"
    },
    "allergies": ["peanut", "shellfish"]
  }
}
```

### Test
```bash
GET /api/nutrition/daily-summary/2026-06-14
Authorization: Bearer {token}
```

### Expected Response
```json
{
  "targets": {
    "calories": 2550,   // +450 for T3
    "protein": 129,     // Balanced for pregnancy
    "carbs": 280,       // Lower GI for diabetes
    "fat": 85,
    "micronutrients": {
      "folate": 600,    // Critical for pregnancy
      "vitaminD": 15    // Absorbed better with fat
    }
  },
  "medicalWarnings": [
    {
      "level": "critical",
      "message": "Multiple conditions detected: Pregnancy Trimester 3 + Type 2 Diabetes. Critical actions: 1) Folate 600µg/day (prevents birth defects), 2) Blood sugar monitoring (GI-aware carbs for both fetal and maternal health), 3) NO peanuts/shellfish (allergies). Coordinate with OB/GYN and endocrinologist."
    }
  ]
}
```

### Verify
- ✅ Multiple medical warnings stacked
- ✅ Folate at 600µg despite diabetes (pregnancy takes priority)
- ✅ Carbs adjusted for both diabetes + pregnancy
- ✅ Allergies noted in warning
- ✅ Recommends specialist coordination
- ✅ **SAFETY FIRST:** Multiple conditions handled without contradiction

---

## Test Execution Checklist

### Before Running Tests
- [ ] Postman or curl ready
- [ ] Backend running locally
- [ ] MongoDB running
- [ ] Bearer tokens ready

### Test Run (in order)
- [ ] Scenario 1: Endurance athlete - verify protein 84g
- [ ] Scenario 2: CKD user - verify protein 56g + critical warning
- [ ] Scenario 3: Pregnant user - verify folate 600µg + warning
- [ ] Scenario 4: IF user - verify no false pre-workout alert
- [ ] Scenario 5: Multi-condition - verify safety stack

### Success Criteria
- ✅ All protein targets correct per training type
- ✅ All disease warnings present
- ✅ No false alerts for IF users
- ✅ Folate correct for pregnancy
- ✅ CKD restrictions applied
- ✅ Multiple conditions don't contradict each other

### Expected Response Time
- ~200-300ms per request (mostly disease lookup)
- No N+1 queries
- Fallback works if disease lookup fails

---

## Common Issues & Fixes

### Issue: medicalWarnings array is empty
**Check:**
- Is medicalProfile.conditions set?
- Is severity spelled correctly (e.g., "stage_3b" not "stage_3B")?
- Is userId valid?

### Issue: Protein target unchanged despite trainingType
**Check:**
- Is trainingType set in biologicalProfile?
- Is NUTRITION_RECOMMENDATIONS imported in nutritionEngine?
- Did you await the calculateDailyTargets call?

### Issue: "Missing Pre-Workout Fuel" alert for IF user
**Check:**
- Is eatingPattern set to "if_16_8" or "omad"?
- Did you deploy the mealTimingEngine fix?

### Issue: Folate still 400µg for pregnant user
**Check:**
- Is pregnancyStatus set to "pregnant_trimester_2" or higher?
- Is medicalProfile.pregnancy.isPregnant = true?

---

## Next Steps

1. ✅ Run Scenario 1 (Endurance) - should pass immediately
2. ✅ Run Scenario 2 (CKD) - should show critical warning
3. ✅ Run Scenario 3 (Pregnant) - should show 600µg folate
4. ✅ Run Scenario 4 (IF) - should show no pre-workout alert
5. ✅ Run Scenario 5 (Multi-condition) - should stack warnings safely

Then frontend dev can add UI to let users set these fields.

