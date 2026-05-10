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
 * Lightweight router to choose an assistant persona based on expanded keywords and semantic combinations.
 */
function detectAssistantMode({ message }) {
  const text = normalize(message)
  if (!text) return 'general'

  // Explicit user override prefixes (fast path)
  if (text.startsWith('medical:') || text.startsWith('doctor:') || text.startsWith('health:')) return 'medical'
  if (text.startsWith('therapy:') || text.startsWith('therapist:') || text.startsWith('mental:')) return 'therapy'
  if (text.startsWith('fitness:') || text.startsWith('coach:') || text.startsWith('workout:')) return 'fitness'

  // Expanded Medical Keywords
  const medicalScore = scoreAny(text, [
    'symptom', 'pain', 'headache', 'migraine', 'fever', 'cough', 'cold', 'infection', 'blood', 'lab', 'report',
    'vitamin', 'deficiency', 'supplement', 'medicine', 'medication', 'dose', 'diagnose', 'disease', 'condition',
    'allergy', 'rash', 'asthma', 'diabetes', 'thyroid', 'nausea', 'dizzy', 'dizziness', 'injury', 'swelling', 'bp',
    'blood pressure', 'heart rate', 'cholesterol', 'doctor', 'physician', 'hospital', 'clinic', 'surgery', 'pill', 'tablet'
  ])

  // Expanded Therapy Keywords
  const therapyScore = scoreAny(text, [
    'anxious', 'anxiety', 'panic', 'depressed', 'depression', 'lonely', 'stress', 'burnout', 'overwhelmed', 'motivation',
    'confidence', 'self esteem', 'relationship', 'breakup', 'family', 'friend', 'anger', 'grief', 'trauma', 'therapy',
    'therapist', 'mental health', 'addiction', 'urge', 'relapse', 'sad', 'sadness', 'crying', 'cry', 'hopeless',
    'worthless', 'guilt', 'guilty', 'shame', 'ashamed', 'fear', 'scared', 'worry', 'worried', 'nervous', 'mood'
  ])

  // Expanded Fitness Keywords
  const fitnessScore = scoreAny(text, [
    'workout', 'exercise', 'gym', 'training', 'program', 'routine', 'muscle', 'strength', 'hypertrophy', 'cardio',
    'running', 'steps', 'calories', 'cut', 'bulk', 'fat loss', 'weight loss', 'lift', 'deadlift', 'bench', 'squat',
    'injury', 'ankle', 'knee', 'back pain', 'reps', 'sets', 'pr', 'pb', 'one rep max', '1rm', 'dumbbells', 'barbell',
    'stretching', 'flexibility', 'mobility', 'yoga', 'pilates', 'pullups', 'pushups', 'protein powder', 'creatine', 'preworkout'
  ])

  // Contextual overrides (e.g. "back pain" + "sad" -> maybe medical/therapy)
  // We handle false positives like "My back pain makes me depressed" by evaluating the dominant score.

  const generalNutritionScore = scoreAny(text, ['diet', 'nutrition', 'meal', 'macro', 'protein', 'carbs', 'fat', 'food', 'eating', 'hungry', 'craving'])
  const likelyGeneral = generalNutritionScore > 0 && medicalScore === 0 && therapyScore === 0 && fitnessScore === 0
  if (likelyGeneral) return 'general'

  const best = Math.max(medicalScore, therapyScore, fitnessScore)
  if (best <= 0) return 'general'
  if (best === medicalScore) return 'medical'
  if (best === therapyScore) return 'therapy'
  return 'fitness'
}

module.exports = { detectAssistantMode }

