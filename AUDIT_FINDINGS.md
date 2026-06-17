# LifeSync Server Audit: 15 Critical & High-Severity Issues

## Executive Summary
The backend has **hardcoded logic that only works for Indian deployments** and **brittle string/array handling** that can crash or silently fail. These issues block international expansion and cause data corruption in edge cases.

---

## CRITICAL (Fix this week)

### 1. ❌ Global Timezone Override
**File**: `server/index.js:2`
```javascript
process.env.TZ = 'Asia/Kolkata';  // BREAKS international use
```
**Problem**: All dates use IST globally. User in US on Dec 31 11:59 PM logs dinner → server sees Jan 1 2:30 AM IST (next day) → logged under wrong date.

**Fix**:
```javascript
// Remove line 2
// Use UTC internally, convert on display:
const toUserTimezone = (date, userTZ = 'Asia/Kolkata') => {
  return new Date(date.toLocaleString('en-US', { timeZone: userTZ }));
};
```

---

### 2. ❌ Auth Token Extraction (12+ routes)
**Files**: `authRoutes.js:66`, `aiRoutes.js:66/352`, `chatIngestionRoutes.js:16`, etc.
```javascript
const authHeader = req.headers.authorization;
const token = authHeader.split(' ')[1];  // CRASHES if no token
jwt.verify(token, JWT_SECRET);
```
**Problem**: If client sends `Authorization: Bearer` (missing token), `split(' ')[1]` is `undefined`. `jwt.verify(undefined)` crashes.

**Fix** (create middleware):
```javascript
// middleware/validateToken.js
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }
  
  const token = parts[1];
  try {
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Use in all routes:
router.get('/some-endpoint', validateToken, (req, res) => {
  // req.userId is now guaranteed valid
});
```

---

### 3. ❌ Array Indexing Without Bounds
**File**: `server/routes/gymRoutes.js:379`
```javascript
const exHistory = [...].sort(...);  // [0], [1], [2]?
const heldExactlyTwice = s1.maxWeight === s2.maxWeight && (exHistory[2]?.maxWeight !== s1.maxWeight);
```
**Problem**: If user has 2 workouts, `exHistory[2]` is `undefined`. Progression check never fires.

**Fix**:
```javascript
const exHistory = [...].sort(...);
if (exHistory.length >= 2) {
  const s1 = exHistory[0];
  const s2 = exHistory[1];
  const s3 = exHistory.length >= 3 ? exHistory[2] : null;
  const heldExactlyTwice = s1.maxWeight === s2.maxWeight && (!s3 || s3.maxWeight !== s1.maxWeight);
  // ...
}
```

---

### 4. ❌ String Split Without Validation
**File**: `server/services/dailyLifeState/upsertDailyLifeState.js:31`
```javascript
const dayOfMonth = parseInt(dayKey.split('-')[2]);  // dayKey must be YYYY-MM-DD
```
**Problem**: If `dayKey='2024'` (malformed), `split('-')[2]` is `undefined`, `parseInt(undefined)` returns `NaN`. Metabolic calibration silently disabled.

**Fix**:
```javascript
// Validate format first
if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
  throw new Error(`Invalid dayKey format: ${dayKey}. Expected YYYY-MM-DD`);
}
const dayOfMonth = parseInt(dayKey.split('-')[2], 10);
```

---

## HIGH SEVERITY (Fix in next 2 weeks)

### 5. ❌ Meal Types Hardcoded in 4 Places
**Files**: 
- `server/models/Logs.js:26` (schema enum)
- `server/routes/nutritionRoutes.js:906` (mealTypeCount object)
- `server/services/nutritionAI/nutritionAgent.js:106` (tool enum)
- `server/models/User.js:137-140` (default schedule)

**Problem**: Adding new meal type requires changes in 4+ files. Miss one = silent failures.

**Fix** (create constant):
```javascript
// server/constants/mealTypes.js
module.exports = {
  MEAL_TYPES: ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout'],
  
  MEAL_TYPE_DEFAULTS: {
    breakfast: { startHour: 7, endHour: 9 },
    lunch: { startHour: 12, endHour: 14 },
    dinner: { startHour: 19, endHour: 21 },
    snack: { startHour: 10, endHour: 11 },
  },
};

// Import everywhere:
const { MEAL_TYPES } = require('../constants/mealTypes');

// Use in schema:
mealType: { type: String, enum: MEAL_TYPES },

// Use in routes:
const mealTypeCount = MEAL_TYPES.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});
```

---

### 6. ❌ Food Intent Detection (Hardcoded, Fragile)
**File**: `server/services/chatIngestion/ingestFromChat.js:108-136`
```javascript
const hasFoodWord = /\b(roti|chapati|rice|dal|...|pizza|burger)\b/i.test(s);
```
**Problem**: 
1. Only Indian + common foods. New cuisines not detected.
2. Typos not handled: "ricie" doesn't match "rice".
3. Quantity regex `\d+\s+\w+` matches gibberish: "5 xyz" incorrectly flags as food.

**Fix**:
```javascript
// server/constants/foods.js
module.exports = {
  FOOD_KEYWORDS: {
    indian: ['roti', 'chapati', 'dal', 'dosa', 'poha', ...],
    western: ['pizza', 'burger', 'pasta', 'salad', ...],
    proteins: ['chicken', 'egg', 'paneer', 'tofu', ...],
    // ... group by category for easier updates
  },
  
  VALID_QUANTITY_UNITS: ['g', 'kg', 'ml', 'l', 'cup', 'bowl', 'plate', 'piece'],
};

// Use with fuzzy matching:
const Fuse = require('fuse.js');
const foodList = Object.values(FOOD_KEYWORDS).flat();
const fuse = new Fuse(foodList, { threshold: 0.4 });
const matchedFood = fuse.search(userInput).length > 0;  // Handles typos
```

---

### 7. ❌ Magic Numbers Without Context
**File**: `server/services/nutritionEngine.js`
```javascript
aggressive_loss: -750,  // Why 750? kcal/day? kcal/week?
lean_gain: 300,         // Unclear source
protein_targets: [1.6, 2.4, 2.8],  // Without unit/context
```
**Problem**: If formulas update (ISSN updates recommendations), unclear which constants changed. Maintenance nightmare.

**Fix**:
```javascript
// server/constants/nutritionRecommendations.js
module.exports = {
  // Caloric deficit/surplus (kcal/day)
  // Source: ACSM Position Stand on Nutrition & Athletic Performance
  CALORIC_MODIFIERS: {
    aggressive_loss: -750,    // ~1.5 lbs/week deficit
    mild_loss: -350,          // ~0.7 lbs/week deficit
    maintenance: 0,
    lean_gain: 300,           // ~0.6 lbs/week surplus
    aggressive_gain: 600,     // ~1.2 lbs/week surplus
  },
  
  // Protein targets (g/kg lean body mass)
  // Source: ISSN 2017 Position Stand
  PROTEIN_TARGETS: {
    sedentary: 1.6,           // Minimum RDA
    resistance_training: 2.2, // For muscle building
    high_volume: 2.8,         // For athletes, cutting
  },
  
  // Katch-McArdle BMR formula: BMR = 370 + (21.6 × LBM_kg)
  // Source: Katch & McArdle (1977)
  KATCH_MCARDLE: {
    INTERCEPT: 370,
    SLOPE: 21.6,
    REFERENCE: 'Katch & McArdle (1977)',
  },
  
  // RDA targets (daily, from USDA/WHO)
  VITAMIN_TARGETS: {
    vitaminB1: { mg: 1.2, reference: 'Adult male RDA' },
    vitaminB2: { mg: 1.3, reference: 'Adult male RDA' },
    // ... all with sources
  },
};

// Use:
const deficitKcal = CALORIC_MODIFIERS[metabolicGoal];
```

---

### 8. ❌ Timezone Math Error
**File**: `server/services/nutritionAggregation/weeklyAggregator.js:60-65`
```javascript
weekStart.setUTCHours(-5, -30, 0, 0);  // IST -5:30? Breaks at DST
weekEnd.setUTCHours(23 - 5, 59 - 30, 59, 999);  // 18:29:59
```
**Problem**: Manual arithmetic. If IST offset changes (unlikely but hypothetically), this breaks.

**Fix**:
```javascript
// Use consistent UTC conversion
const userTZ = 'Asia/Kolkata';
const dateInTZ = new Date(date).toLocaleString('en-CA', {
  timeZone: userTZ,
  year: 'numeric', month: '2-digit', day: '2-digit'
}).replace(/\//g, '-');

const [y, m, d] = dateInTZ.split('-');
const startUTC = new Date(Date.UTC(y, m-1, d, 0, 0, 0, 0));
const endUTC = new Date(Date.UTC(y, m-1, d, 23, 59, 59, 999));
```

---

## MEDIUM SEVERITY (Fix in next 4 weeks)

### 9-13. Date Parsing, Type Coercion, Array Sorting
See full audit file for details. These are less critical but can cause silent failures:
- Date parsing ignores timezone
- NaN propagation in nutrition calculations
- Unstable sorts when array elements missing

---

## Testing Checklist

```javascript
// Add to test suite:

// Test 1: Auth with malformed header
test('should reject malformed Authorization header', async () => {
  const res = await request(app)
    .get('/api/nutrition/daily-summary/2024-01-15')
    .set('Authorization', 'Bearer');  // Missing token
  expect(res.status).toBe(401);
});

// Test 2: Array bounds
test('should handle <3 workouts without crash', async () => {
  const user = { id: '123', workouts: [{...}, {...}] };  // 2 only
  const result = getProgressionSuggestion(user.workouts);
  expect(result).toBeNull();  // No crash
});

// Test 3: Malformed dayKey
test('should reject invalid dayKey format', () => {
  expect(() => extractDayOfMonth('2024')).toThrow(/Invalid dayKey/);
  expect(extractDayOfMonth('2024-01-15')).toBe(15);
});

// Test 4: Timezone edge cases
test('should log meal on correct date across timezones', async () => {
  // Dec 31 11:59 PM UTC-5 = Jan 1 4:59 AM UTC
  const res = await api.post('/nutrition/logs', {
    dateStr: '2024-12-31',
    timeStr: '23:59',
    userTZ: 'America/New_York',
  });
  expect(res.log.date).toEqual(new Date('2024-12-31'));
});
```

---

## Priority Order

**This Week:**
1. Extract meal types to constants (blocks scaling)
2. Fix token extraction with middleware (security)
3. Add array bounds checks (prevents crashes)
4. Validate dayKey format (prevents silent failures)

**Next 2 Weeks:**
1. Move timezone handling to config
2. Extract magic numbers to nutrition config
3. Improve food intent detection

**Next Month:**
1. Centralize date handling (UTC + user TZ conversion)
2. Add type validation middleware
3. Add comprehensive test suite for edge cases

---

## Files to Create/Modify

**Create:**
- `server/constants/mealTypes.js`
- `server/constants/nutritionRecommendations.js`
- `server/constants/foods.js`
- `server/middleware/validateToken.js`
- `server/tests/edge-cases.test.js`

**Modify:**
- Remove line 2 from `server/index.js`
- Replace token extraction in 12 routes with middleware
- Update all date/timezone logic
- Add validation to all string parsing

