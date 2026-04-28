const { WeightLog, NutritionLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');
const User = require('../../models/User');

/**
 * Analyzes multi-metric progress to provide psychological "Perspective Shifts" 
 * when individual metrics (like scale weight) appear to plateau.
 */
async function analyzeProgressNarrative(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Fetch Weight Data
  const weights = await WeightLog.find({
    user: userId,
    date: { $gte: thirtyDaysAgo }
  }).sort({ date: 1 });

  // 2. Fetch Strength Data
  const workouts = await Workout.find({
    user: userId,
    date: { $gte: thirtyDaysAgo }
  }).sort({ date: 1 });

  // 3. Analyze Weight Plateau
  let isScaleStalled = false;
  let weightMessage = "";
  if (weights.length >= 7) {
    const recentWeights = weights.slice(-7);
    const first = recentWeights[0].weightKg;
    const last = recentWeights[recentWeights.length - 1].weightKg;
    const diff = Math.abs(last - first);
    
    // If weight changed less than 0.3kg in a week, it feels like a plateau to users
    if (diff < 0.3) {
      isScaleStalled = true;
    }
  }

  // 4. Analyze Strength Progress
  let strengthGains = 0; // percentage
  let bestExercise = null;
  
  const exerciseMaxes = {}; // name -> { max, date }
  workouts.forEach(w => {
    w.exercises?.forEach(ex => {
      ex.sets?.forEach(set => {
        if (!exerciseMaxes[ex.name] || set.weight > exerciseMaxes[ex.name].max) {
          exerciseMaxes[ex.name] = { max: set.weight, date: w.date };
        }
      });
    });
  });

  // Compare first 10 days vs last 10 days
  const tenDaysAgo = new Date(); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const earlyWorkouts = workouts.filter(w => w.date < thirtyDaysAgo + (10 * 24 * 60 * 60 * 1000)); // approximate
  // Simplified: just find any exercise that went up
  const progressMap = {};
  workouts.forEach(w => {
    w.exercises?.forEach(ex => {
      const currentMax = Math.max(...(ex.sets?.map(s => s.weight) || [0]));
      if (!progressMap[ex.name]) progressMap[ex.name] = { initial: currentMax, current: currentMax };
      progressMap[ex.name].current = currentMax;
    });
  });

  let improvedExercise = null;
  Object.entries(progressMap).forEach(([name, data]) => {
    if (data.current > data.initial) {
      const gain = ((data.current - data.initial) / data.initial) * 100;
      if (!improvedExercise || gain > improvedExercise.gain) {
        improvedExercise = { name, gain, initial: data.initial, current: data.current };
      }
    }
  });

  // 5. Construct Narrative
  const narratives = [];
  let status = 'positive';

  if (isScaleStalled) {
    if (improvedExercise) {
      narratives.push({
        title: "Scale is flat, but Strength is UP",
        text: `The scale hasn't moved much this week, but your ${improvedExercise.name} increased by ${improvedExercise.gain.toFixed(1)}%. This is a classic sign of body recomposition: losing fat and gaining muscle simultaneously.`,
        type: 'recomposition'
      });
    } else {
      narratives.push({
        title: "Metabolic Consolidation",
        text: "Your body is currently adapting to your new activity levels. A week of flat weight often precedes a 'whoosh' effect where water retention drops. Stay the course.",
        type: 'adaptation'
      });
    }
  } else if (weights.length >= 2) {
    const totalDiff = weights[weights.length - 1].weightKg - weights[0].weightKg;
    if (totalDiff < 0) {
      narratives.push({
        title: "Consistent Downward Trend",
        text: `You are down ${Math.abs(totalDiff).toFixed(1)}kg over the last 30 days. This is a sustainable, healthy pace.`,
        type: 'weight_loss'
      });
    }
  }

  // Monthly Perspective
  if (weights.length > 14) {
    const firstWeight = weights[0].weightKg;
    const lastWeight = weights[weights.length - 1].weightKg;
    const monthlyDiff = lastWeight - firstWeight;
    if (Math.abs(monthlyDiff) > 0.5) {
      narratives.push({
        title: "Zoom Out: The 30-Day View",
        text: `While day-to-day noise is high, you've moved the needle by ${Math.abs(monthlyDiff).toFixed(1)}kg this month. That's real progress.`,
        type: 'monthly_view'
      });
    }
  }

  return {
    isScaleStalled,
    narratives,
    improvedExercise,
    timeframes: {
      '7d': calculateTrend(weights.slice(-7)),
      '30d': calculateTrend(weights)
    }
  };
}

function calculateTrend(data) {
  if (data.length < 2) return 0;
  return data[data.length - 1].weightKg - data[0].weightKg;
}

module.exports = { analyzeProgressNarrative };
