# LifeSync Nutrition System — Deep Dive FAQ
> No code changes. This is a knowledge & architecture document. All questions answered below.

---

## Q1: Do we have absorption multipliers in calculations?

**YES. Fully implemented.**

The `server/services/nutritionPipeline/bioavailabilityEngine.js` applies scientifically derived multipliers to 10 key micronutrients at meal save time:

| Nutrient | Blocker Example | Multiplier Impact |
|----------|-----------------|-------------------|
| Iron (non-heme) | Tea / Tannins | 0.40× (60% block) |
| Iron (non-heme) | Calcium > 200mg | 0.50× (50% block) |
| Iron | Vitamin C present | 3.00× (triple absorption) |
| Calcium | Oxalate foods | 0.50× |
| Vitamin D | Fat < 5g | 0.15× (near-zero absorption) |
| Vitamin A | Fat < 3g | 0.15× |
| Vitamin K | Fat < 5g | 0.20× |
| Zinc | High phytates (unsoaked legumes) | 0.40× |
| Magnesium | Very high calcium | 0.70× |
| Folate | High-heat cooking detected | 0.60× |

**These multipliers are applied at save time** via the nutrition route, stored in `meal.bioavailability.results`, and displayed in the UI under "Absorption Analysis" per meal and "Daily Effective Absorption Summary."

---

## Q2: Are GI Modifiers (Fiber/Fat/Protein/Vinegar/Cooling) implemented?

**PARTIALLY. Our glycemic_pressure proxy naturally captures some of this, but the explicit GL modifier table is NOT yet implemented.**

### What we currently do:
Our `derivedMetrics.js` computes:
```
glycemic_pressure_raw = carbs / (fiber + protein + 1)
```
This naturally means:
- High fiber → lower denominator → lower glycemic pressure ✅
- High protein → lower pressure ✅  
- High fat → widens the CGM curve (time constant) ✅

### What we are MISSING vs. the full GL modifier table:

| Condition | Target Modifier | Current Status |
|-----------|----------------|----------------|
| Fiber > 8g | GL × 0.75 | ⚡ Partially via formula denominator |
| Fat > 15g | GL × 0.85 | ⚡ Partially via stdDev widening |
| Protein > 20g | GL × 0.90 | ⚡ Partially via formula |
| Vinegar / Lemon juice in meal | GL × 0.80 | ❌ Not implemented |
| Cooled/reheated rice or potato | GL × 0.85 | ❌ Not implemented (requires food flag) |
| Overripe banana | GL × 1.15 | ❌ Not implemented |

**To implement the full table:** We'd add a `detectedFoodFlags` step in the pipeline that scans food names for keywords (`lemon`, `vinegar`, `cold rice`, `reheated`) and applies explicit multipliers to the GL calculation. This is straightforward to add.

---

## Q3: Should we show Actionable Absorption Recommendations, not just warnings?

**YES. This is the most important UX upgrade we can make.**

Currently the system shows: *"Tea reduces iron absorption by 60%."*  
The goal is to show: *"Your dal has good iron but chai with this meal cuts absorption by ~60%. Swap for lemon water or have chai 1 hour later. Adding amla or lemon pickle triples your effective iron intake from the same dal."*

### Recommended approach: Hybrid (Hardcoded Logic + LLM Enrichment)

**Step 1 — Hardcoded template triggers** (fast, free, deterministic):
- Detect known interactions: iron+tea, iron+calcium, fat-soluble vitamin+no fat, etc.
- Each trigger fires a structured object: `{ nutrient, blocker, fix, synergist, magnitude }`

**Step 2 — LLM enrichment layer** (runs async in background):
- Pass the trigger object + meal foods to the LLM
- Prompt: *"Given this meal with [foods], there is a [blocker] interaction reducing [nutrient] absorption by [magnitude]. Write a 2-sentence personalized, encouraging recommendation that mentions a specific Indian swap."*
- Store the response in `meal.bioavailability.recommendation`
- Show in UI once available (no blocking)

**Why not LLM-only?** Too slow for real-time. Why not hardcoded-only? Feels robotic. Hybrid gives you speed AND quality.

**Priority triggers to hardcode first:**
1. Iron + Tea → "Have chai 1 hour after meals"
2. Iron + No Vitamin C → "Add lime/tomato to this meal"
3. Vitamin D/A/K/E + No Fat → "Add ghee/oil/nuts"  
4. Turmeric + No Black Pepper → "Add a pinch of black pepper"
5. Calcium + Iron same meal → "Separate dairy from iron sources by 2 hours"

---

## Q4: Should TDEE change with exercise? TEF? EAT?

**YES to all three components. Currently only BMR+PAF is implemented.**

TDEE has 4 components. Here's our current status:

| Component | What it is | Current Status |
|-----------|-----------|----------------|
| **BMR** | Base metabolic rate | ✅ Mifflin-St Jeor formula |
| **NEAT** | Non-exercise activity (walking, fidgeting) | ✅ Via activity factor (1.2–1.9) |
| **TEF** | Thermic effect of food (~10% of calories) | ❌ Not calculated |
| **EAT** | Exercise activity thermogenesis | ❌ Not added on workout days |

### TEF Implementation (easy):
```
TEF = (protein_g × 4 × 0.25) + (carbs_g × 4 × 0.08) + (fat_g × 9 × 0.03)
```
Protein burns 25% of its own calories in digestion. This adds ~100–200 kcal/day for high-protein eaters. We should add this to the daily energy expenditure estimate.

### EAT Implementation (important):
When user logs a workout:
- **Cardio** (running, cycling): Add `MET × weight_kg × hours` to daily TDEE
  - e.g., Running 60 min for 75kg user ≈ MET 8.0 × 75 × 1.0 = 600 kcal
- **Strength training**: More complex — EPOC (afterburn) lasts 24–48h.
  - Simple approximation: `300–500 kcal for 60 min strength session`
- **Calorie target for that day** = Base TDEE + EAT calories

This is critical for muscle-building users. Currently we give uniform targets regardless of workout days.

---

## Q5: How do we dynamically change TDEE with weight changes?

### Current State: Static
We compute TDEE once from the user profile (height, weight, age, activity). If user loses 10kg, the TDEE stays stale.

### What we must implement: Adaptive TDEE (The Most Important Algorithm)

**Formula-based TDEE is wrong by 10–15% for many people. This method is accurate to 2–3% because it learns from the user's actual body response.**

```
Weekly Deficit Observed = Weekly weight change (kg) × 7,700 kcal/kg ÷ 7
Actual TDEE = Avg daily logged calories + Observed daily deficit
```

**Example:**
- User logs avg 2,000 kcal/day
- Loses 0.3 kg/week  
- Weekly deficit = 0.3 × 7,700 = 2,310 ÷ 7 = **330 kcal/day deficit**
- **Actual TDEE = 2,000 + 330 = 2,330 kcal/day**

This is far more accurate than the static Mifflin formula.

**Implementation plan:**
1. After every 2 weeks of data, run the adaptive recalculation
2. Compare adaptive TDEE vs formula TDEE
3. If they diverge by > 10% → update target calories and notify user
4. Recalculate protein target using updated bodyweight from rolling average

**Critical rule:** Require at least 14 days of consistent logging before trusting the adaptive calculation. Fewer days = too much noise.

---

## Q6: What protein targets do we follow by goal?

**Recommend implementing the research-backed table below, which is better than the generic 2g/kg:**

| Goal | Minimum | Optimal | Research Basis |
|------|---------|---------|----------------|
| Fat loss | 1.6g/kg BW | 2.2–2.4g/kg | Longland et al. 2016, AJCN |
| Muscle building | 1.6g/kg BW | 2.0–2.2g/kg | Morton et al. 2018 meta-analysis |
| Recomposition | 2.2g/kg BW | 2.4–3.1g/kg | Barakat et al. 2020 |
| Obese users (use LBM not total BW) | 2.2g/kg LBM | 2.4–3.0g/kg | Per lean body mass, not total weight |

**Key nuance for obese users:** Use **Lean Body Mass (LBM)** not total bodyweight. Calculating protein from total body weight for a 120kg person with 40% body fat would give an absurdly high target. LBM = weight × (1 - bodyfat%).

**Current system status:** We likely use a flat multiplier. This table needs to be implemented in the calorie/macro target calculation service using the user's stated goal.

---

## Q7: What calorie targets do we use by goal?

| Goal | Daily Calorie Target | Expected Rate |
|------|---------------------|---------------|
| Fat loss | TDEE − 300 to 500 kcal/day | 0.5–1% bodyweight/week |
| Muscle gain | TDEE + 200 to 300 kcal/day | 0.25–0.5% BW/week lean gain |
| Recomposition | TDEE ± 0 | Only reliable for beginners/drug-enhanced |
| Aggressive fat loss (not recommended) | TDEE − 750 to 1000 | > 1%/week → muscle loss risk |

**Rate of loss monitoring table:**

| Weekly Loss Rate | Muscle Risk | Required Protein | App Action |
|-----------------|-------------|-----------------|------------|
| < 0.5%/week | Near-zero | 1.6–2.0g/kg | 🟢 Green — optimal pace |
| 0.5–1.0%/week | Low-moderate | 2.0–2.4g/kg | 🟡 Yellow — monitor protein |
| > 1.0%/week | Significant | 2.4–3.1g/kg | 🔴 Red — reduce deficit |
| > 1.5%/week | Severe | 3.1g/kg (barely enough) | 🚨 Alert — crash diet risk |

---

## Q8: Are we taking waist/hip inputs? Is BMR integrated?

### Current input status (needs audit):
- ✅ Height, Weight, Age, Sex → Mifflin-St Jeor BMR
- ✅ Activity level → PAF multiplier for TDEE
- ❓ Waist circumference → **Unclear if stored and used**
- ❓ Hip circumference → **Unclear**
- ❓ Body fat % → **Unclear if stored**
- ❌ Waist-to-Hip Ratio (WHR) → **Not calculated**
- ❌ FFMI (Fat-Free Mass Index) → **Not calculated**

### Why waist/hip matters:
- **Waist-to-hip ratio** is a better predictor of metabolic health than BMI
- **Men:** WHR > 0.90 = central adiposity risk
- **Women:** WHR > 0.85 = central adiposity risk
- Central fat is metabolically active and produces inflammatory cytokines

### What we need to add to user profile:
```
waist_cm, hip_cm → WHR = waist/hip
neck_cm + waist_cm + height_cm → US Navy body fat% formula
```

This would allow us to:
1. Use LBM for protein targets (not total weight)
2. Provide visceral fat risk alerts
3. Track body composition change (losing fat vs losing muscle)

---

## Q9: Adaptive TDEE — Full Algorithm

> **This is the most important algorithm in the entire platform.**

### Prerequisites:
- At least 14 days of food logs with consistent calorie tracking
- At least 7 daily weight entries in that period
- 7-day rolling average weight (removes water retention noise)

### Calculation:

```
7-Day Rolling Avg Weight = (sum of last 7 daily weights) / 7
Weekly Weight Change = This_week_avg - Last_week_avg

Daily Deficit = (Weekly_weight_change_kg × 7700) / 7
               [negative if losing, positive if gaining]

Adaptive TDEE = Avg_daily_calories_logged - Daily_deficit
               [add deficit back because deficit = calories burned beyond intake]

Confidence Score:
  - "Low" if < 14 days of data OR calorie logging gaps > 3 days
  - "Medium" if 14-30 days, mostly consistent
  - "High" if > 30 days, daily logging, consistent pattern
```

### Recalibration Trigger:
- Run every 2 weeks automatically
- If Adaptive TDEE differs from Formula TDEE by > 10%: update targets + notify user
- Store history of adaptive TDEE so we can detect metabolic adaptation

---

## Q10: Metabolic Adaptation Detection

After 8–12 weeks of continuous deficit, the body reduces its metabolic rate (leptin drops, thyroid slows, NEAT decreases). Users hit a plateau despite eating the same deficit.

### Detection Algorithm:
```
Conditions for "Metabolic Adaptation Detected":
1. User in calorie deficit for > 56 consecutive days (8 weeks)
2. Logged calories consistently below adaptive TDEE
3. Rate of weight change has dropped > 40% vs first 4 weeks

Action: 
→ "Your metabolism has adapted. This is normal and expected, not failure.
   A 1–2 week break at maintenance calories will restore metabolic rate.
   This is called a 'diet break' and is backed by research."
```

### Leptin / Hormone Context:
- Leptin drops logarithmically with fat loss: rapidly at first, then slowly
- After 8–12 weeks: hunger up, energy down, fat loss rate slows despite same deficit
- **Diet breaks** restore leptin 60–70% within 2 weeks
- **Feature idea**: Schedule periodic "maintenance weeks" in the app — a planned break every 8–10 weeks of deficit is evidence-based (not cheating)

---

## Q11: Fat Type Monitoring — SFA/MUFA/PUFA

Total fat quantity matters for calories, but **fat type determines health outcomes**.

| Fat Type | Daily Target | Alert Condition |
|----------|-------------|-----------------|
| Total fat | 0.5–1.0g/kg BW (minimum) | < Minimum: Testosterone/estrogen risk alert |
| SFA (Saturated) | < 10% of total calories | > 30g/day: Heart health flag |
| MUFA | Maximize | Consistently very low: suggest olive oil, almonds, peanuts |
| PUFA Omega-3 | Maximize | No fish/walnuts/flaxseed for 7+ days: suggest Omega-3 supplement |
| PUFA Omega-6 | Limit excess | Very high sunflower/soybean oil use: inflammation flag |

**Alert cadence:**
- SFA > 30g: **Daily alert** (acute risk)
- MUFA consistently low: **Weekly summary**
- Omega-3 absent: **After 7 consecutive days**

---

## Q12: Alert Cadence — When Should Each Alert Fire?

| Alert Type | Cadence | Rationale |
|-----------|---------|-----------|
| Iron + Chai at meal | **Per meal** (immediate) | Actionable right now |
| Vitamin A/D/K + no fat | **Per meal** (immediate) | Fix is in current meal |
| Protein < 1.6g/kg | **Daily** | End of day — too late to fix but builds habit |
| >60% protein in one meal | **Daily** | Show next morning with next-day plan |
| Fiber < 20g/day | **Daily** | Evening nudge while dinner still possible |
| Sodium > 3,000mg | **Daily** | Explain scale weight tomorrow  |
| Vitamin D < 5mcg × 7 days | **Weekly** | After 7 consecutive days |
| Iron < RDA × 3 days | **After 3 days** | Consistent pattern, not one-off |
| Omega-3 absent × 7 days | **Weekly** | Supplement recommendation |
| Adaptive TDEE recalibration | **Every 2 weeks** | Requires enough data |
| Metabolic adaptation | **After 8 weeks** of confirmed deficit | One-time insight |
| Diet break recommendation | **Once per diet phase** | Not nagging |

---

## Q13: Calcium Interactions — What We Track

Calcium has complex interactions that can block OR require other nutrients:

| Interaction | Effect | Alert Trigger |
|-------------|--------|---------------|
| Calcium + Iron (same meal) | Calcium blocks non-heme iron | > 200mg Ca + > 3mg Fe in same meal |
| Calcium + Vitamin D | D required to absorb Ca | Ca logged without Vit D consistently |
| Calcium + Magnesium | High Ca reduces Mg absorption | Ca > 1,500mg with Mg < 250mg |
| Calcium + Oxalate (spinach, rhubarb) | Oxalate binds Ca → near-zero absorption | Flag when spinach is calcium "source" |
| Calcium + Vitamin K2 | K2 directs Ca to bones not arteries | Vit D + Ca users with no K2 source |

---

## Q14: Sodium & Water Retention — User Trust Feature

**This is a critical user trust moment.** When a user sees +1.5kg on the scale after a salty meal, they panic. If your app doesn't explain this, they lose trust in the scale and their habits.

### Alert Logic:
```
IF sodium_mg_yesterday > 3,000 
AND today_weight > yesterday_weight by > 0.5kg

THEN show: "Yesterday's sodium (Xmg) is the reason the scale jumped.  
This is water weight — your kidneys retain ~1.8ml water per mg of excess  
sodium. This will resolve in 24-48 hours with normal eating. Your actual  
fat didn't change overnight — fat changes take days to weeks."
```

This requires:
1. Cross-day data comparison (have yesterday's log)
2. Weight comparison (have today's weight entry)
3. A stored sodium value from previous day's log

---

## Q15: Fat-Soluble Vitamins — The Zero-Absorption Problem

All four fat-soluble vitamins (A, D, E, K) require dietary fat **in the same meal** to be absorbed. Fat is needed for micellar transport in the small intestine.

**Threshold for "adequate fat for absorption":**
- Vitamin A (carotenoids): ≥ 3–5g fat in meal
- Vitamin D: ≥ 5g fat in meal  
- Vitamin E: ≥ 3g fat in meal
- Vitamin K: ≥ 5g fat in meal

**Meal-level alert:** If any of these vitamins are present in a meal AND total fat (sfa_mg + mufa_mg + pufa_mg) is near zero → flag absorption warning.

**Common real-world scenario:** Salad with spinach (Vitamin K), carrots (Vitamin A), but fat-free dressing → near-zero absorption of both vitamins. Fix: "Add olive oil, ghee, or nuts to your salad."

---

## Q16: Protein Distribution — MPS Timing

**Current status:** We likely only track daily protein total. We're missing per-meal distribution tracking.

### What research says:
- Muscle Protein Synthesis (MPS) is maximally stimulated by **~0.4g protein/kg per meal**
- For a 75kg person: ~30g protein per meal to max out MPS
- MPS stays elevated ~3–5 hours after protein-rich meal then resets
- Eating 120g protein in dinner is worse for muscle than 30g × 4 meals

### Alerts to implement:
1. `>60% daily protein in one meal` → "Redistributing protein across 3–4 meals would improve muscle retention"
2. Pre-workout meal has < 20g protein → "Add a protein source before your workout for better recovery"
3. Post-workout window (2 hours) → If no high-protein meal logged → "Have a protein-rich meal soon to maximize recovery"

---

## Q17: Insulin & Fat Storage — The Mechanism

**Why this matters for your app:** High insulin = fat storage signal. Low insulin = fat release signal. You cannot lose fat while insulin is chronically elevated.

### Meal-level insulin signals to detect:
- `freesugar_g > 20 in one meal` → Major insulin spike
- `GL > 20 AND protein < 10g AND fiber < 3g` → Unblunted insulin spike
- `Meal timing: frequent snacking < 2 hours apart` → No insulin recovery window

### Solution the app should suggest:
"High-GI + low-fiber + low-protein = prolonged fat storage window. Adding protein or fiber to this meal would reduce the insulin spike duration."

---

## Q18: Leptin & Metabolic Adaptation — Summary

| Phase | Duration | What Happens | App Response |
|-------|----------|--------------|--------------|
| Early deficit | 0–4 weeks | Leptin drops 50%, hunger increases | "Normal adaptation — stay consistent" |
| Mid deficit | 4–8 weeks | NEAT drops, metabolic rate slows ~5% | Monitor adaptive TDEE for divergence |
| Late deficit | 8–12+ weeks | Full metabolic adaptation, plateau | Detect pattern → recommend diet break |
| Diet break | 1–2 weeks | Leptin partially restored (+60–70%) | Track — don't panic about weight gain |
| Post-break | Resume deficit | Rate of loss often partially restores | Update adaptive TDEE after break |

---

## Q19: Weight Tracking — Rolling Average Algorithm

Daily weight readings are noisy. A single weigh-in can vary ±2kg from water, food, bowels.

```
7-Day Rolling Average = Sum(last 7 daily weights) / 7

Weekly Rate of Change = This_week_rolling_avg - Last_week_rolling_avg

Rate as % of bodyweight = (weekly_change / current_weight) × 100

Display to user:
- Raw daily weight (light grey, small)
- 7-day rolling average (bold line — what matters)
- Weekly trend arrow (↓ losing / ↑ gaining / → stable)
```

**Important**: Tell users to weigh first thing in morning, after bathroom, before eating. Same conditions every day reduces noise.

---

## Q20: Potassium — The Underrated Nutrient

**Daily target:** 3,500–4,700 mg (most Indians get ~1,500–2,000 mg)

**Why it matters:**
- Counteracts sodium's blood pressure effect
- Critical for muscle contraction and nerve function
- Low potassium → muscle weakness, fatigue, cramps

**Alert:**
- `< 2,500mg/day for 3 consecutive days` → "Low potassium this week — add a banana (358mg), coconut water (600mg/glass), or extra dal to your meals"

---

## Quick Reference: Implementation Priority

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| P1 🔥 | Actionable absorption recommendations (hybrid template + LLM) | Medium | Very High |
| P1 🔥 | Adaptive TDEE recalculation (every 2 weeks) | Medium | Very High |
| P1 🔥 | EAT integration (add workout calories to TDEE) | Medium | High |
| P2 | Protein distribution alerts (>60% in one meal) | Low | High |
| P2 | Rate of fat loss monitoring (% BW/week) | Low | High |
| P2 | Fat type monitoring (SFA/MUFA/PUFA alerts) | Low | Medium |
| P2 | Potassium / sodium daily alerts | Low | Medium |
| P3 | GL modifier table (vinegar, cooling, fat) | Medium | Medium |
| P3 | Waist/hip body composition inputs | Medium | Medium |
| P3 | Metabolic adaptation detection (8-week) | Medium | High |
| P3 | TEF calculation | Low | Low |
| P4 | Diet break scheduling feature | High | Medium |
| P4 | Leptin visual explanation in insights | High | Medium |

---

*Last updated: 2026-04-23. This is a living document — update as features are implemented.*
