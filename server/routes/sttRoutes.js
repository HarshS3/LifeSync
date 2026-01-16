const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { googleRecognize } = require('../services/stt/googleStt');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024, // keep sync STT safe
  },
});

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

// POST /api/stt (multipart/form-data: audio=<file>)
router.post('/', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'audio file is required' });
    }

    const { mimetype, originalname, size } = req.file;
    const mime = String(mimetype || '').toLowerCase();
    const name = String(originalname || '').toLowerCase();

    const isWebm = mime.includes('webm') || name.endsWith('.webm');
    const isOgg = mime.includes('ogg') || name.endsWith('.ogg');
    const isWav = mime.includes('wav') || name.endsWith('.wav');

    if (!isWebm && !isOgg && !isWav) {
      return res.status(400).json({
        error: 'Unsupported audio type. Upload .webm (opus), .ogg (opus), or .wav',
      });
    }

    console.log('[STT] transcribe start', { userId: req.userId, mimetype, size });

    const out = await googleRecognize({
      buffer: req.file.buffer,
      mimeType: mimetype,
    });

    console.log('[STT] transcribe done', { userId: req.userId, chars: out?.transcript?.length || 0 });
    return res.json({ transcript: out.transcript || '', provider: out.provider });
  } catch (err) {
    console.error('[STT] transcribe failed:', err);
    return res.status(500).json({ error: err?.message || 'Failed to transcribe audio' });
  }
});

module.exports = router;
