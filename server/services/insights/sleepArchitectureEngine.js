const { MentalLog } = require('../../models/Logs');
const Workout = require('../../models/Workout');

/**
 * Analyzes sleep architecture by correlating sleep duration with 
 * next-day biological and performance markers.
 */
async function analyzeSleepArchitecture(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [mentalLogs, workouts] = await Promise.all([
    MentalLog.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }),
    Workout.find({ user: userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 })
  ]);

  if (mentalLogs.length < 10) {
    return { status: 'insufficient_data', message: 'Log sleep for at least 10 days to map your sleep architecture.' };
  }

  // Map data by date string
  const dailyData = {};
  const getDateStr = (d) => new Date(d).toLocaleDateString('en-CA');

  mentalLogs.forEach(m => {
    const d = getDateStr(m.date);
    dailyData[d] = {
      sleep: m.sleepHours,
      energy: m.energyLevel,
      hunger: m.hungerLevel,
      readiness: m.moodScore // using mood as proxy if readiness score is not explicit
    };
  });

  workouts.forEach(w => {
    const d = getDateStr(w.date);
    if (!dailyData[d]) dailyData[d] = {};
    const sessionLoad = w.exercises?.reduce((sum, ex) => 
      sum + (ex.sets?.reduce((sSum, s) => sSum + (s.weight || 0) * (s.reps || 0), 0) || 0), 0
    ) || 0;
    dailyData[d].performance = sessionLoad;
  });

  // Correlate Sleep (Day N-1) with markers (Day N)
  const correlations = [];
  const dates = Object.keys(dailyData).sort();

  for (let i = 1; i < dates.length; i++) {
    const prevDay = dailyData[dates[i-1]];
    const currDay = dailyData[dates[i]];

    if (prevDay.sleep != null) {
      correlations.push({
        sleep: prevDay.sleep,
        nextEnergy: currDay.energy,
        nextHunger: currDay.hunger,
        nextPerformance: currDay.performance
      });
    }
  }

  // Find Optimal Window
  // Group by sleep hour buckets
  const buckets = {}; // '6-7', '7-8', etc.
  correlations.forEach(c => {
    const bucket = Math.floor(c.sleep);
    if (!buckets[bucket]) buckets[bucket] = { energy: [], performance: [], hunger: [], count: 0 };
    if (c.nextEnergy != null) buckets[bucket].energy.push(c.nextEnergy);
    if (c.nextPerformance > 0) buckets[bucket].performance.push(c.nextPerformance);
    if (c.nextHunger != null) buckets[bucket].hunger.push(c.nextHunger);
    buckets[bucket].count++;
  });

  let optimalSleep = { min: 7, max: 9 };
  let performanceInsight = "Your data suggests a standard sleep requirement.";
  
  // Logic: Find bucket with highest average energy/performance
  let bestBucket = null;
  let maxScore = -1;

  Object.entries(buckets).forEach(([hour, data]) => {
    if (data.count < 2) return;
    const avgEnergy = data.energy.length ? data.energy.reduce((a,b)=>a+b,0)/data.energy.length : 0;
    if (avgEnergy > maxScore) {
      maxScore = avgEnergy;
      bestBucket = Number(hour);
    }
  });

  if (bestBucket) {
    optimalSleep = { min: bestBucket - 0.5, max: bestBucket + 1 };
    performanceInsight = `Your next-day energy peaks when you sleep between ${optimalSleep.min} and ${optimalSleep.max} hours.`;
  }

  // Check for "Tanks" (performance drops below threshold)
  const lowSleepData = correlations.filter(c => c.sleep < 6);
  const normalSleepData = correlations.filter(c => c.sleep >= 7);
  
  let tankInsight = null;
  if (lowSleepData.length >= 2 && normalSleepData.length >= 2) {
    const avgLowPerf = lowSleepData.reduce((a,b) => a + (b.nextPerformance || 0), 0) / lowSleepData.length;
    const avgNormalPerf = normalSleepData.reduce((a,b) => a + (b.nextPerformance || 0), 0) / normalSleepData.length;
    
    if (avgLowPerf < avgNormalPerf * 0.85) {
      tankInsight = `Warning: Your training performance drops by ${Math.round((1 - avgLowPerf/avgNormalPerf)*100)}% when you sleep less than 6 hours.`;
    }
  }

  return {
    status: 'success',
    optimalSleep,
    performanceInsight,
    tankInsight,
    summary: `Sleep Architecture mapped over ${correlations.length} nights.`
  };
}

module.exports = { analyzeSleepArchitecture };
