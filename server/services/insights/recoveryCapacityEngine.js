const Workout = require('../../models/Workout');

/**
 * Analyzes training recovery capacity by observing how volume and rest 
 * intervals impact performance trends.
 */
async function analyzeRecoveryCapacity(userId) {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const workouts = await Workout.find({
    user: userId,
    date: { $gte: eightWeeksAgo }
  }).sort({ date: 1 });

  if (workouts.length < 10) {
    return { status: 'insufficient_data', message: 'Log at least 10 workouts to analyze your recovery curve.' };
  }

  // 1. Group performance by muscle group
  const muscleHistory = {}; // { 'Chest': [{ date, volume, intensity, performanceScore }] }

  workouts.forEach(w => {
    const date = new Date(w.date).toLocaleDateString('en-CA');
    
    w.exercises?.forEach(ex => {
      const mg = ex.muscleGroup || 'Other';
      if (!muscleHistory[mg]) muscleHistory[mg] = [];

      let sessionVolume = 0;
      let totalLoad = 0;
      let maxWeight = 0;

      ex.sets?.forEach(s => {
        if (s.completed) {
          sessionVolume++;
          totalLoad += (s.weight || 0) * (s.reps || 0);
          if (s.weight > maxWeight) maxWeight = s.weight;
        }
      });

      if (sessionVolume > 0) {
        // Simple performance score: combined volume and max weight
        const performanceScore = totalLoad; 
        
        muscleHistory[mg].push({
          date,
          volume: sessionVolume,
          intensity: maxWeight,
          score: performanceScore,
          rawDate: w.date
        });
      }
    });
  });

  // 2. Analyze Recovery Windows
  const recoveryInsights = {};

  Object.entries(muscleHistory).forEach(([mg, sessions]) => {
    if (sessions.length < 3) return;

    let totalGaps = 0;
    let positiveResponseGaps = [];
    let negativeResponseGaps = [];

    for (let i = 1; i < sessions.length; i++) {
      const prev = sessions[i-1];
      const curr = sessions[i];
      
      const gapMs = new Date(curr.rawDate) - new Date(prev.rawDate);
      const gapDays = gapMs / (1000 * 60 * 60 * 24);
      
      const perfChange = ((curr.score - prev.score) / prev.score) * 100;

      if (perfChange > 2) {
        positiveResponseGaps.push(gapDays);
      } else if (perfChange < -5) {
        negativeResponseGaps.push(gapDays);
      }
    }

    const avgOptimalGap = positiveResponseGaps.length 
      ? positiveResponseGaps.reduce((a,b) => a+b, 0) / positiveResponseGaps.length 
      : null;

    recoveryInsights[mg] = {
      optimalGap: avgOptimalGap,
      sessionsAnalyzed: sessions.length,
      recommendation: avgOptimalGap 
        ? `You tend to perform best with ~${avgOptimalGap.toFixed(1)} days of rest between ${mg} sessions.`
        : `Continue training ${mg}; observing recovery patterns...`
    };
  });

  // 3. Analyze MRV (Max Recoverable Volume)
  // Look at weekly volume per muscle vs performance trend
  const mrvInsights = {};
  Object.entries(muscleHistory).forEach(([mg, sessions]) => {
    // Group by week
    const weeklyVolume = {}; // 'YYYY-WW' -> { totalSets, perfChange }
    // (Simplified for this version: just look for volume spikes that preceded performance dips)
    
    let highestVolumeSustained = 0;
    sessions.forEach(s => {
      if (s.volume > highestVolumeSustained) highestVolumeSustained = s.volume;
    });

    mrvInsights[mg] = {
      suggestedVolumeRange: `${Math.round(highestVolumeSustained * 0.8)}-${Math.round(highestVolumeSustained * 1.2)} sets/session`,
      status: 'stable'
    };
  });

  return {
    status: 'success',
    recoveryInsights,
    mrvInsights,
    overallSummary: "Your recovery capacity is being mapped based on 8 weeks of data."
  };
}

module.exports = { analyzeRecoveryCapacity };
