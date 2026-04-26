const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { NutritionLog } = require('../models/Logs');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// In-memory multer — no disk writes
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── helpers ──────────────────────────────────────────────────────────────────

const DAILY_FIELDS = ['calories','protein','carbs','fat','fiber','sugar','sodium','potassium','iron','calcium','vitaminB','magnesium','zinc','vitaminC','omega3','saturatedFat','monounsaturatedFat','polyunsaturatedFat','cholesterol','phosphorus','copper','vitaminB9','vitaminB12','folate'];

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d)   { const x = startOfDay(d); x.setDate(x.getDate()+1); return x; }

function recalcTotals(log) {
  const t = {}; DAILY_FIELDS.forEach(f => { t[f] = 0; });
  (log.meals||[]).forEach(m => (m.foods||[]).forEach(f => DAILY_FIELDS.forEach(k => { t[k] += Number(f[k]||0); })));
  (log.supplements||[]).forEach(s => { const n=s.nutriments||{}; DAILY_FIELDS.forEach(k=>{ t[k]+=Number(n[k]||0); }); });
  DAILY_FIELDS.forEach(k => { t[k] = Math.round(t[k]*10)/10; });
  return t;
}

// ── Vision Analysis ──────────────────────────────────────────────────────────

const VISION_PROMPT = `You are a nutrition expert identifying Indian and international food.
Analyze this photo of food. Return ONLY valid JSON with this exact structure (no markdown):
{
  "detected": [
    {
      "name": "Food name",
      "quantity": <number>,
      "unit": "g | ml | piece | serving",
      "estimatedCalories": <number>,
      "estimatedProtein": <number>,
      "estimatedCarbs": <number>,
      "estimatedFat": <number>,
      "confidence": "high | medium | low"
    }
  ],
  "mealType": "breakfast | lunch | dinner | snack",
  "overallConfidence": "high | medium | low",
  "notes": "Any relevant observation"
}

Rules:
- For Indian dishes, assume standard single serving unless clearly multiple servings visible.
- If you see a thali, list each component separately.
- Reasonable defaults: 1 roti = 30g, 1 katori = 150ml, 1 glass = 250ml.
- If you cannot identify a food with at least medium confidence, skip it.
- Set overallConfidence to "low" if fewer than half the items are identifiable.
Return ONLY the JSON object, no explanation.`;

async function analyzeImageWithGemini(imageBase64, mimeType) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: VISION_PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini Vision error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract JSON from response
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('No valid JSON in Gemini response');
  return JSON.parse(text.slice(start, end + 1));
}

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/photo-log/analyze
router.post('/analyze', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64   = req.file.buffer.toString('base64');

    const result = await analyzeImageWithGemini(base64, mimeType);

    // Return detected items with flags for UI editing
    res.json({
      detected:          result.detected || [],
      mealType:          result.mealType || 'snack',
      overallConfidence: result.overallConfidence || 'medium',
      notes:             result.notes || '',
    });
  } catch (err) {
    console.error('[PhotoLog] analyze error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to analyze image' });
  }
});

// POST /api/photo-log/commit
router.post('/commit', authMiddleware, async (req, res) => {
  try {
    const { items, mealType } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items to commit' });
    }

    const now   = new Date();
    const start = startOfDay(now);
    const end   = endOfDay(now);

    let log = await NutritionLog.findOne({ user: req.userId, date: { $gte: start, $lt: end } }).sort({ date: -1 });
    if (!log) {
      log = new NutritionLog({ user: req.userId, date: start, meals: [], supplements: [], waterIntake: 0 });
    }

    const mealName = items.map(i => i.name).join(' + ');
    const foods = items.map(item => ({
      name:               String(item.name || ''),
      quantity:           Number(item.quantity || 1),
      unit:               String(item.unit || 'g'),
      calories:           Number(item.estimatedCalories || item.calories || 0),
      protein:            Number(item.estimatedProtein  || item.protein  || 0),
      carbs:              Number(item.estimatedCarbs    || item.carbs    || 0),
      fat:                Number(item.estimatedFat      || item.fat      || 0),
      fiber:              Number(item.fiber    || 0),
      sugar:              Number(item.sugar    || 0),
      sodium:             Number(item.sodium   || 0),
      potassium:          Number(item.potassium|| 0),
      iron:               Number(item.iron     || 0),
      calcium:            Number(item.calcium  || 0),
      vitaminC:           Number(item.vitaminC || 0),
      magnesium:          Number(item.magnesium|| 0),
      zinc:               Number(item.zinc     || 0),
      sourceFoodId:       'photo-vision',
      sourceKind:         'photo-log',
    }));

    const totalCalories = foods.reduce((s, f) => s + f.calories, 0);
    const totalProtein  = foods.reduce((s, f) => s + f.protein, 0);
    const totalCarbs    = foods.reduce((s, f) => s + f.carbs, 0);
    const totalFat      = foods.reduce((s, f) => s + f.fat, 0);

    log.meals.push({
      name:          mealName,
      mealType:      (mealType || 'snack').toLowerCase(),
      time:          now.toTimeString().slice(0, 5),
      foods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
    });

    log.dailyTotals = recalcTotals(log);
    await log.save();

    try { triggerDailyLifeStateRecompute({ userId: req.userId, date: start, reason: 'photo_log' }); } catch {}

    res.json({
      success:    true,
      mealName,
      totalCalories: Math.round(totalCalories),
      totalProtein:  Math.round(totalProtein * 10) / 10,
      logId:         log._id.toString(),
      mealIndex:     log.meals.length - 1,
    });
  } catch (err) {
    console.error('[PhotoLog] commit error:', err.message);
    res.status(500).json({ error: 'Failed to save photo log' });
  }
});

module.exports = router;
