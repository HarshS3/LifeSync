const express = require('express');
const auth = require('../middleware/authMiddleware');
const svc = require('../services/commitments/commitmentService');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');

const router = express.Router();
router.use(auth);

// GET /api/commitments?kind=habit|long_term_goal
router.get('/', async (req, res) => {
  try {
    const { kind } = req.query;
    const items = await svc.listActive(req.userId, { kind });
    res.json(items);
  } catch (err) {
    console.error('[commitments] list error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to list commitments' });
  }
});

// POST /api/commitments  body: { kind, name, ...other }
router.post('/', async (req, res) => {
  try {
    const c = await svc.createCommitment(req.userId, req.body);
    res.status(201).json(c);
  } catch (err) {
    console.error('[commitments] create error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create commitment' });
  }
});

// PUT /api/commitments/:id
router.put('/:id', async (req, res) => {
  try {
    const c = await svc.updateCommitment(req.userId, req.params.id, req.body);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to update commitment' });
  }
});

// DELETE /api/commitments/:id  (soft archive)
router.delete('/:id', async (req, res) => {
  try {
    const c = await svc.archiveCommitment(req.userId, req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to archive commitment' });
  }
});

// POST /api/commitments/:id/log  body: { date, ...payload }
//   habit payload: { completed, value, notes }
//   long_term_goal payload: { status, relapseCount, intensity, trigger, notes, ... }
router.post('/:id/log', async (req, res) => {
  try {
    const { date, ...payload } = req.body || {};
    const log = await svc.upsertLog({
      userId: req.userId,
      commitmentId: req.params.id,
      date: date || new Date(),
      payload,
    });
    triggerDailyLifeStateRecompute({ userId: req.userId, date: log?.date, reason: 'commitment log' });
    res.json(log);
  } catch (err) {
    console.error('[commitments] log error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to log commitment' });
  }
});

// GET /api/commitments/:id/logs?start=&end=
router.get('/:id/logs', async (req, res) => {
  try {
    const { start, end } = req.query;
    const logs = await svc.listLogs({ userId: req.userId, commitmentId: req.params.id, start, end });
    res.json(logs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to list logs' });
  }
});

// GET /api/commitments/logs/today  — all today's logs across user's commitments
router.get('/logs/today', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const logs = await svc.listLogs({ userId: req.userId, start: today, end: tomorrow, limit: 50 });
    res.json(logs);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch today logs' });
  }
});

module.exports = router;
