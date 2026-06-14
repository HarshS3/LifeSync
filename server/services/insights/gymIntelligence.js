const { generateLLMReply } = require('../../aiClient');
const Workout = require('../../models/Workout');
const User = require('../../models/User');
const { NutritionLog, MentalLog, StepsLog } = require('../../models/Logs');
const { calculateReadiness } = require('./readinessEngine');
const { analyzeCorrelations } = require('./correlationEngine');
const { EXERCISE_METADATA } = require('../../constants/exerciseMetadata');

async function generateAiSuggestion({ userId, type }) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const [readiness, user, workouts, nutritionLogs, mentalLogs, todaySteps, correlations] = await Promise.all([
    calculateReadiness(userId),
    User.findById(userId).select('trainingGoals biologicalProfile name dailyCalorieTarget dailyProteinTarget trainingExperience workoutDuration').lean(),
    Workout.find({ user: userId }).sort({ date: -1 }).limit(14).lean(),
    NutritionLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).limit(7).lean(),
    MentalLog.find({ user: userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 }).limit(7).lean(),
    StepsLog.findOne({ user: userId, date: { $gte: todayStart } }).lean(),
    analyzeCorrelations(userId, 14).catch(() => []),
  ]);

  // ── EXERCISE ANALYSIS ──────────────────────────────────────────────
  // Map primary muscles from metadata, falling back to stored muscleGroup
  const recentMusclesWithDays = workouts.slice(0, 7).flatMap(w => {
    const daysAgo = Math.round((Date.now() - new Date(w.date)) / 86400000);
    return (w.exercises || []).map(e => {
      const meta = EXERCISE_METADATA[e.name] || e.metadata;
      const muscle = meta?.primary || meta?.primaryMuscle || e.muscleGroup || null;
      return muscle ? { muscle, daysAgo } : null;
    }).filter(Boolean);
  });

  // Muscles trained within 48h — tell the LLM to avoid these
  const musclesUnder48h = [...new Set(
    recentMusclesWithDays.filter(m => m.daysAgo <= 2).map(m => m.muscle)
  )];
  const musclesUnder72h = [...new Set(
    recentMusclesWithDays.filter(m => m.daysAgo <= 3).map(m => m.muscle)
  )];

  // Per-exercise volume and RPE summary for last 7 workouts
  const exerciseSummary = {};
  workouts.slice(0, 7).forEach(w => {
    (w.exercises || []).forEach(ex => {
      if (!ex.name) return;
      if (!exerciseSummary[ex.name]) exerciseSummary[ex.name] = { sessions: 0, topWeight: 0, avgRpe: [], totalVol: 0 };
      exerciseSummary[ex.name].sessions++;
      (ex.sets || []).forEach(s => {
        const w_ = s.weight || 0;
        const r = s.reps || 0;
        if (w_ > exerciseSummary[ex.name].topWeight) exerciseSummary[ex.name].topWeight = w_;
        if (s.rpe) exerciseSummary[ex.name].avgRpe.push(s.rpe);
        exerciseSummary[ex.name].totalVol += w_ * r;
      });
    });
  });

  const topExercises = Object.entries(exerciseSummary)
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 6)
    .map(([name, d]) => {
      const rpe = d.avgRpe.length ? (d.avgRpe.reduce((a, b) => a + b, 0) / d.avgRpe.length).toFixed(1) : null;
      return `${name}: ${d.sessions} sessions, top ${d.topWeight}kg${rpe ? `, avg RPE ${rpe}` : ''}`;
    });

  // ── DERIVED SIGNALS ───────────────────────────────────────────────
  const mostRecentWorkout = workouts[0];
  const daysSinceLastWorkout = mostRecentWorkout ? Math.round((Date.now() - new Date(mostRecentWorkout.date)) / 86400000) : null;
  const isReturnFromBreak = daysSinceLastWorkout !== null && daysSinceLastWorkout >= 10;
  const isFirstTimeUser = workouts.length < 3;
  const trainingPhase = user?.biologicalProfile?.trainingPhase || "maintenance";
  const phaseStartDate = user?.biologicalProfile?.trainingPhaseStartDate;
  const weeksInPhase = phaseStartDate ? Math.floor((Date.now() - new Date(phaseStartDate)) / (7 * 86400000)) : null;
  const deloadRecommended = weeksInPhase !== null && weeksInPhase >= 6 && readiness.stagnationAlerts?.length >= 2;
  const lastDeloadDate = user?.biologicalProfile?.lastDeloadDate;
  const weeksSinceDeload = lastDeloadDate ? Math.floor((Date.now() - new Date(lastDeloadDate)) / (7 * 86400000)) : null;
  const last4 = workouts.slice(0, 4);
  const exerciseFreq = {};
  last4.forEach(w => (w.exercises || []).forEach(e => { if (e.name) exerciseFreq[e.name] = (exerciseFreq[e.name] || 0) + 1; }));
  const overusedExercises = Object.entries(exerciseFreq).filter(([,count]) => count >= 4).map(([name]) => name);
  const sessionDurationMin = user?.workoutDuration || user?.biologicalProfile?.sessionDurationMinutes || 60;
  const experienceLevel = user?.trainingExperience || "beginner";
  const isBeginner = experienceLevel === "beginner" || experienceLevel === "novice";
  const isTrainingDay = workouts.some(w => { const d = new Date(w.date); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d.getTime() === t.getTime(); });
  const trainingDayCalorieBonus = (trainingPhase === "recomp" && isTrainingDay) ? 200 : 0;

  // ── WORKOUT HISTORY NARRATIVE ──────────────────────────────────────
  const recentWorkoutLines = workouts.slice(0, 7).map(w => {
    const daysAgo = Math.round((Date.now() - new Date(w.date)) / 86400000);
    const vol = (w.exercises || []).reduce((sum, ex) =>
      sum + (ex.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);
    const muscles = [...new Set((w.exercises || []).map(e => {
      const meta = EXERCISE_METADATA[e.name] || e.metadata;
      return meta?.primary || e.muscleGroup;
    }).filter(Boolean))].join(', ');
    return `${daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}: ${w.name} | vol ${Math.round(vol)}kg·reps${muscles ? ` | focus: ${muscles}` : ''}`;
  });

  // ── NUTRITION CROSS-DOMAIN ─────────────────────────────────────────
  const todayNutrition = nutritionLogs[0];
  const avgProtein7d = nutritionLogs.length
    ? Math.round(nutritionLogs.reduce((s, l) => s + (l.dailyTotals?.protein || 0), 0) / nutritionLogs.length)
    : null;
  const avgCalories7d = nutritionLogs.length
    ? Math.round(nutritionLogs.reduce((s, l) => s + (l.dailyTotals?.calories || 0), 0) / nutritionLogs.length)
    : null;

  const proteinTarget = user?.dailyProteinTarget || null;
  const calorieTarget = user?.dailyCalorieTarget || null;

  const nutritionLines = [];
  if (todayNutrition) {
    const cal = Math.round(todayNutrition.dailyTotals?.calories || 0);
    const prot = Math.round(todayNutrition.dailyTotals?.protein || 0);
    const carbs = Math.round(todayNutrition.dailyTotals?.carbs || 0);
    nutritionLines.push(`Today: ${cal} kcal${calorieTarget ? `/${calorieTarget}` : ''}, ${prot}g protein${proteinTarget ? `/${proteinTarget}g target` : ''}, ${carbs}g carbs`);
  }
  if (avgProtein7d !== null) {
    const proteinGap = proteinTarget ? proteinTarget - avgProtein7d : null;
    nutritionLines.push(`7-day avg: ${avgCalories7d} kcal, ${avgProtein7d}g protein${proteinGap !== null ? ` (${proteinGap > 0 ? proteinGap + 'g below target' : 'on target'})` : ''}`);
  }

  // Surface relevant cross-domain correlations (fuel↔performance, deficiencies)
  const relevantCorrelations = (correlations || [])
    .filter(c => c.type === 'correlation' || c.type === 'deficiency')
    .slice(0, 3)
    .map(c => `[${c.type.toUpperCase()}] ${c.title}: ${c.detail} → ${c.action}`);

  // ── WELLNESS / MENTAL ─────────────────────────────────────────────
  const lastMental = mentalLogs[0];
  const wellnessLines = [];
  if (lastMental) {
    const parts = [];
    if (lastMental.sleepHours != null) parts.push(`sleep ${lastMental.sleepHours}h`);
    if (lastMental.energyLevel != null) parts.push(`energy ${lastMental.energyLevel}/10`);
    if (lastMental.stressLevel != null) parts.push(`stress ${lastMental.stressLevel}/10`);
    if (lastMental.restingHeartRate != null) parts.push(`RHR ${lastMental.restingHeartRate}bpm`);
    if (parts.length) wellnessLines.push(`Last check-in: ${parts.join(', ')}`);
  }
  if (todaySteps?.stepsCount) {
    wellnessLines.push(`Steps today: ${todaySteps.stepsCount.toLocaleString()}`);
  }

  // ── READINESS COMPONENT BREAKDOWN ────────────────────────────────
  const comp = readiness.components || {};
  const readinessComponents = [
    comp.sleep ? `sleep ${comp.sleep.score}/10 (${comp.sleep.avgHours}h avg)` : null,
    comp.energy ? `energy ${comp.energy.score}/10` : null,
    comp.stress ? `stress ${comp.stress.score}/10` : null,
    comp.fuel ? `fuel ${comp.fuel.score}/10` : null,
    comp.trainingLoad ? `load ${comp.trainingLoad.score}/10 (ratio ${comp.trainingLoad.volumeRatio}x, ${comp.trainingLoad.daysSinceRestDay}d since rest)` : null,
    comp.rhr?.avgRhr !== 'No Data' ? `RHR ${comp.rhr?.score}/10` : null,
  ].filter(Boolean).join(', ');

  // ── STAGNATION ALERTS ────────────────────────────────────────────
  const stagnationLines = (readiness.stagnationAlerts || []).map(a =>
    `PLATEAU — ${a.exercise}: ${a.suggestion}`
  );

  // ── SYSTEM PROMPT ───────────────────────────────────────────────
  const systemPrompt = [
    'You are LifeSync Coach — a precision training intelligence with access to the user\'s real physiological and nutritional data.',
    '',
    'IDENTITY',
    '1. You are not a generic AI giving generic advice. You have the user\'s actual recovery scores, nutrition intake, recent training load, cross-domain correlations, and wellness signals. Use them.',
    '2. Never output generic tips ("make sure to warm up", "hydration is important") unless the user\'s data specifically justifies it.',
    '3. You operate at the intersection of training, nutrition, and recovery. Your competitive edge is cross-domain reasoning — connecting fuel intake to performance output, sleep quality to strength, stress to injury risk.',
    '',
    'RESPONSE RULES',
    '4. Lead with the single most important signal from the data — the thing the user most needs to act on TODAY.',
    '5. Output plain text only. No markdown, no bullet lists prefixed with -, no bold/italic. Write in tight prose.',
    '6. Maximum 6 sentences for "workout" and "recovery" types. Maximum 4 sentences for "proactive".',
    '7. Do not start sentences with "Based on...", "It seems...", "Remember to...", or "Great job!".',
    '8. When citing a specific number from the data (readiness score, volume, protein gap), name it explicitly — don\'t paraphrase it as "low" when it is 3.2.',
    '',
    'READINESS SCORING',
    '9. The readiness score is on a 1–10 scale. Below 5: reduce intensity 20–30%, prioritize form over load. 5–7.5: train at standard load. Above 7.5: safe to push progressive overload.',
    '10. The readiness score is a COMPOSITE — its components tell you WHY. If load score is low but sleep is high, the issue is accumulated fatigue, not recovery deficit.',
    '',
    'WORKOUT TYPE',
    '11. For "workout": Prescribe 3–4 specific exercises with sets×reps scaled to the readiness score. Avoid muscles trained in the last 48h (named in the data). If stagnation is detected, prescribe the intervention directly (microload, rep range shift, tempo change) — do not suggest "try changing the stimulus."',
    '12. If protein intake has averaged below target this week, mention a post-workout protein priority in one sentence — this is cross-domain coaching the user cannot get elsewhere.',
    '',
    'RECOVERY TYPE',
    '13. For "recovery": Address the specific component driving low readiness (fuel, load ratio, sleep, RHR) — not the composite score. One active recovery action (contrast shower, walk, mobility), one nutrition action tied to actual deficit data, one sleep/stress action if warranted.',
    '14. If the calorie-to-volume correlation shows underfueling caused the recent performance dip, say so explicitly.',
    '',
    'PROACTIVE TYPE',
    '15. For "proactive": Surface ONE cross-domain pattern the user has not asked about but that the data reveals (e.g., RPE has been rising on bench press for 3 sessions → early overreaching signal, not a plateau; or 7-day protein average is 40g below target on non-workout days, directly limiting recovery). Be specific. Name the pattern, the data that confirms it, and the fix.',
    '',
    'PERSONALITY',
    '16. Warm but direct — like a coach who respects your time. No cheerleading. If the data says rest, say rest, and say exactly why.',
    '17. When data is sparse ("no workouts logged", "no nutrition data"), be honest about it and give the best guidance you can with what exists. Do not invent patterns.',
    '',
    'BEGINNER RULE: If experience is beginner or novice, prescribe only compound movements (squat/hinge/push/pull). Max 4 exercises. 3x8-12 reps. One sentence form cue. No advanced techniques.',
    'PHASE RULE: bulk=maximize progressive overload and volume. cut=maintain weights/reduce volume 15% to preserve muscle. recomp=alternate intensity. maintenance=consistency over intensity.',
    'RETURN FROM BREAK: If flagged, prescribe 50-60% of historical PR weights. Explicitly tell user not to chase previous weights. Max 3 sets per exercise.',
    'DELOAD: If DELOAD RECOMMENDED is flagged, prescribe deload: 60% usual weights, 2-3 sets, movement quality focus. Explicitly call it a deload week.',
    'EXERCISE VARIETY: If OVERUSED EXERCISES are flagged, suggest one named substitute for each.',
    'SESSION LENGTH: If session target <= 45 min, max 3 exercises, no accessory work.',
  ].join('\n');

  // ── USER MESSAGE ────────────────────────────────────────────────
  const sections = [
    `READINESS: ${readiness.readinessScore}/10 (${readiness.status}) | Components: ${readinessComponents}`,
    `Overtraining risk: ${readiness.overtraining?.risk || 'low'}. ${readiness.overtraining?.detail || ''}`,
    '',
    `PROFILE: Goals — ${(user?.trainingGoals || []).join(', ') || 'not set'}. Experience — ${experienceLevel}.`,
    '',
    `RECENT WORKOUTS (last 7 sessions):\n${recentWorkoutLines.length ? recentWorkoutLines.join('\n') : 'None logged.'}`,
    '',
    `MUSCLES TRAINED < 48h (avoid today): ${musclesUnder48h.length ? musclesUnder48h.join(', ') : 'none'}`,
    `MUSCLES TRAINED < 72h (go light if used): ${musclesUnder72h.filter(m => !musclesUnder48h.includes(m)).join(', ') || 'none'}`,
    '',
    `TOP EXERCISES (last 7 sessions):\n${topExercises.length ? topExercises.join('\n') : 'None.'}`,
    '',
    `TRAINING PROFILE: phase=${trainingPhase}, weeksInPhase=${weeksInPhase ?? 'unknown'}, experience=${experienceLevel}, sessionDurationMin=${sessionDurationMin}, deloadRecommended=${deloadRecommended}, weeksSinceDeload=${weeksSinceDeload ?? 'unknown'}`,
    '',
    `SESSION CONTEXT: returnFromBreak=${isReturnFromBreak} (daysSinceLast=${daysSinceLastWorkout ?? 'never'}), firstTimeUser=${isFirstTimeUser}, overusedExercises=${overusedExercises.length ? overusedExercises.join(', ') : 'none'}, trainingDayCalorieBonus=${trainingDayCalorieBonus}kcal`,
    '',
    stagnationLines.length ? `STAGNATION ALERTS:\n${stagnationLines.join('\n')}` : '',
    '',
    `NUTRITION (cross-domain):\n${nutritionLines.length ? nutritionLines.join('\n') : 'No nutrition data.'}`,
    relevantCorrelations.length ? `Active correlations:\n${relevantCorrelations.join('\n')}` : '',
    '',
    `WELLNESS:\n${wellnessLines.length ? wellnessLines.join('\n') : 'No wellness data.'}`,
  ].filter(s => s !== '').join('\n');

  const typeInstruction = type === 'workout'
    ? 'Based on this data, prescribe today\'s training session. Scale intensity to the readiness score, avoid the flagged muscles, and address any active stagnation alerts with a specific intervention.'
    : type === 'recovery'
      ? 'Based on this data, prescribe today\'s optimal recovery strategy. Address the specific component(s) driving low readiness. Connect the nutrition cross-domain signals if relevant.'
      : 'Based on this data, surface the single most important cross-domain pattern I need to act on — something my training data reveals that I probably haven\'t noticed. Be specific and cite the numbers.';

  const message = `${typeInstruction}\n\n${sections}`;

  const suggestion = await generateLLMReply({
    message,
    memoryContext: '',
    systemPrompt,
  });

  return suggestion || (type === 'workout' ? 'Moderate intensity session recommended today.' : 'Prioritize sleep and protein today.');
}

module.exports = { generateAiSuggestion };
