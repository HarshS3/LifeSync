# LifeSync: From Basic Tracker to Advanced Personal Life OS
## A Deep Research-Backed Architecture Report

**Date:** April 2026  
**Status:** Strategic Architecture Blueprint  
**Target:** Transform LifeSync into a meaning-driven wellness inference engine

---

## Executive Summary

Your current system logs nutrition, workouts, and mood—treating each day as **isolated data points**. The gap to "truly smart" requires four fundamental shifts:

1. **From Metrics to Causality**: Stop optimizing numbers; start detecting meaningful cause-effect patterns
2. **From Mass Data to High-Signal**: Fewer inputs with high confidence > volume of noise
3. **From Generic Rules to Personal Laws**: No TDEE calculator can predict your individual metabolism's response to macros
4. **From Reactive Logs to Predictive Inferences**: The system should anticipate states before they happen

---

## Part 1: The Science Behind "Smart" Health Systems

### 1.1 Homeostatic Load Theory (HLT)
Modern biohacking systems (Oura, HumanAPI, Levels) use **homeostatic load**—a measure of how far your body is from baseline equilibrium. This is fundamentally different from tracking isolated metrics.

**Current Gap:**  
✗ You track: "7.2 hours sleep, 2100 cal, 45g carbs, 8km run"  
✓ Smart systems infer: "Body is in recovery debt (high parasympathetic need) due to cumulative 3-day sleep deficit + intense training volume"

**How to implement:**
- Create a **Physiological Debt model** that tracks cumulative deviations from personal baseline
- Sleep debt, glycogen debt, central nervous system fatigue, musculoskeletal recovery state
- All expressed as a **recovery reserve percentage** (0–100%)
  - 80–100% = optimal for hard training
  - 50–80% = maintenance phase
  - 20–50% = recovery priority
  - 0–20% = critical recovery state

---

### 1.2 Temporal Dynamics & Chronobiology
Health isn't stateless—it has rhythm. Advanced systems model:
- **Circadian phase**: cortisol peak timing, melatonin baseline, chronotype
- **Ultradian cycles**: 90–120 min performance/recovery windows
- **Weekly patterns**: most people have weekend recovery patterns
- **Seasonal shifts**: vitamin D, ambient light, training capacity varies
- **Menstrual/hormonal cycles**: directly affects recovery capacity, performance ceiling, mood stability

**Current Gap:**  
✗ You calculate: "2100 cal requirement + 150g protein = goal"  
✓ Smart systems know: "Monday at 6am this user has low cortisol + high inflammation markers → sub-optimal window for HIIT. Better choice: Zone 2 work + protein-heavy breakfast at 7:30am"

**How to implement:**
- Store **chronotype confidence** per user (based on workout performance, sleep quality patterns)
- Track **daily circadian phase** (12-hour cycle of cortisol, HRV, body temperature)
- Model **recovery capacity ceiling** as a function of time-since-hard-training (peaks ~72h post-session)
- Build **decision trees for activity type** that consider circadian timing: `if cortisol_phase="rising" and sleep_quality="poor" and hrv_is_low → suggest_zone2_only`

---

### 1.3 Allostatic Load (Stress Accumulation)
All inputs—mental stress, training stress, dietary antigens, poor sleep, ambient toxins—contribute to **allostatic load**, a unified stress debt.

Research shows that tracking each modality separately (fitness stress vs. work stress) is useless without integrating them into a single **unified stress state**. The body doesn't differentiate between a hard workout and a work deadline; both trigger cortisol + inflammation.

**Advanced systems** (Oura HRV rings, HumanAPI) compute a **stress coherence score**: how well the person's input (sleep, training, nutrition, mental state) aligns with their current allostatic load. Misalignment = disease risk.

**Current Gap:**  
✗ You have: Sleep log, workout log, mood log (siloed)  
✓ Smart systems infer: "User is in high-allostatic-load state despite claiming 'good mood' in journal. Mismatch suggests burnout risk. Recommend 2-week deload protocol."

**How to implement:**
- Create an **AllostasticLoadState** schema that sums:
  - Training stress (TRIMP or RPE-based)
  - Psychological stress (from chat ingestion + journal sentiment analysis)
  - Dietary stress (inflammatory foods like seed oils, high omega-6:omega-3 ratio)
  - Sleep debt (days below personal baseline)
  - Infection/inflammation signals (symptom logs, elevated resting HR)
- Track **stress coherence deviation**: do the user's stated mood / energy / sleep correlate with their training volume?
- **Flag period mismatch**: "High stress claims but low training + normal sleep → might be work/relationship stress. Chat to understand."

---

### 1.4 Biomarker Inference Without Extra Tests
Your lab reports are sparse (quarterly at best). Smart systems **infer** biomarker states from observable proxies:

| Observable Signal | Inferred Biomarker | Measurement | Science |
|---|---|---|---|
| HRV + sleep timing | Autonomic balance (parasympathetic tone) | Time-domain HRV (RMSSD), frequency domain (HF/LF ratio) | Vagal tone predicts recovery capacity, infection risk |
| Workout RPE + recovery speed | Metabolic flexibility (fat vs. carb oxidation) | Time-to-peak HR recovery, lactate threshold | Low recovery speed suggests carb-dependent metabolism |
| Resting HR + training intensity | VO2 variability, cardiac efficiency | Resting HR trend + training load ratio | Rising resting HR despite lower training = overtraining or infection |
| Sleep quality + mood + focus | Cortisol rhythm, dopamine baseline | Sleep latency, sleep fragmentation, mood variation | Disrupted sleep = dysregulated HPA axis |
| Digestion speed + energy dip | Gut dysbiosis, food sensitivities | Time-to-postprandial energy crash, bloating reports | Delayed digestion = dysbiosis or IgG sensitivity |

**Current Gap:**  
✗ You wait 3 months for bloodwork  
✓ Smart systems predict: "Based on 3-week pattern of slow HR recovery + extended sleep latency + 2pm energy crash → likely low B12 + elevated inflammation. Test recommendation: iron panel + inflammatory markers."

---

### 1.5 Causal Discovery Algorithms
The real power gap: **moving from correlation to causation**.

Most trackers show "when you run, you sleep better"—but causation goes both ways:
- Does hard training *cause* good sleep? (direct mechanism)
- Does good sleep *enable* hard training? (enabling condition)
- Do both correlate to a third variable (low stress week)? (confounding)

Advanced systems use **causal inference models** (Granger causality, DAGs—Directed Acyclic Graphs, synthetic control methods) to disambiguate.

**Example:**
```
Question: Does low sleep → low workout performance?

Naive correlation: r = 0.6 (looks strong)

But causal DAG shows:
  High_stress → ↓Sleep
  High_stress → ↓Workout_Performance
  
True causation: Sleep doesn't cause poor workouts; both are caused by stress.

Intervention implication:
  ✗ Forcing 9 hours of sleep won't help
  ✓ Stress reduction will fix both
```

---

## Part 2: The Missing Layer—State Inference Engine

Your `DailyLifeState` schema exists but lacks the **inference engine** that actually computes it intelligently.

### 2.1 What Needs to Exist

#### A. Normalized Signal Computation
Each signal (sleep, mood, stress, energy, nutrition, training) must be:

1. **Locally normalized** (0–1 scale relative to personal baseline, not universal)
   - User A's "good sleep" is 6.5 hours; User B's is 8.5 hours
   - User A's "good mood" baseline is 5/10; User B's is 7/10
2. **Confidence-scored** based on data completeness
   - Wore no HR monitor? Sleep confidence = 0.3 (subjective estimate only)
   - Wore HR monitor + sleep tracker? Confidence = 0.85
3. **Anomaly-adjusted** (outliers get lower weight)
   - If user slept 2 hours (anomaly), don't use it to recalibrate baseline
4. **Contextually weighted** (account for life events)
   - Baseline after "normal week" ≠ baseline after "conference travel week"

**Implementation pattern:**
```javascript
// Pseudocode for normalized signal
computeSleepSignal(userId, dayKey) {
  const logs = await getSleepLogs(userId, dayKey);
  const baseline = await getPersonalBaseline(userId, 'sleep'); // 7.2 hours
  const variance = await getHistoricalVariance(userId, 'sleep'); // ±1.1 hours
  
  const rawHours = logs?.duration || null;
  
  // Missing data
  if (!rawHours) {
    return {
      value: null,
      confidence: 0, // Can't compute without data
      raw: null,
    };
  }
  
  // Outlier detection (z-score)
  const zScore = Math.abs((rawHours - baseline) / variance);
  const isOutlier = zScore > 3;
  
  if (isOutlier) {
    // Don't trust it for pattern learning, but log it
    return {
      value: null,
      confidence: 0.1, // Treat as suspect
      raw: { hours: rawHours, zScore, reason: 'outlier' },
    };
  }
  
  // Normalize to 0–1
  const normalizedValue = Math.min(1, Math.max(0, (rawHours - (baseline - 2*variance)) / (4*variance)));
  
  // Confidence based on data quality (sensor vs. manual)
  const confidence = logs.source === 'wearable' ? 0.9 : 0.6;
  
  return {
    value: normalizedValue,
    confidence,
    raw: { hours: rawHours, baseline, zScore },
  };
}
```

#### B. Multi-Signal Fusion (State Classification)
The `summaryState` (stable/overloaded/depleted/recovering) must use **probabilistic inference**, not hard rules.

**Current approach (likely):**
```javascript
if (sleep < 6 && stress > 0.7) {
  state = 'depleted';
}
```

**Advanced approach (Bayesian Network):**
```
P(State = depleted | sleep, stress, energy, recovery_debt) 
= combine signals using conditional probabilities learned from past user behavior

User's past 60 days:
- 8 days were "depleted": avg sleep=5.8h, stress=0.8, energy=0.2, recovery_debt=60%
- Pattern: depleted happens when ANY of [sleep<6 AND stress>0.7] OR [recovery_debt>55%]
- Confidence scales with how well the current day matches historical "depleted days"

Today: sleep=5.5h, stress=0.75, energy=0.25, recovery_debt=58%
→ P(depleted) = 0.88
→ Mark as "depleted" with high confidence
```

---

### 2.2 The Insight Gatekeeper: Real Implementation

Your `insightGatekeeper` exists but is likely too simplistic. Here's what it should actually do:

#### Rule: Never Speak Below Confidence Threshold
```javascript
const CONFIDENCE_THRESHOLDS = {
  silence: 0.4,        // Below this, say nothing. Ever.
  reflection: 0.6,     // "Have you noticed..."
  insight: 0.8,        // "Pattern detected: when you..."
  guidance: 0.95,      // "Try reducing night carbs" (only >95% AND user asks)
};

async function decideInsight(userId, dayKey, context) {
  const dailyLifeState = await DailyLifeState.findOne({ user: userId, dayKey });
  const patterns = await PatternMemory.find({ user: userId, status: 'active' });
  
  // Don't speak if state signals are low-confidence
  if (Object.values(dailyLifeState.signals).every(sig => sig.confidence < 0.5)) {
    return { mode: 'silence', reason: 'insufficient_data' };
  }
  
  // Find the most confident pattern match today
  const applicablePatterns = patterns
    .filter(p => p.confidence >= 0.6)
    .sort((a, b) => b.confidence - a.confidence);
  
  if (applicablePatterns.length === 0) {
    return { mode: 'silence', reason: 'no_pattern_match' };
  }
  
  const topPattern = applicablePatterns[0];
  
  // Check for contradictions (refusal to speak)
  const contradictionExists = await checkForContradiction(userId, topPattern, dailyLifeState);
  if (contradictionExists) {
    return { mode: 'silence', reason: 'contradiction_detected' };
  }
  
  // Escalate by confidence
  if (topPattern.confidence >= 0.95) {
    return { 
      mode: 'guidance', 
      pattern: topPattern,
      reason: 'high_confidence' 
    };
  } else if (topPattern.confidence >= 0.8) {
    return { 
      mode: 'insight', 
      pattern: topPattern,
      reason: 'pattern_detected' 
    };
  } else if (topPattern.confidence >= 0.6) {
    return { 
      mode: 'reflection', 
      pattern: topPattern,
      reason: 'gentle_observation' 
    };
  }
  
  return { mode: 'silence', reason: 'below_threshold' };
}
```

---

### 2.3 Pattern Memory: Real Computation

Your `PatternMemory` schema is designed but likely needs an **inference pipeline** to populate it.

**Advanced Pipeline (Causal Discovery + Confidence Scoring):**

```javascript
async function buildPatternsForUser(userId, lookbackDays = 60) {
  // 1. Collect all daily life states for the past 60 days
  const states = await DailyLifeState.find({
    user: userId,
    dateStart: { $gte: Date.now() - lookbackDays * 86400000 }
  }).sort({ dateStart: 1 });
  
  // 2. Identify "condition clusters" (similar low-signal days)
  const conditionDays = states.filter(s => 
    s.signals.sleep.value < 0.4 || 
    s.signals.stress.value > 0.7
  );
  
  // 3. For each condition cluster, find effects in next 3 days
  const patterns = [];
  
  for (const conditionDay of conditionDays) {
    const nextDays = states.filter(s => 
      s.dateStart > conditionDay.dateStart && 
      s.dateStart <= new Date(conditionDay.dateStart.getTime() + 3*86400000)
    );
    
    // 4. Calculate effect strength (did they actually feel worse?)
    const avgEnergyNext = nextDays.reduce((avg, day) => 
      avg + (day.signals.energy.value || 0), 0) / nextDays.length;
    
    const energyDrop = conditionDay.signals.energy.value - avgEnergyNext;
    
    // 5. Apply Granger causality test (simplified)
    // Does knowing yesterday's sleep significantly predict today's energy?
    const grangercausality = computeGrangerCausality(
      states, 
      ['sleep'], 
      'energy', 
      lag=1
    );
    
    if (grangercausality.pValue < 0.05) { // Statistically significant
      const pattern = {
        conditions: ['low_sleep'],
        effect: 'low_energy',
        window: 'next_day',
        supportCount: conditionDays.length,
        confidence: 0.3 + (grangercausality.fStat * 0.4), // Start low, boost by stats
        effectSize: Math.abs(energyDrop),
      };
      
      patterns.push(pattern);
    }
  }
  
  return patterns;
}
```

---

## Part 3: The Four Missing Intelligence Layers

### Layer 1: Metabolic Response Modeling
**What it does:** Learns your personal metabolic uniqueness.

**Current gap:**  
✗ "TDEE = 2100 calories"  
✓ Model: "You have high carb sensitivity before 12pm and fat-adapted in evening. Lunch: 50g carbs + 80g protein. Dinner: 60g fat + 40g protein."

**Implementation:**
- Segment day into **metabolic phases** (fed/fasted, sleep/wake, pre/post-training)
- For each phase, track **glucose response** (if user has CGM) or **inferred** (energy crash timing)
- Build logistic regression model:
  ```
  post_meal_energy_crash ~ meal_carbs + meal_timing + antecedent_activity + sleep_quality
  ```
- Output: personalized macro targets per time-of-day + training status

**Data requirements:**
- Continuous glucose monitor (CGM) data, OR
- Inferred from: meal logs + energy/focus timestamps + workout timing

---

### Layer 2: Sympathetic/Parasympathetic Balance Inference
**What it does:** Detects if user is in "fight-or-flight" or "rest-and-digest" state.

**Advanced signals:**
- HRV (Heart Rate Variability): measures parasympathetic tone
- Sleep structure: REM % and deep sleep % reflect nervous system recovery
- Response to stimuli: caffeine sensitivity, irritability patterns
- Training recovery: time-to-peak HR upon waking (fast = sympathetic dominance)

**Implementation:**
```javascript
function inferNervousSystemState(userId, dayKey) {
  // If user has HRV data, use it directly
  if (hrv.rmssd > 50) state = 'parasympathetic_dominant'; // Good recovery
  if (hrv.rmssd < 30) state = 'sympathetic_dominant'; // Stressed
  
  // Otherwise, infer from behavior proxies
  const proxies = {
    caffeine_sensitivity: (user drank 1 coffee, got jittery? likely sympathetic),
    morning_irritability: (journal had 3+ irritable entries? sympathetic),
    sleep_latency: (took 45min to fall asleep? sympathetic),
    rem_interruptions: (woke up 6times? sympathetic dysregulation),
  };
  
  return classifyNervousSystem(proxies);
}
```

---

### Layer 3: Predictive Deload Recommendation Engine
**What it does:** Anticipates burnout and recommends recovery before crisis.

**Why it matters:**
- Waiting for a user to crash is reactive
- Advanced systems predict 10–14 days before crash based on:
  - Accumulated training stress (cumulative TRIMP)
  - Psychological stress (work events + sleep disruption)
  - Allostatic load trajectory (is it rising?)

**Implementation:**
```javascript
async function recommendDeload(userId) {
  const pastDays = await DailyLifeState.find({
    user: userId,
    dateStart: { $gte: Date.now() - 28*86400000 }
  }).sort({ dateStart: 1 });
  
  // Compute rolling 7-day allostatic load
  const loads = pastDays.map(day => computeAllostasticLoad(day));
  const trend = linearRegression(loads);
  
  // If trend is increasing + already >60%, recommend deload in next 3–7 days
  if (trend.slope > 0 && Math.max(...loads) > 0.6) {
    return {
      recommendation: 'deload',
      urgency: 'moderate',
      duration: '5–7 days',
      reason: `Allostatic load rising (${trend.slope.toFixed(2)}/day). Without reset, crash risk in 10–14 days.`,
      suggestions: [
        'Reduce workout intensity to Zone 2 only',
        'Add 1–2h of sleep if possible',
        'Reduce caffeine + add magnesium glycinate 300mg before bed',
        'Journal to identify work stressors'
      ]
    };
  }
}
```

---

### Layer 4: Personalized Intervention Protocol Engine
**What it does:** Generates user-specific recovery and performance plans.

**Unlike TDEE calculators**, this engine:
- Has learned your **unique response patterns** (vs. population averages)
- Accounts for **time of day**, **circadian phase**, **recovery state**
- Provides **sequenced interventions** (not random advice)
- Adapts based on adherence history

**Example:**
```
User's pattern memory says:
"When sleep < 6h AND stress > 0.7, user experiences 3-day energy crash"

System **predicts**: "Sleep will be < 6h tonight due to work deadline + coffee at 3pm"

System recommends **sequence**:
  - Day 0 (tonight): No HIIT. 20min Zone 2 walk instead. Light dinner (easier digestion).
  - Day 1: 8h sleep priority. Magnesium + melatonin. Blue-light cutoff at 9pm.
  - Day 2: Recovery workout (yoga + breathing). 3g omega-3. No caffeine after 11am.
  - Day 3: Test return to normal training.
```

---

## Part 4: Implementation Roadmap (12-Week Sprint)

### Week 1–2: Foundation (Inference Engine)
**What to build:**
1. `computeNormalizedSignal()` function for each signal type
2. Bayesian state classifier (replaces if/else rules)
3. Unit tests proving signal computation is deterministic

**Files to create/modify:**
- `server/services/dailyLifeState/signalComputers/` (new directory)
  - `sleepSignal.js`
  - `stressSignal.js`
  - `energySignal.js`
  - `trainingLoadSignal.js`
  - `nutritionSignal.js`
- `server/services/dailyLifeState/stateClassifier.js` (Bayesian network)

**Deliverable:** DailyLifeState computes with confidence scores; all signals normalized per-user.

---

### Week 3–4: Pattern Discovery (Causal Engine)
**What to build:**
1. Granger causality detection
2. Pattern mining pipeline (find condition → effect relationships)
3. Support/confidence scoring

**Files to create:**
- `server/services/patternMemory/causalInference.js`
  - `grangercausality()` function
  - `detectConditionClusters()` function
- `server/services/patternMemory/patternBuilder.js`
  - Runs weekly, updates PatternMemory collection

**Deliverable:** PatternMemory populated with real, statistically-validated patterns.

---

### Week 5–6: Identity Learning (Personality Extraction)
**What to build:**
1. Extract stable truths from pattern clusters
2. Weight by stability (how long observed + consistency)
3. Surface to UI as "About You" facts

**Files to create:**
- `server/services/identityMemory/identityBuilder.js`
  - `extractClaimsFromPatterns()` function
  - Stability scoring algorithm

**Deliverable:** IdentityMemory populated; UI can show "Your body responds best to 7.5h sleep" with confidence.

---

### Week 7–8: Insight Gatekeeper (Real Versioning)
**What to build:**
1. 3–4 insight templates (reflection, pattern, guidance)
2. Strict gating logic (confidence thresholds)
3. AB test silent vs. noisy version

**Files to modify:**
- `server/services/insightGatekeeper/decideInsight.js`
  - Add contradiction detection
  - Add temporal gating (don't repeat same insight <7 days)
- `server/services/stateReflection/buildStateReflection.js`
  - Generate prose output

**Deliverable:** Insight gatekeeper only speaks when confident; default is silence.

---

### Week 9–10: Prediction Engine (Deload / Burnout Alerts)
**What to build:**
1. Allostatic load aggregator
2. Linear regression on load trajectory
3. Predictive alerts (7–10 days ahead)

**Files to create:**
- `server/services/forecast/allostasticLoadCompute.js`
- `server/services/forecast/burnoutPredictor.js`
- `server/routes/forecastRoutes.js` (new endpoint: GET /api/forecast/burnout)

**Deliverable:** User gets "In 8 days, burnout risk is moderate. Consider deload." 7 days before crash.

---

### Week 11–12: Integration & Polish
**What to test:**
1. End-to-end: new data input → signal update → pattern detection → insight decision
2. Performance: can compute 90-day history in <500ms?
3. UI: display new fields (confidence, pattern evidence, forecast)

---

## Part 5: UI/UX Shifts Required

Your current dashboard shows **metrics**. Advanced OS shows **state + context**.

### Current (Basic):
```
Sleep: 7.2h
Calories: 2100
Mood: 7/10
Workouts: 3
```

### Advanced (Contextual):
```
DAILY STATE: "Recovering" (confidence 0.82)
  ├─ ENERGY RESERVE: 65% (down from 78% yesterday)
  │   └─ Why: 3-day cumulative sleep deficit (-1.8h) + high training stress (TRIMP: 320)
  │
  ├─ NERVOUS SYSTEM: Sympathetic-dominant (HRV: 28ms, below personal baseline)
  │   └─ Recommendation: Avoid caffeine after 2pm. Yoga + 10min breathing tonight.
  │
  ├─ PATTERN MATCH: "Low sleep → next-day workout underperformance" (match 87%)
  │   └─ Yesterday: 5.8h sleep. Today: morning run 12% slower. On track with pattern.
  │
  └─ FORECAST: "Burnout risk moderate in 8 days if deload not taken"
      └─ Action: Reduce intensity Wed–Fri, then reassess.
```

---

## Part 6: Data Science Specifics

### 6.1 Bayes Factor as Confidence Metric
Instead of arbitrary 0.7 confidence, use **Bayes Factor**:
```
BF = P(data | pattern exists) / P(data | no pattern)

BF > 10 = strong evidence for pattern
BF > 3 = moderate evidence
BF < 1 = evidence against pattern (retirement candidate)
```

### 6.2 Decay Function for Old Patterns
Recent weeks matter more than months-old behavior.
```javascript
function decayScore(days_since_last_observed, current_date) {
  // Exponential decay: half-life = 30 days
  const half_life = 30;
  const decay = Math.pow(0.5, days_since_last_observed / half_life);
  
  return decay; // 1.0 if observed today, 0.5 if 30 days ago, 0.125 if 90 days ago
}

// Adjust confidence by decay
adjusted_confidence = base_confidence * decayScore(days_since_observed, today);
```

### 6.3 Simpson's Paradox Handling
Beware: a pattern true across days might be false within days. Example:
```
Aggregate: "High carbs → better performance" (paradox!)
  - Monday: 300g carbs, 6/10 energy (AFTER POOR SLEEP)
  - Tuesday: 100g carbs, 3/10 energy (AFTER ILLNESS)
  
Confounding variable: sleep quality + infection status
```

**Solution:** Stratify by confounders before claiming causation.
```javascript
// Check for confounders
const confounders = ['sleep_quality', 'stress_level', 'infection_status'];
const stratifiedPatterns = confounders.map(confounder => {
  return patternStrengthWithinStratum(pattern, confounder);
});

// Only report if consistent across strata
if (stratifiedPatterns.every(p => p.strength > 0.7)) {
  reportPattern(pattern);
}
```

---

## Part 7: Critical Warnings (Do Not Ignore)

### ⚠️ The Personalization Paradox
More data ≠ better inference. **With <30 days of data per user, confidence must stay <0.6.** Don't let the system claim to know someone it barely knows.

**Solution:** Explicitly track learn_period and boost confidence only after 60+ days of consistent, high-quality logging.

### ⚠️ Noise Amplification Risk
Chat ingestion is powerful but can inject bias. If a user is having a bad day and vents something untrue ("I never work out"), don't let one journal entry flip a well-established pattern.

**Solution:** Weight recent explicitly-logged data (workouts, food, sleep tracker) 3× higher than inferred/chat data.

### ⚠️ Regulatory & Liability
If your system recommends medical actions (e.g., "reduce medications"), you expose yourself to liability. **Keep the system strictly observational:**
- ✓ "Notice: your HRV patterns suggest parasympathetic dysregulation"
- ✗ "You have adrenal fatigue; here's your treatment plan"

---

## Conclusion: The 12-Week Transformation

By end of **Week 12**, you'll have:

✅ A **normalized signal engine** that learns per-user baselines  
✅ A **causal inference pipeline** that finds real patterns, not noise  
✅ A **prediction system** that anticipates burnout 7–10 days ahead  
✅ A **gatekeeper** that defaults to silence, speaks only with confidence  
✅ An **intelligence layer** that makes your logs meaningful  

Your users will go from:
- *"I logged 2100 calories today"* → *"My energy reserve is 65%, trending down. Here's why."*

---

## Immediate Next Steps

1. **Review Week 1–2 files** above; create `/server/services/dailyLifeState/signalComputers/` structure
2. **Implement `sleepSignal.js`** with z-score outlier detection + confidence scoring
3. **Write unit tests** proving `computeNormalizedSignal()` is deterministic
4. I'll help you code the inference pipeline in the next sprint.

What phase interests you most? Should we start with **normalized signals**, **pattern discovery**, or **prediction engine**?
