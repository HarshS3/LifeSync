const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const LabReport = require('../models/LabReport');
const { dayKeyFromDate } = require('../services/dailyLifeState/dayKey');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

let ocrWorkerPromise = null;
let ocrQueue = Promise.resolve();

function enqueueOcr(task) {
  const run = () => Promise.resolve().then(task);
  const p = ocrQueue.then(run, run);
  ocrQueue = p.catch(() => {});
  return p;
}

async function getOcrWorker() {
  if (ocrWorkerPromise) return ocrWorkerPromise;
  ocrWorkerPromise = (async () => {
    const mod = await import('tesseract.js');
    const createWorker = mod?.createWorker || mod?.default?.createWorker;
    if (typeof createWorker !== 'function') {
      throw new Error('tesseract.js createWorker() not available');
    }

    // NOTE: Don't pass functions (like logger callbacks) into worker options.
    // Node's structured clone (Node 24+) will throw DataCloneError.
    const worker = await createWorker();
    if (typeof worker.loadLanguage === 'function' && typeof worker.initialize === 'function') {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
    }
    return worker;
  })();
  return ocrWorkerPromise;
}

async function ocrImageBuffer(buffer) {
  const worker = await getOcrWorker();
  const result = await worker.recognize(buffer);
  const text = result?.data?.text ? String(result.data.text) : '';
  return text;
}

async function extractTextFromPdfBuffer(buffer) {
  const data = await pdfParse(buffer);
  const text = data?.text ? String(data.text) : '';
  return text;
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// OCR an uploaded lab image (temporary feature: prints OCR output to server console)
// POST /api/labs/ocr (multipart/form-data: image=<file>)
router.post('/ocr', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'image file is required' });
    }

    const { originalname, mimetype, size } = req.file;
    console.log('[Lab OCR] start', { userId: req.userId, originalname, mimetype, size });

    const name = String(originalname || '').toLowerCase();
    const isPdf = mimetype === 'application/pdf' || name.endsWith('.pdf');
    const isImage = typeof mimetype === 'string' && mimetype.startsWith('image/');
    if (!isPdf && !isImage) {
      return res.status(400).json({
        error: 'Unsupported file type. Upload an image (PNG/JPG) or a PDF.',
      });
    }

    // PDFs: attempt direct text extraction (works for text-based lab PDFs).
    // Images: use OCR.
    if (isPdf) {
      const text = await extractTextFromPdfBuffer(req.file.buffer);
      console.log('[Lab OCR] extracted text (pdf):\n' + text);
      return res.json({ text });
    }

    const text = await enqueueOcr(() => ocrImageBuffer(req.file.buffer));

    console.log('[Lab OCR] extracted text:\n' + text);
    res.json({ text });
  } catch (err) {
    console.error('[Lab OCR] failed:', err);
    res.status(500).json({ error: 'Failed to OCR image' });
  }
});

function parseDateParam(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function flagResult({ value, refRangeLow, refRangeHigh }) {
  const n = Number(value);
  const low = refRangeLow == null ? null : Number(refRangeLow);
  const high = refRangeHigh == null ? null : Number(refRangeHigh);

  if (!Number.isFinite(n) || (!Number.isFinite(low) && !Number.isFinite(high))) return 'unknown';
  if (Number.isFinite(low) && n < low) return 'low';
  if (Number.isFinite(high) && n > high) return 'high';
  return 'normal';
}

// List lab reports (range queries)
// GET /api/labs?start=YYYY-MM-DD&end=YYYY-MM-DD&panelName=CBC&limit=50
router.get('/', authMiddleware, async (req, res) => {
  try {
    const start = parseDateParam(req.query.start);
    const end = parseDateParam(req.query.end);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 30));

    const query = { user: req.userId };
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = start;
      if (end) query.date.$lte = end;
    }

    if (req.query.panelName) {
      query.panelName = String(req.query.panelName).trim();
    }

    const reports = await LabReport.find(query).sort({ date: -1 }).limit(limit);
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lab reports' });
  }
});

// Latest lab report
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const report = await LabReport.findOne({ user: req.userId }).sort({ date: -1 });
    res.json(report || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest lab report' });
  }
});

// Create lab report
// POST /api/labs { date?, panelName, results: [{name,value,unit,refRangeLow,refRangeHigh,notes?}], notes? }
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, panelName, results, notes, source } = req.body;
    if (!panelName || !String(panelName).trim()) {
      return res.status(400).json({ error: 'panelName is required' });
    }

    const normalizedResults = Array.isArray(results)
      ? results
          .map((r) => {
            const name = String(r?.name || '').trim();
            if (!name) return null;
            const value = r?.value;
            const unit = r?.unit != null ? String(r.unit).trim() : '';
            const refRangeLow = r?.refRangeLow == null || r.refRangeLow === '' ? null : Number(r.refRangeLow);
            const refRangeHigh = r?.refRangeHigh == null || r.refRangeHigh === '' ? null : Number(r.refRangeHigh);
            const computedFlag = r?.flag ? String(r.flag) : flagResult({ value, refRangeLow, refRangeHigh });
            return {
              name,
              value,
              unit,
              refRangeLow,
              refRangeHigh,
              flag: ['low', 'high', 'normal', 'unknown'].includes(computedFlag) ? computedFlag : 'unknown',
              notes: r?.notes != null ? String(r.notes) : '',
            };
          })
          .filter(Boolean)
          .slice(0, 200)
      : [];

    const doc = await LabReport.create({
      user: req.userId,
      date: date ? new Date(date) : new Date(),
      panelName: String(panelName).trim(),
      results: normalizedResults,
      notes: notes ? String(notes) : '',
      source: source ? String(source) : 'manual',
    });

    triggerDailyLifeStateRecompute({ userId: req.userId, date: doc?.date, reason: 'labRoutes create' });

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lab report' });
  }
});

// Update lab report
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const before = await LabReport.findOne({ _id: req.params.id, user: req.userId }).select('date');

    const updates = {};
    if (req.body.date != null) updates.date = new Date(req.body.date);
    if (req.body.panelName != null) updates.panelName = String(req.body.panelName).trim();
    if (req.body.notes != null) updates.notes = String(req.body.notes);
    if (req.body.source != null) updates.source = String(req.body.source);

    if (req.body.results !== undefined) {
      const results = req.body.results;
      updates.results = Array.isArray(results)
        ? results
            .map((r) => {
              const name = String(r?.name || '').trim();
              if (!name) return null;
              const value = r?.value;
              const unit = r?.unit != null ? String(r.unit).trim() : '';
              const refRangeLow = r?.refRangeLow == null || r.refRangeLow === '' ? null : Number(r.refRangeLow);
              const refRangeHigh = r?.refRangeHigh == null || r.refRangeHigh === '' ? null : Number(r.refRangeHigh);
              const computedFlag = r?.flag ? String(r.flag) : flagResult({ value, refRangeLow, refRangeHigh });
              return {
                name,
                value,
                unit,
                refRangeLow,
                refRangeHigh,
                flag: ['low', 'high', 'normal', 'unknown'].includes(computedFlag) ? computedFlag : 'unknown',
                notes: r?.notes != null ? String(r.notes) : '',
              };
            })
            .filter(Boolean)
            .slice(0, 200)
        : [];
    }

    const doc = await LabReport.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: 'Not found' });

    const beforeKey = before?.date ? dayKeyFromDate(before.date) : null;
    const afterKey = doc?.date ? dayKeyFromDate(doc.date) : null;
    if (beforeKey) triggerDailyLifeStateRecompute({ userId: req.userId, dayKey: beforeKey, reason: 'labRoutes update (before)' });
    if (afterKey && afterKey !== beforeKey) triggerDailyLifeStateRecompute({ userId: req.userId, dayKey: afterKey, reason: 'labRoutes update (after)' });

    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lab report' });
  }
});

// Delete lab report
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await LabReport.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    triggerDailyLifeStateRecompute({ userId: req.userId, date: doc?.date, reason: 'labRoutes delete' });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete lab report' });
  }
});

module.exports = router;
