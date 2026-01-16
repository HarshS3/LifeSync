const express = require('express');
const jwt = require('jsonwebtoken');

const { ingestFromChat } = require('../services/chatIngestion/ingestFromChat');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

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

// POST /api/chat-ingestion/preview
// Returns what would be written, without writing.
router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });

    const result = await ingestFromChat({ userId: req.userId, message, dryRun: true });
    res.json({ ...result, dryRun: true });
  } catch (err) {
    console.error('[chatIngestionRoutes] preview error:', err);
    res.status(500).json({ error: 'Preview failed' });
  }
});

// POST /api/chat-ingestion/commit
// Applies ingestion and triggers DailyLifeState recompute.
router.post('/commit', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });

    const result = await ingestFromChat({ userId: req.userId, message });
    if (result?.ingested) {
      triggerDailyLifeStateRecompute({ userId: req.userId, dayKey: result.dayKey, reason: 'chat_ingestion_commit' });
    }

    res.json({ ...result, dryRun: false });
  } catch (err) {
    console.error('[chatIngestionRoutes] commit error:', err);
    res.status(500).json({ error: 'Commit failed' });
  }
});

module.exports = router;
