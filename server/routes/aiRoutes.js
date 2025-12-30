const express = require('express');
const { FitnessLog, NutritionLog, MentalLog, MemorySummary } = require('../models/Logs');
const JournalEntry = require('../models/JournalEntry');
const { Habit, HabitLog } = require('../models/Habit');
const { WardrobeItem } = require('../models/Wardrobe');
const User = require('../models/User');
const SymptomLog = require('../models/SymptomLog');
const LabReport = require('../models/LabReport');
const { generateLLMReply } = require('../aiClient');
const jwt = require('jsonwebtoken');
const { runHealthTriage, riskRank } = require('../services/safety/healthTriageEngine');
const { detectAssistantMode } = require('../services/assistant/router');
const { buildSystemPrompt } = require('../services/assistant/prompts');
const { fetchTextbookRag } = require('../services/ragClient');
const { buildSupplementAdvice, buildSupplementAdvisorContext } = require('../services/supplements/advisor');

const router = express.Router();

// Helper to extract user from token (optional auth)
const getUserFromToken = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    // Token uses userId, not id
    const user = await User.findById(decoded.userId).select('-password');
    return user;
  } catch (err) {
    console.log('[AI Auth] Token verification failed:', err.message);
    return null;
  }
};

// AI endpoint: memory-aware summary with optional LLM layer
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const mode = detectAssistantMode({ message });

    // Get user profile if authenticated
    const user = await getUserFromToken(req);
    const userId = user?._id;
    console.log('[AI Chat] Mode:', mode, '| User:', user ? `${user.name} (${user.email}), diet: ${user.dietType}` : 'NO USER - token missing or invalid');

    // Fetch recent logs - filter by user if authenticated
    const userFilter = userId ? { user: userId } : {};
    
    // Get date range for habits (last 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [fitness, nutrition, mental, habits, habitLogs, wardrobeItems, journalEntries, symptomLogs, labReports] = await Promise.all([
      FitnessLog.find(userFilter).sort({ date: -1 }).limit(10),
      NutritionLog.find(userFilter).sort({ date: -1 }).limit(10),
      MentalLog.find(userFilter).sort({ date: -1 }).limit(10),
      userId ? Habit.find({ user: userId, isActive: true }) : [],
      userId ? HabitLog.find({ 
        user: userId, 
        date: { $gte: weekAgo, $lte: today }
      }).populate('habit', 'name category') : [],
      userId ? WardrobeItem.find({ user: userId }).limit(50) : [],
      userId ? JournalEntry.find({ user: userId }).sort({ date: -1 }).limit(3) : [],
      userId && mode === 'medical' ? SymptomLog.find({ user: userId }).sort({ date: -1 }).limit(12) : [],
      userId && mode === 'medical' ? LabReport.find({ user: userId }).sort({ date: -1 }).limit(3) : [],
    ]);

    // Phase 4: Optional textbook RAG (permissioned) for medical mode.
    // If the service is unavailable, proceed without it.
    let rag = null;
    if (mode === 'medical') {
      try {
        rag = await fetchTextbookRag({
          question: message,
          userProfile: user
            ? {
                age: user.age,
                gender: user.gender,
                allergies: user.allergies,
                conditions: user.conditions,
                medications: user.medications,
              }
            : null,
          allowedScope: 'medical-textbook',
        });
      } catch (e) {
        console.log('[AI Chat] RAG service unavailable:', e.message);
        rag = null;
      }
    }

    const requireRag = String(process.env.MEDICAL_REQUIRE_RAG || '').trim() === '1';
    const ragOk = !!(rag?.ok && Array.isArray(rag?.citations) && rag.citations.length > 0 && typeof rag?.confidence === 'number' && rag.confidence >= 0.25);
    if (mode === 'medical' && requireRag && !ragOk) {
      const safety = runHealthTriage({ message, user });
      const shouldAppendTriage = riskRank(safety.risk_level) >= 1 || (safety.red_flags || []).length > 0;

      let reply =
        'I can’t provide textbook-grounded medical guidance right now because the textbook RAG service is unavailable or did not retrieve relevant citations. ' +
        'To keep this safe, I’m not going to guess.\n\n' +
        'You can try:\n' +
        '- Rephrasing the question more specifically\n' +
        '- Ingesting the relevant textbook PDFs into the RAG index\n' +
        '- Ensuring the ai_service is running and AI_SERVICE_URL is set\n\n' +
        'If you want, tell me your key symptoms + timeline + any meds/conditions, and I can help you structure what to track and which clarifying questions to answer.';

      if (shouldAppendTriage) {
        const lines = [];
        lines.push('');
        lines.push('Safety triage (not diagnosis):');
        lines.push(`- Risk level: ${safety.risk_level} (${Math.round((safety.confidence || 0) * 100)}% confidence)`);
        lines.push(`- Reason: ${safety.reason}`);
        if (safety.red_flags?.length) lines.push(`- Red flags: ${safety.red_flags.join('; ')}`);
        if (safety.doctor_discussion_points?.length) lines.push(`- Questions to ask a clinician: ${safety.doctor_discussion_points.join(' | ')}`);
        if (safety.medication_awareness?.length) lines.push(`- Medication awareness: ${safety.medication_awareness.join(' | ')}`);
        lines.push(safety.disclaimer);
        reply = `${reply}\n${lines.join('\n')}`;
      }

      return res.json({
        message,
        mode,
        reply,
        safety,
        memorySnapshot: {
          ragConfidence: typeof rag?.confidence === 'number' ? rag.confidence : 0,
          ragCitationsCount: Array.isArray(rag?.citations) ? rag.citations.length : 0,
        },
      });
    }

    const latestMental = mental[0];
    const latestFitness = fitness[0];
    const latestNutrition = nutrition[0];
    const latestJournal = journalEntries?.[0];

    // Build habit context
    const habitContext = habits.length > 0 ? (() => {
      // Calculate completion stats for this week
      const completedLogs = habitLogs.filter(l => l.completed);
      const totalPossible = habits.length * 7;
      const completionRate = totalPossible > 0 ? Math.round((completedLogs.length / totalPossible) * 100) : 0;
      
      // Get habits with best and worst streaks
      const sortedByStreak = [...habits].sort((a, b) => b.streak - a.streak);
      const topStreaks = sortedByStreak.slice(0, 3).filter(h => h.streak > 0);
      const needsWork = sortedByStreak.slice(-3).filter(h => h.streak === 0);
      
      // Get today's habit status
      const todayStr = today.toISOString().split('T')[0];
      const todayLogs = habitLogs.filter(l => 
        new Date(l.date).toISOString().split('T')[0] === todayStr
      );
      const completedToday = todayLogs.filter(l => l.completed).length;
      
      // Get recent habit notes
      const recentNotes = habitLogs
        .filter(l => l.notes && l.notes.trim())
        .slice(0, 3)
        .map(l => `${l.habit?.name || 'Habit'}: "${l.notes}"`);

      return [
        `Active habits: ${habits.map(h => h.name).join(', ')}.`,
        `Weekly habit completion: ${completionRate}% (${completedLogs.length}/${totalPossible}).`,
        `Today: ${completedToday}/${habits.length} habits done.`,
        topStreaks.length ? `Best streaks: ${topStreaks.map(h => `${h.name} (${h.streak} days)`).join(', ')}.` : null,
        needsWork.length ? `Needs attention (no streak): ${needsWork.map(h => h.name).join(', ')}.` : null,
        recentNotes.length ? `Recent habit notes: ${recentNotes.join('; ')}.` : null,
      ].filter(Boolean).join(' ');
    })() : '';

    // Build nutrition context
    const nutritionContext = latestNutrition ? (() => {
      const totals = latestNutrition.dailyTotals || {};
      return `Today's nutrition: ${totals.calories || 0} cal, ${totals.protein || 0}g protein, ${totals.carbs || 0}g carbs, ${totals.fat || 0}g fat. Water: ${latestNutrition.waterIntake || 0}ml.`;
    })() : '';

    // Build user profile context
    const profileContext = user ? [
      `User: ${user.name}, Age: ${user.age || 'not set'}, Gender: ${user.gender || 'not set'}.`,
      user.dietType ? `Diet type: ${user.dietType.toUpperCase()} (STRICT - must follow this diet).` : null,
      user.avoidFoods?.length ? `Foods to AVOID: ${user.avoidFoods.join(', ')}.` : null,
      user.allergies?.length ? `Allergies: ${user.allergies.join(', ')}.` : null,
      user.conditions?.length ? `Health conditions: ${user.conditions.join(', ')}.` : null,
      user.medications?.length ? `Medications: ${user.medications.map(m => m.name).join(', ')}.` : null,
      user.trainingGoals?.length ? `Training goals: ${user.trainingGoals.join(', ')}.` : null,
      user.preferredWorkouts?.length ? `Preferred workouts: ${user.preferredWorkouts.join(', ')}.` : null,
      user.chronotype ? `Chronotype: ${user.chronotype}, Energy peaks in ${user.energyPeakTime || 'morning'}.` : null,
    ].filter(Boolean).join(' ') : '';

    // Build wellness context from mental log
    const wellnessContext = latestMental ? [
      `Wellness check-in: mood ${latestMental.mood}, stress ${latestMental.stressLevel}/10, energy ${latestMental.energyLevel}/10.`,
      latestMental.sleepHours ? `Sleep: ${latestMental.sleepHours} hours.` : null,
      latestMental.bodyFeel ? `Body feel: ${latestMental.bodyFeel}/10.` : null,
      latestMental.medsTaken?.length ? `Medications taken: ${latestMental.medsTaken.join(', ')}.` : null,
      latestMental.journalSnippet ? `Journal: "${latestMental.journalSnippet.slice(0, 100)}..."` : null,
      latestMental.notes ? `Wellness notes: "${latestMental.notes.slice(0, 150)}"` : null,
    ].filter(Boolean).join(' ') : '';

    const journalContext = latestJournal?.text
      ? `Latest journal entry: "${latestJournal.text.slice(0, 700)}"`
      : '';

    // Build fitness context
    const fitnessContext = latestFitness 
      ? `Last workout: ${latestFitness.focus || latestFitness.type}, intensity ${latestFitness.intensity}/10, fatigue ${latestFitness.fatigue}/10.${latestFitness.notes ? ` Notes: ${latestFitness.notes}` : ''}`
      : '';

    const symptomsContext = mode === 'medical' && Array.isArray(symptomLogs) && symptomLogs.length
      ? (() => {
        const items = symptomLogs.slice(0, 8).map((s) => {
          const d = s.date ? new Date(s.date) : null;
          const day = d ? d.toISOString().slice(0, 10) : 'unknown-date';
          const sev = s.severity == null ? 'n/a' : `${s.severity}/10`;
          const tags = Array.isArray(s.tags) && s.tags.length ? ` [tags: ${s.tags.slice(0, 6).join(', ')}]` : '';
          const note = s.notes ? ` Notes: ${String(s.notes).slice(0, 120)}` : '';
          return `${day}: ${s.symptomName} (severity ${sev}).${tags}${note}`;
        });
        return `Recent symptom logs: ${items.join(' | ')}.`;
      })()
      : '';

    const labsContext = mode === 'medical' && Array.isArray(labReports) && labReports.length
      ? (() => {
        const latest = labReports[0];
        const d = latest?.date ? new Date(latest.date) : null;
        const day = d ? d.toISOString().slice(0, 10) : 'unknown-date';

        const abnormal = (latest?.results || [])
          .filter((r) => r && (r.flag === 'high' || r.flag === 'low'))
          .slice(0, 6)
          .map((r) => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ''} (${r.flag})`);

        const top = (latest?.results || [])
          .slice(0, 6)
          .map((r) => `${r.name}: ${r.value}${r.unit ? ` ${r.unit}` : ''}`);

        const highlights = abnormal.length ? `Highlights: ${abnormal.join(', ')}.` : (top.length ? `Top results: ${top.join(', ')}.` : '');
        return `Latest lab report: ${latest?.panelName || 'Panel'} on ${day}. ${highlights}`.trim();
      })()
      : '';

    const supplementAdvisorEnabled = String(process.env.MEDICAL_SUPPLEMENT_ADVISOR || '1').trim() !== '0';
    const supplementAdvice = mode === 'medical' && supplementAdvisorEnabled
      ? buildSupplementAdvice({ user, symptomLogs, labReports })
      : null;

    const supplementAdvisorContext = mode === 'medical' && supplementAdvice
      ? buildSupplementAdvisorContext(supplementAdvice)
      : '';

    const ragContext = mode === 'medical' && rag?.ok && rag?.ragContext
      ? rag.ragContext
      : '';

    // Build wardrobe context (for style questions)
    const wardrobeContext = wardrobeItems.length > 0 ? (() => {
      const categories = {};
      wardrobeItems.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });
      const favorites = wardrobeItems.filter(i => i.favorite).map(i => i.name).slice(0, 5);
      return [
        `Wardrobe: ${wardrobeItems.length} items.`,
        `Categories: ${Object.entries(categories).map(([k, v]) => `${v} ${k}`).join(', ')}.`,
        favorites.length ? `Favorites: ${favorites.join(', ')}.` : null,
      ].filter(Boolean).join(' ');
    })() : '';

    const dataCounts = `Data available: ${fitness.length} workouts, ${nutrition.length} nutrition logs, ${mental.length} wellness logs, ${journalEntries.length} journal entries, ${habits.length} active habits, ${wardrobeItems.length} wardrobe items.`;

    const buildMemoryContextForMode = () => {
      // Keep this intentionally simple. We'll tighten further once we have dedicated symptom/labs models.
      if (mode === 'therapy') {
        return [
          profileContext,
          wellnessContext,
          journalContext,
          habitContext,
          dataCounts,
        ].filter(Boolean).join(' ');
      }

      if (mode === 'fitness') {
        return [
          profileContext,
          fitnessContext,
          habitContext,
          wellnessContext,
          dataCounts,
        ].filter(Boolean).join(' ');
      }

      if (mode === 'medical') {
        return [
          profileContext,
          ragContext,
          supplementAdvisorContext,
          symptomsContext,
          labsContext,
          wellnessContext,
          nutritionContext,
          fitnessContext,
          habitContext,
          dataCounts,
        ].filter(Boolean).join(' ');
      }

      // general
      return [
        profileContext,
        wellnessContext,
        journalContext,
        nutritionContext,
        fitnessContext,
        habitContext,
        wardrobeContext,
        dataCounts,
      ].filter(Boolean).join(' ');
    };

    const memoryContext = buildMemoryContextForMode();

    const safety = runHealthTriage({ message, user });
    const safetyContext = `Safety triage (rules, not diagnosis): ${JSON.stringify(safety)}`;

    const systemPrompt = buildSystemPrompt({ mode });

    let llmReply = await generateLLMReply({
      message,
      memoryContext: `${memoryContext} ${safetyContext}`,
      systemPrompt,
      history,
    });

    if (!llmReply) {
      llmReply =
        'This is a memory-aware LifeSync response based on your recent patterns. ' +
        (latestMental
          ? `Your last recorded mood was ${latestMental.mood} with stress level ${latestMental.stressLevel}. `
          : '') +
        (latestFitness
          ? `Your recent workout focus was ${latestFitness.focus || latestFitness.type} with perceived fatigue ${latestFitness.fatigue}. `
          : '') +
        'As we evolve the AI layer, this response will become more personalized and explanatory.';
    }

    // Only surface triage in the plain-text reply when relevant (keeps dashboard-style prompts clean).
    const shouldAppendTriage = riskRank(safety.risk_level) >= 1 || (safety.red_flags || []).length > 0;
    if (shouldAppendTriage) {
      const lines = [];
      lines.push('');
      lines.push('Safety triage (not diagnosis):');
      lines.push(`- Risk level: ${safety.risk_level} (${Math.round((safety.confidence || 0) * 100)}% confidence)`);
      lines.push(`- Reason: ${safety.reason}`);
      if (safety.red_flags?.length) lines.push(`- Red flags: ${safety.red_flags.join('; ')}`);
      if (safety.doctor_discussion_points?.length) lines.push(`- Questions to ask a clinician: ${safety.doctor_discussion_points.join(' | ')}`);
      if (safety.medication_awareness?.length) lines.push(`- Medication awareness: ${safety.medication_awareness.join(' | ')}`);
      lines.push(safety.disclaimer);
      llmReply = `${llmReply}\n${lines.join('\n')}`;
    }

    const response = {
      message,
      mode,
      reply: llmReply,
      safety,
      supplementAdvisor: supplementAdvice,
      memorySnapshot: {
        fitnessCount: fitness.length,
        nutritionCount: nutrition.length,
        mentalCount: mental.length,
        habitCount: habits.length,
        habitLogsCount: habitLogs.length,
        symptomLogsCount: Array.isArray(symptomLogs) ? symptomLogs.length : 0,
        labReportsCount: Array.isArray(labReports) ? labReports.length : 0,
        ragConfidence: typeof rag?.confidence === 'number' ? rag.confidence : 0,
        ragCitationsCount: Array.isArray(rag?.citations) ? rag.citations.length : 0,
      },
    };

    // Store a lightweight memory summary stub (non-blocking) - skipped for MVP without auth
    // TODO: Re-enable with proper user context
    // try {
    //   await MemorySummary.create({
    //     user: userId,
    //     periodLabel: 'recent-interaction',
    //     summary: `User asked: "${message.slice(0, 120)}"...`,
    //     tags: ['interaction', 'mvp'],
    //   });
    // } catch (e) {
    //   console.error('Failed to store memory summary', e);
    // }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

module.exports = router;
