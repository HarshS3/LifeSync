const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { calculateDailyTargets } = require('../services/nutritionEngine');
const { triggerDailyLifeStateRecompute } = require('../services/dailyLifeState/triggerDailyLifeStateRecompute');
const { resolveBestTdee } = require('../services/nutritionPipeline/resolveBestTdee');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

const auth = require('../middleware/authMiddleware');

// Update profile (protected)
router.put('/profile', auth, async (req, res) => {
  try {
    // Remove fields that shouldn't be updated directly
    const { _id, email, password, createdAt, updatedAt, __v, ...updateData } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (updateData.biologicalProfile) {
      const bmrOverride = user.bodyComposition?.bmrKcal;
      const mergedProfile = {
        ...(user.biologicalProfile?.toObject?.() || user.biologicalProfile || {}),
        ...updateData.biologicalProfile,
      };
      let adaptiveTdee = null;
      if (mergedProfile.useAdaptiveTdee !== false) {
        const { tdee } = await resolveBestTdee(req.userId);
        adaptiveTdee = tdee;
      }
      const calculated = await calculateDailyTargets(
        mergedProfile,
        adaptiveTdee,
        user.labMarkers,
        bmrOverride,
        req.userId
      );
      if (calculated) {
        updateData.dailyCalorieTarget = calculated.targets.calories;
        updateData.dailyProteinTarget = calculated.targets.protein;
        updateData.clinicalTargets = calculated;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    triggerDailyLifeStateRecompute({ userId: req.userId, reason: 'profile_update_put' });

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

    const updatePayload = { ...updateData };

    if (updateData.biologicalProfile) {
      updatePayload.biologicalProfile = {
        ...(user.biologicalProfile?.toObject?.() || user.biologicalProfile || {}),
        ...updateData.biologicalProfile,
      };
      const bmrOverride = user.bodyComposition?.bmrKcal;
      let adaptiveTdee = null;
      if (updatePayload.biologicalProfile.useAdaptiveTdee !== false) {
        const { tdee } = await resolveBestTdee(req.userId);
        adaptiveTdee = tdee;
      }
      const calculated = await calculateDailyTargets(
        updatePayload.biologicalProfile,
        adaptiveTdee,
        user.labMarkers,
        bmrOverride,
        req.userId
      );
      if (calculated) {
        updatePayload.dailyCalorieTarget = calculated.targets.calories;
        updatePayload.dailyProteinTarget = calculated.targets.protein;
        updatePayload.clinicalTargets = calculated;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).select('-password');

    triggerDailyLifeStateRecompute({ userId: req.userId, reason: 'profile_update_patch' });

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
