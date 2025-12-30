function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreAny(text, phrases) {
  let score = 0
  for (const p of phrases) {
    if (!p) continue
    if (text.includes(p)) score += 1
  }
  return score
}

/**
 * Very lightweight router to choose an assistant persona.
 * Keep this rule-based initially (fast, predictable). You can replace later with a model-based router.
 */
function detectAssistantMode({ message }) {
  const text = normalize(message)
  if (!text) return 'general'

  // Explicit user override prefixes (fast path)
  // Examples: "medical: ...", "therapy: ...", "fitness: ..."
  if (text.startsWith('medical:') || text.startsWith('doctor:') || text.startsWith('health:')) return 'medical'
  if (text.startsWith('therapy:') || text.startsWith('therapist:') || text.startsWith('mental:')) return 'therapy'
  if (text.startsWith('fitness:') || text.startsWith('coach:') || text.startsWith('workout:')) return 'fitness'

  const medicalScore = scoreAny(text, [
    'symptom',
    'pain',
    'headache',
    'migraine',
    'fever',
    'cough',
    'cold',
    'infection',
    'blood',
    'lab',
    'report',
    'vitamin',
    'deficiency',
    'supplement',
    'medicine',
    'medication',
    'dose',
    'diagnose',
    'disease',
    'condition',
    'allergy',
    'rash',
    'asthma',
    'diabetes',
    'thyroid',
  ])

  const therapyScore = scoreAny(text, [
    'anxious',
    'anxiety',
    'panic',
    'depressed',
    'depression',
    'lonely',
    'stress',
    'burnout',
    'overwhelmed',
    'motivation',
    'confidence',
    'self esteem',
    'relationship',
    'breakup',
    'family',
    'friend',
    'anger',
    'grief',
    'trauma',
    'therapy',
    'therapist',
    'mental health',
    'addiction',
    'urge',
    'relapse',
  ])

  const fitnessScore = scoreAny(text, [
    'workout',
    'exercise',
    'gym',
    'training',
    'program',
    'routine',
    'muscle',
    'strength',
    'hypertrophy',
    'cardio',
    'running',
    'steps',
    'calories',
    'cut',
    'bulk',
    'fat loss',
    'weight loss',
    'lift',
    'deadlift',
    'bench',
    'squat',
    'injury',
    'ankle',
    'knee',
    'back pain',
  ])

  // Tie-break: if message asks for "diet" or "nutrition" only, stay general (nutrition pipeline exists separately)
  // but if it mentions vitamins/deficiency/supplements, treat as medical.
  const generalNutritionScore = scoreAny(text, ['diet', 'nutrition', 'meal', 'macro', 'protein', 'carbs', 'fat'])
  const likelyGeneral = generalNutritionScore > 0 && medicalScore === 0 && therapyScore === 0 && fitnessScore === 0
  if (likelyGeneral) return 'general'

  const best = Math.max(medicalScore, therapyScore, fitnessScore)
  if (best <= 0) return 'general'
  if (best === medicalScore) return 'medical'
  if (best === therapyScore) return 'therapy'
  return 'fitness'
}

module.exports = { detectAssistantMode }
