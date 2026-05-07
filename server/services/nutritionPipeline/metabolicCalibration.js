const User = require('../../models/User');
const { calculateMetabolicMap } = require('./adaptiveTdeeEngine');

/**
 * Metabolic Calibration Service
 * ─────────────────────────────────────────────────────────────────
 * This service "closes the loop" between logging and goal setting.
 * It uses the Adaptive TDEE Engine to observe how the user's body
 * actually responds, then updates their calorie targets to keep
 * their progress on track.
 */

async function calibrateUserTargets(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return { status: 'error', message: 'User not found' };

    // Respect user's preference to use/not use adaptive logic
    if (user.biologicalProfile?.useAdaptiveTdee === false) {
      return { status: 'skipped', message: 'User has disabled adaptive TDEE calibration.' };
    }

    // 1. Calculate the real-world metabolic map
    const map = await calculateMetabolicMap(userId, 60);
    if (map.status !== 'success') {
      return { status: 'insufficient_data', message: map.message };
    }

    const currentTarget = user.dailyCalorieTarget || 2000;
    const observedTdee = map.dynamicTDEE;

    // 2. Determine the new target based on user's metabolic goal
    // If they want to lose weight, they need a deficit relative to observedTdee
    const goal = user.biologicalProfile?.metabolicGoal || 'maintenance';
    let targetOffset = 0;
    
    switch (goal) {
      case 'aggressive_loss': targetOffset = -750; break;
      case 'mild_loss':       targetOffset = -350; break;
      case 'lean_gain':       targetOffset = 250;  break;
      case 'aggressive_gain': targetOffset = 500;  break;
      case 'maintenance':    targetOffset = 0;    break;
    }

    const idealTarget = observedTdee + targetOffset;

    // 3. Apply Smoothing / Damping
    // We don't jump straight to the ideal target to avoid metabolic shock
    // and to handle potential data outliers. We adjust by max 100 kcal per run.
    const diff = idealTarget - currentTarget;
    if (Math.abs(diff) < 30) {
      return { status: 'no_change_needed', currentTarget };
    }

    const adjustment = Math.max(-100, Math.min(100, diff));
    const newTarget = Math.round(currentTarget + adjustment);

    // 4. Update User Profile
    user.dailyCalorieTarget = newTarget;
    
    // Update clinicalTargets if structure exists
    if (user.clinicalTargets && typeof user.clinicalTargets === 'object') {
      user.clinicalTargets.calories = newTarget;
      // Re-calculate protein if it's based on %
      if (user.clinicalTargets.protein) {
        // If protein was ~30% of calories, keep that ratio or use g/kg
        // Most robust: keep existing protein target unless it's way off
      }
    }

    await user.save();

    return {
      status: 'success',
      oldTarget: currentTarget,
      newTarget,
      adjustment,
      observedTdee,
      reason: map.insight,
      dietPhase: map.dietPhase
    };
  } catch (err) {
    console.error('[MetabolicCalibration] Error:', err);
    return { status: 'error', message: err.message };
  }
}

module.exports = { calibrateUserTargets };
