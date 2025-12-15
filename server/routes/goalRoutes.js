const express = require('express');
const { Goal } = require('../models/Logs');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const goal = await Goal.create(req.body);
    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

module.exports = router;
