const express = require('express');
const jwt = require('jsonwebtoken');
const { WardrobeItem, Outfit } = require('../models/Wardrobe');
const { generateLLMReply } = require('../aiClient');

const router = express.Router();

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all wardrobe items
router.get('/wardrobe', auth, async (req, res) => {
  try {
    const items = await WardrobeItem.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch wardrobe' });
  }
});

// Add wardrobe item
router.post('/wardrobe', auth, async (req, res) => {
  try {
    const item = await WardrobeItem.create({
      ...req.body,
      user: req.userId,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update wardrobe item
router.put('/wardrobe/:id', auth, async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $set: req.body },
      { new: true }
    );
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete wardrobe item
router.delete('/wardrobe/:id', auth, async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get outfit suggestion using AI
router.post('/suggest', auth, async (req, res) => {
  try {
    const { occasion = 'casual', weather = 'mild' } = req.body;
    
    // Get user's wardrobe
    const wardrobe = await WardrobeItem.find({ user: req.userId });
    
    if (wardrobe.length < 3) {
      return res.status(400).json({ error: 'Add more items to your wardrobe first' });
    }

    // Build wardrobe context for AI
    const wardrobeContext = wardrobe.map(item => 
      `${item.name} (${item.category}, colors: ${item.colors?.join('/') || 'unknown'}, occasions: ${item.occasions?.join('/') || 'any'})`
    ).join('; ');

    // Use AI to suggest outfit
    const message = `Suggest an outfit for a ${occasion} occasion in ${weather} weather. Be specific about which items to wear together and why they work well.`;
    const memoryContext = `User's wardrobe: ${wardrobeContext}`;
    
    const aiSuggestion = await generateLLMReply({ message, memoryContext });

    // Pick random items as fallback if AI fails
    const categories = ['tops', 'bottoms', 'shoes'];
    const suggestedItems = categories
      .map(cat => wardrobe.find(item => item.category === cat))
      .filter(Boolean);

    res.json({
      occasion,
      weather,
      description: aiSuggestion || 'A comfortable combination from your wardrobe.',
      items: suggestedItems.length > 0 
        ? suggestedItems.map(i => ({ name: i.name, category: i.category }))
        : wardrobe.slice(0, 3).map(i => ({ name: i.name, category: i.category })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

// Get wardrobe stats
router.get('/stats', auth, async (req, res) => {
  try {
    const wardrobe = await WardrobeItem.find({ user: req.userId });
    
    const stats = {
      total: wardrobe.length,
      favorites: wardrobe.filter(i => i.favorite).length,
      byCategory: {},
      byColor: {},
      byOccasion: {},
    };

    wardrobe.forEach(item => {
      // By category
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
      
      // By color
      item.colors?.forEach(color => {
        stats.byColor[color] = (stats.byColor[color] || 0) + 1;
      });
      
      // By occasion
      item.occasions?.forEach(occ => {
        stats.byOccasion[occ] = (stats.byOccasion[occ] || 0) + 1;
      });
    });

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
