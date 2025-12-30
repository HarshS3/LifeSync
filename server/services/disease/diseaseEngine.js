const { DiseaseProfile } = require('../../models/nutritionKnowledge')
const { NutritionLog } = require('../../models/Logs')

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function conditionToDiseaseIdCandidates(condition) {
  const raw = String(condition || '').trim().toLowerCase()
  const norm = normalizeKey(raw)
  if (!norm) return []

  const out = new Set([norm, raw])
  // Common heuristics
  if (norm === 'diabetes') out.add('diabetes_type_2')
  if (raw.includes('type 2') || raw.includes('type-2') || raw.includes('t2d')) out.add('diabetes_type_2')
  if (norm === 'type_2_diabetes' || norm === 'diabetes_type_2' || norm === 'type_ii_diabetes') out.add('diabetes_type_2')
  return Array.from(out)
}

function buildDefaultDiseaseProfiles({ conditions, locale = 'en' }) {
  const normConditions = (conditions || []).map((c) => normalizeKey(c)).filter(Boolean)
  const hasDiabetes = normConditions.includes('diabetes_type_2') || normConditions.includes('diabetes') || normConditions.includes('type_2_diabetes') || normConditions.includes('t2d')

  if (!hasDiabetes) return []

  return [
    {
      diseaseId: 'diabetes_type_2',
      name: 'Type 2 Diabetes',
      category: 'metabolic',
      chronic: true,
      locale,
      affectedAxes: ['blood_glucose', 'insulin_response', 'glycemic_variability'],
      sensitivities: new Map(
        Object.entries({
          high_glycemic_load: { effect: 'negative', strength: 0.8 },
          fiber_intake: { effect: 'positive', strength: 0.6 },
          meal_timing_irregularity: { effect: 'negative', strength: 0.5 },
        })
      ),
      riskTriggers: [
        { pattern: 'frequent_high_glycemic_meals', windowDays: 7, riskLevel: 'moderate', meta: { thresholdCount: 5 } },
        { pattern: 'persistent_fatigue + thirst', windowDays: 14, riskLevel: 'high', meta: { requiresSymptoms: true } },
      ],
      systemLimits: { noDiagnosis: true, noMedicationAdvice: true, noDosageSuggestions: true },
      source: 'builtin_fallback',
      confidence: 0.6,
      meta: { note: 'Fallback used because no DiseaseProfile was found in DB.' },
    },
  ]
}

function clamp01(x) {
  const n = Number(x)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function riskRank(level) {
  if (level === 'high') return 3
  if (level === 'moderate') return 2
  return 1
}

function getMetricScore(derivedMetrics, key) {
  const v = derivedMetrics?.[key]
  const score = Number(v?.score)
  if (Number.isFinite(score)) return clamp01(score)
  return null
}

function computeExposure({ sensitivityKey, derivedMetrics, mealContext }) {
  // Returns { value01, note, usedInputs } or null if unknown.
  if (!derivedMetrics) return null

  if (sensitivityKey === 'high_glycemic_load') {
    const gly = getMetricScore(derivedMetrics, 'glycemic_pressure')
    const insulin = getMetricScore(derivedMetrics, 'insulin_load_estimate')
    const value01 = gly != null ? gly : insulin
    return value01 == null
      ? null
      : { value01, note: 'Uses derived metric glycemic_pressure (or insulin_load_estimate fallback).', usedInputs: ['glycemic_pressure.score'] }
  }

  if (sensitivityKey === 'fiber_intake') {
    const fiberG = Number(derivedMetrics?.inputs?.fiber)
    if (!Number.isFinite(fiberG)) return null
    // Normalize: 0g -> 0, 10g+ -> 1
    const value01 = clamp01(fiberG / 10)
    return { value01, note: 'Uses fiber grams from derived_metrics.inputs.fiber (normalized by 10g).', usedInputs: ['inputs.fiber'] }
  }

  if (sensitivityKey === 'meal_timing_irregularity') {
    // This needs time-series meal timing (not just a single meal). We keep it computable, but return unknown
    // unless mealContext supplies a precomputed signal.
    const v = mealContext?.timingIrregularity01
    if (v == null) return null
    return { value01: clamp01(v), note: 'Uses timingIrregularity01 from mealContext (precomputed).', usedInputs: ['mealContext.timingIrregularity01'] }
  }

  return null
}

function computeContribution({ effect, strength, exposure01 }) {
  const s = clamp01(strength)
  const x = clamp01(exposure01)
  // Positive effect: higher exposure reduces risk (negative contribution).
  // Negative effect: higher exposure increases risk (positive contribution).
  if (effect === 'positive') return -1 * s * x
  if (effect === 'negative') return 1 * s * x
  return 0
}

function summarizeContribution(contribution) {
  const c = Number(contribution) || 0
  if (c > 0.45) return 'higher risk contribution'
  if (c > 0.2) return 'moderate risk contribution'
  if (c > 0.05) return 'small risk contribution'
  if (c < -0.2) return 'protective contribution'
  if (c < -0.05) return 'slightly protective contribution'
  return 'neutral contribution'
}

async function evaluateTrigger({ trigger, userId }) {
  const pattern = String(trigger?.pattern || '')
  const windowDays = Number(trigger?.windowDays) || 7

  if (pattern === 'frequent_high_glycemic_meals') {
    const start = new Date()
    start.setDate(start.getDate() - windowDays)

    const logs = await NutritionLog.find({ user: userId, date: { $gte: start } }).sort({ date: -1 }).limit(windowDays + 7)

    let highCount = 0
    let mealCount = 0

    for (const log of logs) {
      for (const meal of log.meals || []) {
        const carbs = Number(meal?.totalCarbs) || 0
        const protein = Number(meal?.totalProtein) || 0
        let fiber = 0
        for (const f of meal.foods || []) fiber += Number(f?.fiber) || 0

        const gpRaw = carbs / (fiber + protein + 1)
        mealCount += 1
        if (gpRaw > 10) highCount += 1
      }
    }

    const threshold = Number(trigger?.meta?.thresholdCount) || 5
    const fired = mealCount > 0 && highCount >= threshold

    return {
      pattern,
      supported: true,
      fired,
      window_days: windowDays,
      observed: { high_glycemic_meals: highCount, meals: mealCount, threshold },
      risk_level: fired ? trigger.riskLevel : 'low',
      note: 'Computed from logged meal macros using glycemic pressure proxy carbs/(fiber+protein+1).',
    }
  }

  // Other triggers may require symptom streams (fatigue, thirst, etc.).
  return {
    pattern,
    supported: false,
    fired: false,
    window_days: windowDays,
    risk_level: 'low',
    note: 'Not evaluated: requires symptom/time-series inputs not currently stored in logs.',
  }
}

async function analyzeDiseaseImpact({ user, derivedMetrics, mealContext = {}, locale = 'en' }) {
  const conditions = Array.isArray(user?.conditions) ? user.conditions.filter(Boolean) : []
  if (conditions.length === 0) return []

  const idCandidates = Array.from(
    new Set(
      conditions.flatMap((c) => conditionToDiseaseIdCandidates(c))
    )
  )

  let profiles = []
  try {
    profiles = await DiseaseProfile.find({ diseaseId: { $in: idCandidates }, locale })
  } catch (_) {
    profiles = []
  }

  // Fallback: match by alias or name if user stored a friendly string.
  if (!profiles.length) {
    const normConditions = conditions.map((c) => normalizeKey(c)).filter(Boolean)
    try {
      profiles = await DiseaseProfile.find({
        locale,
        $or: [
          { aliases: { $in: conditions } },
          { aliases: { $in: normConditions } },
          { name: { $in: conditions } },
        ],
      })
    } catch (_) {
      profiles = []
    }
  }

  if (!profiles.length) {
    profiles = buildDefaultDiseaseProfiles({ conditions, locale })
  }

  if (!profiles.length) return []

  const out = []
  for (const p of profiles) {
    const sensitivities = p.sensitivities || new Map()

    const contributions = []
    let totalRiskScore01 = 0

    for (const [key, spec] of sensitivities.entries()) {
      const exposure = computeExposure({ sensitivityKey: key, derivedMetrics, mealContext })
      if (!exposure) {
        contributions.push({
          sensitivity: key,
          effect: spec.effect,
          strength: spec.strength,
          exposure: null,
          contribution: null,
          interpretation: 'not computable from current inputs',
        })
        continue
      }

      const contribution = computeContribution({ effect: spec.effect, strength: spec.strength, exposure01: exposure.value01 })
      if (contribution > 0) totalRiskScore01 += contribution

      contributions.push({
        sensitivity: key,
        effect: spec.effect,
        strength: clamp01(spec.strength),
        exposure,
        contribution: Number(contribution.toFixed(3)),
        interpretation: summarizeContribution(contribution),
      })
    }

    totalRiskScore01 = clamp01(totalRiskScore01)
    const triggers = await Promise.all((p.riskTriggers || []).map((t) => evaluateTrigger({ trigger: t, userId: user?._id })))
    const highestTrigger = triggers.reduce(
      (acc, t) => (riskRank(t.risk_level) > riskRank(acc.risk_level) ? t : acc),
      { risk_level: 'low' }
    )

    out.push({
      disease: {
        disease_id: p.diseaseId,
        name: p.name,
        category: p.category,
        chronic: p.chronic,
      },
      affected_axes: p.affectedAxes || [],
      sensitivities: contributions,
      computed: {
        risk_contribution_score01: totalRiskScore01,
        highest_trigger: highestTrigger,
      },
      risk_triggers: triggers,
      system_limits: {
        no_diagnosis: Boolean(p.systemLimits?.noDiagnosis ?? true),
        no_medication_advice: Boolean(p.systemLimits?.noMedicationAdvice ?? true),
        no_dosage_suggestions: Boolean(p.systemLimits?.noDosageSuggestions ?? true),
      },
      safe_output: {
        headline:
          totalRiskScore01 > 0.6
            ? 'Higher risk for instability on affected axes'
            : totalRiskScore01 > 0.3
              ? 'Moderate risk contribution on affected axes'
              : 'Low risk contribution on affected axes',
        note: 'This is a mechanical risk contribution estimate from stored sensitivities and derived meal metrics; it is not diagnosis or medical advice.',
      },
      confidence: {
        disease_profile: Math.min(0.95, Math.max(0.4, Number(p.confidence) || 0.7)),
        computed_from_meal: derivedMetrics ? 0.75 : 0.0,
      },
      source: p.source,
    })
  }

  return out
}

module.exports = {
  analyzeDiseaseImpact,
}
