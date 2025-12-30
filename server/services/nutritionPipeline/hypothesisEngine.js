const { Hypothesis, UserPrior } = require('../../models/nutritionKnowledge')
const { generateNutritionHypothesisJson } = require('../../aiClient')

function clamp(x, lo, hi) {
  const n = Number(x)
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

async function getOrInitPrior({ userId, key }) {
  if (!userId || !key) return null
  const prior = await UserPrior.findOne({ user: userId, key })
  if (prior) return prior
  return UserPrior.create({
    user: userId,
    key,
    mean: 0,
    variance: 1,
    confidence: 0.3,
    updatedFrom: 'system',
  })
}

function updatePosteriorConfidence(current, outcome) {
  const c = clamp(current, 0.05, 0.95)
  if (outcome === 'support') return clamp(c + 0.1 * (1 - c), 0.05, 0.95)
  if (outcome === 'refute') return clamp(c - 0.1 * c, 0.05, 0.95)
  return c
}

async function proposeHypothesis({ user, analysis }) {
  const userId = user?._id
  if (!userId) throw new Error('user is required')
  const canonicalId = analysis?.canonical_id
  if (!canonicalId) throw new Error('canonical_id missing in analysis')

  const glucosePrior = await getOrInitPrior({ userId, key: 'user_glucose_response_prior' })

  const llm = await generateNutritionHypothesisJson({
    canonicalId,
    input: analysis?.resolver?.input,
    derivedMetrics: analysis?.derived_metrics,
    interactions: analysis?.interactions,
    uncertainty: analysis?.uncertainty,
    userProfile: {
      conditions: user?.conditions || [],
      medications: (user?.medications || []).map((m) => m?.name).filter(Boolean),
      dietType: user?.dietType,
      prior: glucosePrior
        ? { mean: glucosePrior.mean, variance: glucosePrior.variance, confidence: glucosePrior.confidence }
        : null,
    },
  })

  const gly = Number(analysis?.derived_metrics?.glycemic_pressure?.score) || 0
  const fallback = {
    hypothesis:
      gly >= 0.6
        ? 'User may experience higher glucose spikes when this food is eaten alone or in large portions.'
        : 'User response to this food may depend strongly on portion size and meal context (pairing with protein/fiber).',
    supporting_factors: [
      gly >= 0.6 ? 'higher glycemic_pressure signal' : 'moderate glycemic_pressure signal',
      'timing and pairing effects',
    ],
    confidence: gly >= 0.6 ? 0.55 : 0.45,
    recommended_validation:
      'Observe your next 3 occurrences of this food and note context (portion size, pairing, timing) and any measurable response.',
  }

  const proposed = llm || fallback

  const doc = await Hypothesis.create({
    user: userId,
    canonicalId,
    hypothesis: String(proposed.hypothesis || '').slice(0, 400),
    supportingFactors: Array.isArray(proposed.supporting_factors) ? proposed.supporting_factors.slice(0, 8) : [],
    recommendedValidation: String(proposed.recommended_validation || '').slice(0, 400),
    confidence: clamp(proposed.confidence, 0.05, 0.95),
    status: 'proposed',
    meta: { source: llm ? 'llm' : 'rules' },
  })

  return doc
}

async function recordHypothesisFeedback({ userId, hypothesisId, outcome, note }) {
  const doc = await Hypothesis.findOne({ _id: hypothesisId, user: userId })
  if (!doc) return null

  doc.observations.push({ outcome, note: String(note || '').slice(0, 400) })
  doc.confidence = updatePosteriorConfidence(doc.confidence, outcome)
  doc.status = outcome === 'support' ? (doc.confidence >= 0.75 ? 'confirmed' : 'testing') : (doc.confidence <= 0.25 ? 'rejected' : 'testing')
  await doc.save()
  return doc
}

module.exports = {
  proposeHypothesis,
  recordHypothesisFeedback,
}
