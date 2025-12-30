function normalize(s) {
  return String(s || '').toLowerCase()
}

function hasAny(text, needles) {
  return needles.some((n) => text.includes(n))
}

function extractDurationDays(text) {
  // Very lightweight heuristics.
  const t = normalize(text)
  const mWeeks = t.match(/(\d{1,2})\s*(week|weeks)/)
  if (mWeeks) return Number(mWeeks[1]) * 7
  const mDays = t.match(/(\d{1,3})\s*(day|days)/)
  if (mDays) return Number(mDays[1])
  if (t.includes('couple of weeks')) return 14
  if (t.includes('few weeks')) return 21
  if (t.includes('months') || t.includes('month')) return 60
  return null
}

function riskRank(level) {
  switch (level) {
    case 'urgent':
      return 3
    case 'elevated':
      return 2
    case 'moderate':
      return 1
    default:
      return 0
  }
}

function toConfidence(base, clamps = [0.2, 0.85]) {
  const n = Number(base)
  if (Number.isNaN(n)) return 0.5
  return Math.max(clamps[0], Math.min(clamps[1], n))
}

function buildDoctorQuestions({ symptomTags, durationDays, user }) {
  const qs = []
  if (symptomTags.has('fatigue')) qs.push('I’ve been experiencing fatigue — what tests or checks make sense given my history?')
  if (symptomTags.has('thirst_urination')) qs.push('I’ve noticed increased thirst/frequent urination — could this warrant blood sugar evaluation?')
  if (symptomTags.has('chest_breathing')) qs.push('I’ve had chest discomfort/shortness of breath — how should I evaluate this safely?')
  if (symptomTags.has('neuro')) qs.push('I’ve noticed neurologic symptoms (e.g., weakness/confusion) — does this need urgent evaluation?')
  if (symptomTags.has('gi')) qs.push('I’ve had ongoing GI symptoms — what red flags should I watch for and what might help identify triggers?')
  if (symptomTags.has('mood')) qs.push('I’ve had mood/anxiety symptoms — what evaluation and supports do you recommend?')
  if (durationDays != null && durationDays >= 14) qs.push('These symptoms have persisted ~2+ weeks — what would you prioritize ruling out first?')
  if (user?.medications?.length) qs.push('Are any of my current medications or supplements relevant to these symptoms?')
  return qs.slice(0, 6)
}

function medicationAwareness({ text, user }) {
  const t = normalize(text)
  const meds = (user?.medications || []).map((m) => normalize(m?.name)).filter(Boolean)
  const cautions = []

  // Keep this conservative: generic cautions, no dosing, no start/stop.
  if (meds.length && t.includes('grapefruit')) {
    cautions.push('Grapefruit can interact with some medicines. If you take prescription meds, consider confirming with your clinician/pharmacist.')
  }

  return cautions
}

function detectRedFlags(text) {
  const t = normalize(text)
  const flags = []

  if (hasAny(t, ['chest pain', 'chest pressure', 'tightness in chest'])) {
    flags.push('Chest pain/pressure can be a red flag')
  }
  if (hasAny(t, ['shortness of breath', 'can\'t breathe', 'difficulty breathing'])) {
    flags.push('Shortness of breath can be a red flag')
  }
  if (hasAny(t, ['fainting', 'passed out', 'syncope'])) {
    flags.push('Fainting/passing out can be a red flag')
  }
  if (hasAny(t, ['one sided weakness', 'one-sided weakness', 'face droop', 'slurred speech', 'confusion'])) {
    flags.push('Sudden neurologic symptoms can be a red flag')
  }
  if (hasAny(t, ['suicidal', 'want to die', 'hurt myself', 'self harm', 'self-harm'])) {
    flags.push('Self-harm thoughts are an urgent safety concern')
  }

  return flags
}

function runHealthTriage({ message, user }) {
  const t = normalize(message)
  const durationDays = extractDurationDays(t)
  const redFlags = detectRedFlags(t)

  const symptomTags = new Set()
  if (hasAny(t, ['fatigue', 'tired', 'exhausted', 'low energy'])) symptomTags.add('fatigue')
  if (hasAny(t, ['thirst', 'very thirsty', 'dry mouth', 'frequent urination', 'pee a lot', 'urinating a lot'])) symptomTags.add('thirst_urination')
  if (hasAny(t, ['nausea', 'vomit', 'diarrhea', 'constipation', 'bloating', 'stomach pain', 'abdominal pain'])) symptomTags.add('gi')
  if (hasAny(t, ['anxious', 'anxiety', 'panic', 'depressed', 'depression', 'hopeless', 'stress'])) symptomTags.add('mood')
  if (hasAny(t, ['chest pain', 'shortness of breath', 'difficulty breathing', 'palpitations'])) symptomTags.add('chest_breathing')
  if (hasAny(t, ['weakness', 'numbness', 'tingling', 'confusion', 'slurred speech'])) symptomTags.add('neuro')

  // Risk stratification: rules first (no diagnosis, no treatments)
  let riskLevel = 'low'
  let reason = 'No urgent red flags detected from the message alone.'
  let confidence = 0.45

  if (redFlags.length) {
    riskLevel = 'urgent'
    reason = 'Potential red-flag symptoms detected in your message.'
    confidence = 0.7
  } else {
    const hasMultiple = symptomTags.size >= 2
    const persistent = durationDays != null && durationDays >= 14
    const somewhatPersistent = durationDays != null && durationDays >= 7

    if (persistent && hasMultiple) {
      riskLevel = 'elevated'
      reason = 'Multiple symptoms persisting for ~2+ weeks may warrant medical evaluation.'
      confidence = 0.65
    } else if (somewhatPersistent && hasMultiple) {
      riskLevel = 'moderate'
      reason = 'Multiple symptoms over ~1+ week often benefit from structured tracking and medical discussion if they continue.'
      confidence = 0.58
    } else if (hasMultiple) {
      riskLevel = 'moderate'
      reason = 'Multiple symptoms appearing together can indicate a pattern worth monitoring and discussing if persistent.'
      confidence = 0.52
    } else if (persistent) {
      riskLevel = 'moderate'
      reason = 'A symptom lasting ~2+ weeks may warrant medical discussion, depending on severity and impact.'
      confidence = 0.55
    }
  }

  const possibleFactors = []
  if (symptomTags.has('fatigue')) possibleFactors.push('sleep quantity/quality', 'meal timing/composition', 'stress load', 'hydration')
  if (symptomTags.has('thirst_urination')) possibleFactors.push('hydration balance', 'high-sugar intake', 'caffeine/alcohol')
  if (symptomTags.has('gi')) possibleFactors.push('trigger foods', 'meal size', 'fiber changes')
  if (symptomTags.has('mood')) possibleFactors.push('stressors', 'sleep', 'caffeine', 'routine changes')

  const doctorQuestions = buildDoctorQuestions({ symptomTags, durationDays, user })
  const medCautions = medicationAwareness({ text: message, user })

  const summaryBits = []
  if (symptomTags.size) summaryBits.push(`Symptoms mentioned: ${Array.from(symptomTags).join(', ')}`)
  if (durationDays != null) summaryBits.push(`Duration mentioned: ~${durationDays} days`)

  return {
    summary: summaryBits.length ? summaryBits.join('. ') + '.' : 'No specific symptom pattern detected from the message alone.',
    risk_level: riskLevel,
    reason,
    confidence: toConfidence(confidence),
    red_flags: redFlags,
    possible_factors: Array.from(new Set(possibleFactors)).slice(0, 6),
    medication_awareness: medCautions,
    doctor_discussion_points: doctorQuestions,
    disclaimer: 'This is not a medical diagnosis or prescription. If symptoms are severe, worsening, or concerning, seek professional care.',
  }
}

module.exports = {
  runHealthTriage,
  riskRank,
}
