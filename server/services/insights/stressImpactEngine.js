const { MentalLog, WeightLog, NutritionLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');

/**
 * Analyzes the relationship between stress levels and physiological/performance outcomes.
 * Correlates Stress (MentalLog) with Performance (Workout), Weight (Retention), and Appetite.
 */
async function analyzeStressImpact(userId) {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [mentalLogs, workouts, weights, nutrition] = await Promise.all([
    MentalLog.find({ user: userId, date: { $gte: sixtyDaysAgo } }).sort({ date: 1 }),
    Workout.find({ user: userId, date: { $gte: sixtyDaysAgo } }).sort({ date: 1 }),
    WeightLog.find({ user: userId, date: { $gte: sixtyDaysAgo } }).sort({ date: 1 }),
    NutritionLog.find({ user: userId, date: { $gte: sixtyDaysAgo } }).sort({ date: 1 })
  ]);

  if (mentalLogs.filter(m => m.stressLevel != null).length < 10) {
    return { status: 'insufficient_data', message: 'Log your stress levels (1-10) for at least 10 days to map your stress-performance curve.' };
  }

  const dailyData = {};
  const getDateStr = (d) => new Date(d).toISOString().split('T')[0];

  mentalLogs.forEach(m => {
    const d = getDateStr(m.date);
    dailyData[d] = { stress: m.stressLevel };
  });

  workouts.forEach(w => {
    const d = getDateStr(w.date);
    if (!dailyData[d]) dailyData[d] = {};
    dailyData[d].performance = w.exercises?.reduce((sum, ex) => 
      sum + (ex.sets?.reduce((sSum, s) => sSum + (s.weight || 0) * (s.reps || 0), 0) || 0), 0
    ) || 0;
  });

  weights.forEach(w => {
    const d = getDateStr(w.date);
    if (!dailyData[d]) dailyData[d] = {};
    dailyData[d].weight = w.weightKg;
  });

  nutrition.forEach(n => {
    const d = getDateStr(n.date);
    if (!dailyData[d]) dailyData[d] = {};
    dailyData[d].calories = n.dailyTotals?.calories || 0;
  });

  // Correlate Stress (Day N) with Outcomes (Day N and N+1)
  const stressStates = {
    high: [], // stress >= 7
    low: []   // stress <= 4
  };

  const dates = Object.keys(dailyData).sort();
  dates.forEach((d, i) => {
    const data = dailyData[d];
    if (data.stress == null) return;

    const state = data.stress >= 7 ? 'high' : (data.stress <= 4 ? 'low' : null);
    if (!state) return;

    // Next day outcomes
    const nextDay = dates[i+1] ? dailyData[dates[i+1]] : null;
    
    stressStates[state].push({
      performance: data.performance || (nextDay ? nextDay.performance : null),
      weightChange: nextDay && data.weight ? (nextDay.weight - data.weight) : null,
      calories: data.calories || 0
    });
  });

  const getAvg = (arr, key) => {
    const valid = arr.map(x => x[key]).filter(v => v != null && v > 0);
    return valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : null;
  };

  const highStressPerf = getAvg(stressStates.high, 'performance');
  const lowStressPerf = getAvg(stressStates.low, 'performance');
  const highStressCal = getAvg(stressStates.high, 'calories');
  const lowStressCal = getAvg(stressStates.low, 'calories');
  
  // Weight retention signal (avg daily change during high stress)
  const highStressWeightDelta = stressStates.high.map(x => x.weightChange).filter(v => v != null);
  const avgWeightRetention = highStressWeightDelta.length ? highStressWeightDelta.reduce((a,b)=>a+b,0)/highStressWeightDelta.length : 0;

  const insights = [];
  
  if (highStressPerf && lowStressPerf) {
    const drop = (1 - highStressPerf / lowStressPerf) * 100;
    if (drop > 10) {
      insights.push(`Your training performance drops by ~${Math.round(drop)}% during high-stress periods. Consider deloading or reducing intensity when stress is > 7.`);
    } else {
      insights.push(`You maintain performance well under stress—training seems to be an effective release valve for you.`);
    }
  }

  if (highStressCal && lowStressCal) {
    if (highStressCal > lowStressCal * 1.15) {
      insights.push(`You tend to "Stress Eat" (intake increases by ~${Math.round((highStressCal/lowStressCal-1)*100)}%).`);
    } else if (highStressCal < lowStressCal * 0.85) {
      insights.push(`High stress suppresses your appetite significantly.`);
    }
  }

  if (avgWeightRetention > 0.4) {
    insights.push(`High stress correlates with sudden weight spikes (~${avgWeightRetention.toFixed(2)}kg), likely due to cortisol-induced water retention.`);
  }

  return {
    status: 'success',
    stressSensitivity: highStressPerf && lowStressPerf ? (highStressPerf / lowStressPerf < 0.9 ? 'high' : 'resilient') : 'unknown',
    insights,
    summary: `Analyzed stress impact over ${dates.length} days.`
  };
}

module.exports = { analyzeStressImpact };
