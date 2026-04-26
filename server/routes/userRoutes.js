const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { calculateDailyTargets } = require('../services/nutritionEngine');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Update profile (protected)
router.put('/profile', auth, async (req, res) => {
  try {
    // Remove fields that shouldn't be updated directly
    const { _id, email, password, createdAt, updatedAt, __v, ...updateData } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    Object.assign(user, updateData);

    if (updateData.biologicalProfile) {
      const calculated = calculateDailyTargets({
        ...user.biologicalProfile?.toObject?.() || user.biologicalProfile,
        ...updateData.biologicalProfile
      });
      if (calculated) {
        user.dailyCalorieTarget = calculated.targets.calories;
        user.dailyProteinTarget = calculated.targets.protein;
        user.clinicalTargets = calculated;
      }
    }

    await user.save();

    const updatedUser = await User.findById(req.userId).select('-password');

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get profile (protected)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH profile (for partial updates like onboarding)
router.patch('/profile', auth, async (req, res) => {
  try {
    const { _id, email, password, createdAt, updatedAt, __v, ...updateData } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    Object.keys(updateData).forEach(key => {
      // Need to handle biologicalProfile deep merge
      if (key === 'biologicalProfile') {
        user.biologicalProfile = {
           ...(user.biologicalProfile ? (user.biologicalProfile.toObject ? user.biologicalProfile.toObject() : user.biologicalProfile) : {}),
           ...updateData.biologicalProfile
        };
      } else {
        user[key] = updateData[key];
      }
    });

    if (updateData.biologicalProfile) {
      const calculated = calculateDailyTargets({
        ...user.biologicalProfile.toObject?.() || user.biologicalProfile
      });
      if (calculated) {
        user.dailyCalorieTarget = calculated.targets.calories;
        user.dailyProteinTarget = calculated.targets.protein;
        user.clinicalTargets = calculated;
      }
    }

    await user.save();

    const updatedUser = await User.findById(req.userId).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update subscription (protected) - Demo mode
router.post('/subscription', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['free', 'pro', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // In production, this would integrate with Stripe
    // For demo, we just update the plan directly
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'subscription.plan': plan,
          'subscription.status': 'active',
          'subscription.currentPeriodEnd': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, subscription: user.subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Get subscription status
router.get('/subscription', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('subscription');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.subscription || { plan: 'free', status: 'active' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

module.exports = router;
