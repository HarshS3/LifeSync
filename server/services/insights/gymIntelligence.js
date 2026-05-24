const { generateLLMReply } = require('../../aiClient');
const Workout = require('../../models/Workout');
const User = require('../../models/User');
const { NutritionLog, MentalLog } = require('../../models/Logs');
const { calculateReadiness } = require('./readinessEngine');
const { EXERCISE_METADATA } = require('../../constants/exerciseMetadata');

/**
 * GYM INTELLIGENCE SERVICE
 * Provides personalized AI-driven training advice and workout ideas.
 */

async function generateAiSuggestion({ userId, type }) {
  // 1. Gather context
  const [readiness, user, workouts, nutrition, mental] = await Promise.all([
    calculateReadiness(userId),
    User.findById(userId).lean(),
    Workout.find({ user: userId }).sort({ date: -1 }).limit(10).lean(),
    NutritionLog.find({ user: userId }).sort({ date: -1 }).limit(3).lean(),
    MentalLog.find({ user: userId }).sort({ date: -1 }).limit(3).lean(),
  ]);

  // 2. Build detailed context for LLM
  // Extract muscle groups from recent workouts for smarter suggestions
  const recentMuscles = workouts.slice(0, 5).flatMap(w =>
    (w.exercises || []).map(e => {
      const meta = EXERCISE_METADATA[e.name];
      return meta?.primaryMuscle || null;
    }).filter(Boolean)
  );
  const uniqueRecentMuscles = [...new Set(recentMuscles)];

  const recentWorkoutsSummary = workouts.slice(0, 5).map(w => {
    const daysAgo = Math.round((Date.now() - new Date(w.date)) / 86400000);
    return `${w.name} (${daysAgo === 0 ? 'today' : `${daysAgo}d ago`}): ${(w.exercises || []).map(e => e.name).join(', ')}`;
  });

  const context = {
    readiness: {
      score: readiness.readinessScore,
      status: readiness.status,
      recommendation: readiness.recommendation,
      overtrainingRisk: readiness.overtraining.risk,
    },
    userProfile: {
      goals: user.trainingGoals,
      experience: user.experienceLevel || 'intermediate',
    },
    recentWorkouts: recentWorkoutsSummary,
    recentlyTrainedMuscles: uniqueRecentMuscles,
    stagnation: readiness.stagnationAlerts,
  };

  // --- System prompt: role + rules, type-agnostic ---
  const systemPrompt = [
    'You are LifeSync AI Coach — a data-driven personal trainer with deep knowledge of exercise science.',
    'Your advice must be grounded in the user data provided. Never give generic advice when data is available.',
    'RULES:',
    '- Always reference the Readiness Score when making intensity decisions (score < 50 = low intensity, 50-75 = moderate, > 75 = full effort).',
    '- For "workout": Choose exercises that avoid muscle groups trained in the last 48h. Scale volume to readiness.',
    '  Format: list 3-4 exercises with sets × reps (e.g., "Romanian Deadlift — 3×10"). Add a 1-line intensity note.',
    '- For "recovery": Address the specific cause of fatigue (overtraining risk, recent load). Mention one active recovery technique and one nutrition/sleep action.',
    '- For "proactive": Identify ONE pattern in the training data (volume trend, plateau, imbalance) and give a specific fix.',
    '- Be concise. No filler phrases like "Great job!" or "Remember to...". Lead with the most important information.',
    '- Use the user\'s experience level to calibrate complexity (beginner = simpler movements, advanced = progressive overload focus).',
  ].join('\n');

  // --- User message: narrate the key context data clearly so the model reasons from facts ---
  const readinessLine = `Readiness: ${readiness.readinessScore}/100 (${readiness.status}). Overtraining risk: ${readiness.overtraining?.risk || 'low'}.`;
  const goalsLine = `Goals: ${(user.trainingGoals || []).join(', ') || 'not specified'}. Experience: ${user.experienceLevel || 'intermediate'}.`;
  const musclesLine = uniqueRecentMuscles.length
    ? `Recently trained muscles (last 5 sessions): ${uniqueRecentMuscles.join(', ')}.`
    : 'No recent workout history found.';
  const workoutsLine = recentWorkoutsSummary.length
    ? `Recent workouts:\n${recentWorkoutsSummary.map(s => `  - ${s}`).join('\n')}`
    : 'No recent workouts logged.';
  const stagnationLine = (readiness.stagnationAlerts || []).length
    ? `Stagnation detected in: ${readiness.stagnationAlerts.map(a => a.exercise || a).join(', ')}.`
    : '';

  const sharedContext = [readinessLine, goalsLine, musclesLine, workoutsLine, stagnationLine].filter(Boolean).join('\n');

  const message = type === 'workout'
    ? `Based on my current data, what should I train today?\n\n${sharedContext}\n\nSuggest a specific workout plan with exercises, sets, and reps. Scale intensity to my readiness and avoid recently worked muscles.`
    : type === 'recovery'
      ? `Based on my current data, what is the optimal recovery strategy for today?\n\n${sharedContext}\n\nProvide a targeted recovery plan addressing my current fatigue level and recent training load.`
      : `Based on my training data, give me one powerful coaching insight I need to hear right now.\n\n${sharedContext}`;

  const suggestion = await generateLLMReply({
    message,
    memoryContext: '',  // context already narrated in the message above
    systemPrompt,
  });

  return suggestion || (type === 'workout' ? 'Try a moderate intensity full-body session today.' : 'Prioritize sleep and protein today.');
}

module.exports = { generateAiSuggestion };
