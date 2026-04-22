# Conversational AI for Nutrition Logging — Implementation Plan

**Goal**: Transform the chat interface from a general Q&A assistant into a natural language meal logger that captures nutrition data through conversation, focusing on **deterministic intent extraction** before LLM invocation.

**Timeline**: 3–4 weeks (phased rollout)
**Scope**: Nutrition/meal logging only (fitness, mental, habits can follow later)

---

## Part 1: Issues with Current Assistant System

### Current State Problems

1. **Intent routing is fragile**
   - Mode detection (`detectAssistantMode`) is conservative but doesn't handle nutrition logging intents
   - System defaults to Q&A instead of logging
   - No explicit "nutrition logging" vs. "general question" branch

2. **Chat ingestion is too rigid**
   - Only extracts: sleep hours, stress level, energy level, mood, water intake
   - **Cannot extract meal/nutrition data** (the most common logging task)
   - Parser looks for explicit keywords ("slept", "stress", "water") → poor coverage
   - No fuzzy matching or semantic understanding

3. **Voice confirm flow is unclear**
   - Shows preview but UX for confirming/editing extracted data is missing
   - User has no way to refine transcript before commit
   - Nutrition logging requires **quantity + item name** precision that speech-to-text alone can't guarantee

4. **No meal parsing logic**
   - `ingestFromChat.js` has no food/meal extractors
   - Cannot parse "ate oatmeal with blueberries" or "had 2 eggs for breakfast"
   - Cannot map food names to nutrition database (INDB)

5. **Confidence & fallback handling weak**
   - Routes show warnings but don't offer alternatives
   - If STT fails, system says "use text" but doesn't guide user
   - No retry or clarification loop

---

## Part 2: High-Level Fix Strategy

### Phase 1: Fix Core Assistant System (Weeks 1)

**Goal**: Make current system more robust + add explicit nutrition logging path.

#### 1.1 Strengthen Intent Detection

**File**: `server/services/assistant/router.js` (new or extend)

```javascript
// Add explicit nutrition intent categories
function detectNutritionIntent(message) {
  const s = normalizeForIntent(message)
  
  // Meal logging patterns
  const mealLogPatterns = {
    'breakfast': /\b(breakfast|morning meal|ate breakfast|had breakfast|breakfast was)\b/,
    'lunch': /\b(lunch|midday meal|ate lunch|had lunch|lunch was)\b/,
    'dinner': /\b(dinner|evening meal|ate dinner|had dinner|dinner was)\b/,
    'snack': /\b(snack|ate|nibbled|snacked|munched)\b/,
    'drink': /\b(drank|had|water|juice|coffee|tea|smoothie)\b/,
  }
  
  // Intent types
  const intents = {
    'meal_log': /\b(ate|have|had|breakfast|lunch|dinner|snack|meal|food)\b/i,
    'nutrition_check': /\b(calories|carbs|protein|macros|nutrition|fat|fiber)\b/i,
    'diet_question': /\b(can i|should i eat|is.*good|diet|nutrition)\b/i,
  }
  
  // Return best match with confidence
  return determineTopIntent(s, intents)
}
```

**Changes**:
- Add `detectNutritionIntent()` function that identifies meal logging vs. general nutrition questions
- Confidence scoring: 0.9 for explicit ("I just ate"), 0.6 for implicit ("is pasta healthy?")
- Return structured intent: `{ category, confidence, mealType?, foods?, time? }`

#### 1.2 Create Nutrition Logging Intent Parser

**File**: `server/services/chatIngestion/mealExtractor.js` (new)

```javascript
/**
 * Extract meal components from natural language
 * Input: "just had grilled chicken with brown rice"
 * Output: {
 *   mealType: 'lunch',
 *   items: [
 *     { name: 'grilled chicken', quantity: null, unit: null, confidence: 0.8 },
 *     { name: 'brown rice', quantity: null, unit: null, confidence: 0.8 }
 *   ],
 *   time: null,
 *   confidence: 0.75
 * }
 */

function extractMealItems(text) {
  // Use INDB database to fuzzy-match food names
  // Extract quantities (pattern: NUMBER + UNIT)
  // Return list of {name, quantity, unit, confidence}
}

function inferMealType(text, timeOfDay) {
  // Tries to infer meal type from:
  // 1. Explicit mention ("breakfast", "lunch")
  // 2. Time of day
  // 3. Content (e.g., "eggs" often → breakfast)
}

function estimateNutrients(items, portion) {
  // Query INDB for each food
  // Apply portion multiplier
  // Return macro estimates with confidence
}
```

**Key logic**:
- Fuzzy match food names against INDB database (Levenshtein distance)
- Extract quantities using regex: `(\d+(?:\.\d+)?)\s*(oz|g|cup|tbsp|piece|slice|serving)`
- Fallback: if no quantity, use "standard serving" with lower confidence
- Estimate macros only if confidence ≥ 0.6

#### 1.3 Update Chat Ingestion Pipeline

**File**: `server/services/chatIngestion/ingestFromChat.js` (modify)

```javascript
// Add nutrition extraction to the pipeline

async function ingestFromChat({ userId, message, now = new Date() }) {
  const updates = []
  
  // Existing: mental log extraction
  // ...
  
  // NEW: Nutrition intent & meal extraction
  const nutritionIntent = detectNutritionIntent(message)
  
  if (nutritionIntent.confidence > 0.6) {
    const mealExtract = extractMealItems(message)
    const nutrients = await estimateNutrients(mealExtract.items)
    
    if (mealExtract.items.length > 0 && nutrients.confidence > 0.5) {
      updates.push({
        model: 'NutritionLog',
        patch: {
          meals: [{
            name: mealExtract.items.map(i => i.name).join(' + '),
            mealType: mealExtract.mealType,
            foods: mealExtract.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              sourceFoodId: `indb-${item.indbMatch?.id}`,
              sourceKind: 'chat-nlp',
              confidence: item.confidence,
              ...nutrients[item.name]  // Include macro estimates
            }))
          }]
        }
      })
    }
  }
  
  return { ingested: updates.length > 0, dayKey, updates }
}
```

---

### Phase 2: Build Meal Intent Extractor Service (Week 2)

**File**: `server/services/nutritionAI/mealIntentExtractor.js` (new)

```javascript
/**
 * Core meal extraction engine
 * Multi-pass extraction with fuzzy matching & semantic understanding
 */

class MealIntentExtractor {
  constructor(indbDatabase) {
    this.indb = indbDatabase  // { foods: [], nutrients: {} }
  }
  
  /**
   * Pass 1: Tokenize & POS tag (simple)
   */
  tokenize(text) {
    // Split on delimiters: "with", "and", "plus", "|", ","
    // Result: list of food/quantity terms
  }
  
  /**
   * Pass 2: Match food names against INDB
   * Uses fuzzy match (80%+ similarity threshold)
   */
  matchFoodNames(tokens) {
    return tokens.map(token => {
      const matches = fuzzyMatchIndb(token, this.indb.foods, 0.8)
      return {
        text: token,
        foodId: matches[0]?.id,
        foodName: matches[0]?.name,
        confidence: matches[0]?.score,
        alternates: matches.slice(1, 3)
      }
    })
  }
  
  /**
   * Pass 3: Extract quantities (NUMBER + UNIT patterns)
   */
  extractQuantities(text) {
    const pattern = /(\d+(?:\.\d+)?)\s*(oz|g|cup|tbsp|piece|slice|serving|grams|ounces)/gi
    const matches = text.matchAll(pattern)
    return Array.from(matches).map(m => ({
      quantity: parseFloat(m[1]),
      unit: m[2].toLowerCase(),
      match: m[0]
    }))
  }
  
  /**
   * Pass 4: Associate quantities with foods
   */
  associateQuantities(foods, quantities) {
    // Simple nearest-neighbor heuristic:
    // If "chicken 150g", assign 150g to chicken
    // If quantity found but no preceding food, use default serving
  }
  
  /**
   * Pass 5: Query nutritional data
   */
  async enrichWithNutrients(foodMatches) {
    return Promise.all(
      foodMatches.map(async food => {
        if (!food.foodId) return null
        
        const indbRecord = this.indb.foods.find(f => f.id === food.foodId)
        const quantityG = convertToGrams(food.quantity, food.unit)
        
        return {
          name: food.foodName,
          quantity: food.quantity,
          unit: food.unit,
          quantityG,
          sourceFoodId: food.foodId,
          sourceKind: 'chat-nlp',
          confidence: food.confidence,
          
          // Macros (scaled to portion)
          calories: (indbRecord.calsPerG * quantityG).toFixed(0),
          protein: (indbRecord.proteinPerG * quantityG).toFixed(1),
          carbs: (indbRecord.carbsPerG * quantityG).toFixed(1),
          fat: (indbRecord.fatPerG * quantityG).toFixed(1),
          fiber: (indbRecord.fiberPerG * quantityG).toFixed(1),
          
          // Confidence in the extraction
          extractionConfidence: calculateExtractedConfidence({
            foodMatch: food.confidence,
            quantityPresent: food.quantity ? true : false,
            unitClarity: food.unit ? 1.0 : 0.7
          })
        }
      })
    )
  }
  
  /**
   * Main entry point
   */
  async extract(message) {
    const tokens = this.tokenize(message)
    const foodMatches = this.matchFoodNames(tokens)
    const quantities = this.extractQuantities(message)
    const withQuantities = this.associateQuantities(foodMatches, quantities)
    const withNutrients = await this.enrichWithNutrients(withQuantities)
    
    return {
      rawText: message,
      items: withNutrients.filter(x => x),
      comprehensiveness: calculateComprehensiveness(withNutrients),
      confidence: Math.max(...withNutrients.map(x => x.extractionConfidence || 0))
    }
  }
}

module.exports = MealIntentExtractor
```

**Key features**:
- 5-pass extraction (tokenize → POS → quantity → associate → enrich)
- Fuzzy matching with Levenshtein distance to INDB food names
- Unit conversion (cups → grams, oz → grams)
- Macro estimation without LLM call
- Confidence scoring per item + overall

---

### Phase 3: Add Speech-to-Text Robustness (Week 2-3)

#### 3.1 STT Confidence Handling

**File**: `server/routes/sttRoutes.js` (new or extend)

```javascript
/**
 * Speech-to-text route
 * Handles browser fallback: if WebSpeechAPI fails, upload audio to server
 * Server can use: Google Cloud STT, AssemblyAI, Whisper (local), etc.
 */

router.post('/stt', authMiddleware, async (req, res) => {
  const { audioBase64, language = 'en-US' } = req.body
  
  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 required' })
  }
  
  try {
    // Call external STT service or local Whisper
    const result = await transcribeAudio(audioBase64, language)
    
    // result = {
    //   transcript: "I had grilled chicken with rice",
    //   confidence: 0.92,
    //   alternatives: [{text: "I had grilled chick with rice", confidence: 0.87}]
    // }
    
    return res.json({
      transcript: result.transcript,
      confidence: result.confidence,
      alternatives: result.alternatives,
      language
    })
  } catch (err) {
    return res.status(500).json({ error: 'STT failed: ' + err.message })
  }
})
```

#### 3.2 STT with Intent Extraction on Frontend

**File**: `client/src/services/voiceNutritionLogger.js` (new)

```javascript
/**
 * Frontend voice logging engine
 * Orchestrates: recording → STT → preview → commit
 */

export class VoiceNutritionLogger {
  constructor(apiBase, token) {
    this.apiBase = apiBase
    this.token = token
  }
  
  /**
   * Record audio and transcribe
   */
  async recordAndTranscribe() {
    const audioBlob = await recordAudio()  // Browser MediaRecorder
    const audioBase64 = blobToBase64(audioBlob)
    
    // Try browser STT first
    let transcript = await tryBrowserSTT(audioBlob)
    let confidence = 0.95
    
    // Fallback: send to server
    if (!transcript) {
      const result = await fetch(`${this.apiBase}/api/stt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ audioBase64 })
      }).then(r => r.json())
      
      transcript = result.transcript
      confidence = result.confidence
    }
    
    return { transcript, confidence }
  }
  
  /**
   * Preview what would be logged
   */
  async preview(transcript) {
    const res = await fetch(`${this.apiBase}/api/chat-ingestion/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ message: transcript })
    }).then(r => r.json())
    
    // res = {
    //   ingested: true,
    //   updates: [{
    //     model: 'NutritionLog',
    //     patch: { meals: [...] }
    //   }]
    // }
    
    return res
  }
  
  /**
   * User confirms & logs
   */
  async commit(transcript) {
    const res = await fetch(`${this.apiBase}/api/chat-ingestion/commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ message: transcript })
    }).then(r => r.json())
    
    return res
  }
}
```

---

### Phase 4: Build UI for Voice Nutrition Logging (Week 3)

#### 4.1 Voice Nutrition Confirm Modal

**File**: `client/src/components/VoiceNutritionConfirm.jsx` (new)

```jsx
/**
 * Shows extracted meal data with ability to edit before commit
 * 
 * Flow:
 * 1. Show transcript + extracted items
 * 2. User can add/remove items or adjust quantities
 * 3. On confirm → commit to backend
 */

export function VoiceNutritionConfirm({ transcript, preview, onConfirm, onCancel }) {
  const [editing, setEditing] = useState(false)
  const [editedItems, setEditedItems] = useState(preview?.updates?.[0]?.patch?.meals?.[0]?.foods || [])
  
  return (
    <Dialog open onClose={onCancel}>
      <DialogTitle>Confirm Meal Log</DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Transcript: "{transcript}"
        </Typography>
        
        {/* Show extracted items */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Detected Items:</Typography>
          {editedItems.map((item, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <TextField 
                label="Food" 
                value={item.name}
                size="small"
                disabled={!editing}
              />
              <TextField 
                label="Qty" 
                value={item.quantity || ''}
                size="small"
                disabled={!editing}
              />
              <TextField 
                label="Unit" 
                value={item.unit || 'g'}
                size="small"
                disabled={!editing}
              />
              <Typography variant="caption">
                ~{item.calories} cal
              </Typography>
              {editing && (
                <IconButton 
                  size="small" 
                  onClick={() => setEditedItems(editedItems.filter((_, i) => i !== idx))}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
        
        <Button 
          variant="text" 
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Done Editing' : 'Edit Items'}
        </Button>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onConfirm(editedItems)} variant="contained">
          Confirm & Log
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

#### 4.2 Integrate into ChatPanel

**File**: `client/src/components/ChatPanel.jsx` (modify)

```jsx
// Add voice nutrition logging button
function ChatPanel() {
  const voiceLogger = new VoiceNutritionLogger(API_BASE, token)
  const [confirmModal, setConfirmModal] = useState(null)
  
  const handleVoiceNutritionLog = async () => {
    setIsRecording(true)
    
    try {
      // Record & transcribe
      const { transcript, confidence } = await voiceLogger.recordAndTranscribe()
      console.log(`Transcribed (${(confidence * 100).toFixed(0)}%): ${transcript}`)
      
      // Preview extraction
      const preview = await voiceLogger.preview(transcript)
      
      if (preview.ingested && preview.updates?.[0]?.patch?.meals) {
        // Show confirm modal
        setConfirmModal({ transcript, preview, onConfirm: handleVoiceConfirm })
      } else {
        // No meal detected; just send as chat
        await sendMessageText(transcript)
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        from: 'system', 
        text: `Recording failed: ${err.message}` 
      }])
    } finally {
      setIsRecording(false)
    }
  }
  
  const handleVoiceConfirm = async (editedItems) => {
    try {
      await voiceLogger.commit(confirmModal.transcript)
      setMessages(prev => [...prev, {
        from: 'ai',
        text: `✓ Logged: ${editedItems.map(i => i.name).join(', ')}`
      }])
      setConfirmModal(null)
    } catch (err) {
      setMessages(prev => [...prev, { 
        from: 'system', 
        text: `Failed to log: ${err.message}` 
      }])
    }
  }
  
  return (
    <Box>
      {/* Chat messages */}
      
      {/* Input area */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField 
          placeholder="Chat or say a meal..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <Button onClick={sendMessage}>Send</Button>
        <Button 
          startIcon={<MicIcon />}
          onClick={handleVoiceNutritionLog}
          variant={isRecording ? 'contained' : 'outlined'}
        >
          {isRecording ? 'Recording...' : 'Voice Log'}
        </Button>
      </Box>
      
      {/* Confirm modal */}
      {confirmModal && (
        <VoiceNutritionConfirm 
          {...confirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </Box>
  )
}
```

---

### Phase 5: Testing & Refinement (Week 4)

#### 5.1 Unit tests for meal extraction

**File**: `server/tests/services/nutritionAI/mealIntentExtractor.test.js` (new)

```javascript
describe('MealIntentExtractor', () => {
  let extractor
  
  beforeEach(() => {
    const indbData = loadTestIndbDatabase()
    extractor = new MealIntentExtractor(indbData)
  })
  
  it('extracts simple meal: "ate chicken and rice"', async () => {
    const result = await extractor.extract('ate chicken and rice')
    expect(result.items).toHaveLength(2)
    expect(result.items[0].name).toBe('chicken')
    expect(result.items[1].name).toBe('rice')
    expect(result.confidence).toBeGreaterThan(0.7)
  })
  
  it('extracts with quantities: "150g chicken"', async () => {
    const result = await extractor.extract('150g chicken')
    expect(result.items[0].quantity).toBe(150)
    expect(result.items[0].unit).toBe('g')
    expect(result.items[0].calories).toBeGreaterThan(0)
  })
  
  it('handles fuzzy matches: "chickin" -> "chicken"', async () => {
    const result = await extractor.extract('ate chickin')
    expect(result.items[0].name).toBe('chicken')
  })
})
```

#### 5.2 Integration tests

**File**: `server/tests/routes/chatIngestion.integration.test.js` (new)

```javascript
describe('Chat Ingestion → Nutrition Logging', () => {
  it('logs meal via chat message', async () => {
    const user = await createTestUser()
    const { token } = await loginTestUser(user)
    
    const res = await request(app)
      .post('/api/chat-ingestion/commit')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Just ate 2 eggs and toast for breakfast' })
    
    expect(res.status).toBe(200)
    expect(res.body.ingested).toBe(true)
    
    const logs = await NutritionLog.find({ user: user._id })
    expect(logs).toHaveLength(1)
    expect(logs[0].meals[0].foods).toHaveLength(2)
  })
  
  it('preview shows extracted data without committing', async () => {
    const user = await createTestUser()
    const { token } = await loginTestUser(user)
    
    const res = await request(app)
      .post('/api/chat-ingestion/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'salmon salad for lunch' })
    
    expect(res.status).toBe(200)
    expect(res.body.ingested).toBe(true)
    expect(res.body.dryRun).toBe(true)
    
    // Verify nothing was actually logged
    const logs = await NutritionLog.find({ user: user._id })
    expect(logs).toHaveLength(0)
  })
})
```

---

## Part 3: Implementation Roadmap (Week-by-week)

### Week 1: Fix & Strengthen

**Monday–Wednesday**:
- [ ] Fix intent routing (`detectNutritionIntent`)
- [ ] Implement meal extraction logic (`mealExtractor.js`)
- [ ] Update `ingestFromChat` to handle meals
- [ ] Add INDB fuzzy matching

**Thursday–Friday**:
- [ ] Test meal parsing on 50+ common phrases
- [ ] Set confidence thresholds (0.6 = log, 0.4–0.6 = preview, <0.4 = chat)
- [ ] Document edge cases (abbreviations, regional foods, typos)

### Week 2: Add STT & Frontend

**Monday–Wednesday**:
- [ ] Implement `MealIntentExtractor` service (full class)
- [ ] Add `sttRoutes.js` for server-side transcription
- [ ] Build `VoiceNutritionConfirm` modal

**Thursday–Friday**:
- [ ] Integrate voice button into `ChatPanel`
- [ ] Test recording → transcription → preview → commit flow
- [ ] Manual QA with real voices

### Week 3: Refinement & Error Handling

**Monday–Wednesday**:
- [ ] Add clarification flows ("Did you mean salmon or halibut?")
- [ ] Handle multi-meal messages ("breakfast: eggs. Lunch: salad. Snacks: nuts")
- [ ] Confidence-based UI cues (show alternatives when <0.7)

**Thursday–Friday**:
- [ ] Write unit + integration tests (50+ test cases)
- [ ] Performance tuning (INDB lookup speed)

### Week 4: Polish & Launch

**Monday–Wednesday**:
- [ ] User testing sessions (5–10 users)
- [ ] Gather feedback on UX/accuracy
- [ ] Fix high-impact bugs

**Thursday–Friday**:
- [ ] Documentation + FAQs
- [ ] Deployment to staging → production

---

## Part 4: Success Metrics

### Adoption
- **% of logged meals via voice**: Target 20% within month 1
- **Avg time to log meal**: Target 30 sec (vs. 90 sec manual UI)

### Quality
- **Extraction accuracy**: Target 80%+ (matches INDB + reasonable quantities)
- **User satisfaction**: Target 4/5 or higher on ease-of-use

### Performance
- **STT latency**: <3 sec (browser STT mostly, server fallback <1 sec)
- **Intent extraction**: <100 ms per message
- **DB commits**: <500 ms

---

## Part 5: Future Phases (After Nutrition)

Once nutrition voice logging is stable:

1. **Fitness logging** ("did 30 min running, 7/10 intensity")
2. **Mental logging** ("stressed, energy 5/10, slept 8 hours")
3. **Multi-intent** ("slept 7 hours, ate salmon, feeling great")
4. **Corrections** ("no wait, I meant rice not pasta")
5. **Patterns** ("extract habit from logs, e.g., 'usually skip breakfast'")

---

## Appendix: Critical Constants & Thresholds

### Confidence Thresholds

```javascript
// When to log automatically (no preview)
const AUTO_LOG_CONFIDENCE = 0.80

// When to show preview for confirmation
const PREVIEW_MIN_CONFIDENCE = 0.50

// When to discard extraction entirely
const MIN_VIABLE_CONFIDENCE = 0.40

// Fuzzy match threshold for food names
const FOOD_MATCH_THRESHOLD = 0.80

// Quantity precision (if not specified, assume this much)
const DEFAULT_SERVING_SIZE_G = 150
```

### Quantity Unit Mapping

```javascript
const UNIT_TO_GRAMS = {
  'g': 1,
  'oz': 28.35,
  'cup': 240,
  'tbsp': 15,
  'tsp': 5,
  'piece': 100,  // fallback
  'slice': 50,   // fallback
  'serving': 150 // fallback
}
```

---

## Feedback & Next Steps

This plan prioritizes:
1. **Accuracy first** (deterministic parsing before LLM)
2. **User control** (preview before commit)
3. **Fast iteration** (weekly tests + feedback loops)
4. **Low friction** (voice + confirmation modal)

Once approved, we can begin Phase 1 immediately. Questions?
