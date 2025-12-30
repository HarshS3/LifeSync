const { buildInteractionFlags } = require('./interactions')

function norm(s) {
  return String(s || '').toLowerCase().trim()
}

function uniqByKey(items, keyFn) {
  const seen = new Set()
  const out = []
  for (const it of items) {
    const k = keyFn(it)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}

function summarizeLabs(labReports) {
  if (!Array.isArray(labReports) || labReports.length === 0) return null
  const latest = labReports[0]
  const abnormal = (latest?.results || []).filter((r) => r && (r.flag === 'high' || r.flag === 'low'))
  const lowHb = (latest?.results || []).some((r) => norm(r?.name).includes('hemoglobin') && r.flag === 'low')

  return {
    panelName: latest?.panelName || null,
    date: latest?.date ? new Date(latest.date) : null,
    abnormalCount: abnormal.length,
    lowHemoglobin: lowHb,
  }
}

function summarizeSymptoms(symptomLogs) {
  if (!Array.isArray(symptomLogs) || symptomLogs.length === 0) return { top: [] }
  const top = symptomLogs
    .slice(0, 20)
    .map((s) => ({ name: norm(s?.symptomName), severity: s?.severity }))
    .filter((s) => s.name)

  return { top }
}

function buildSupplementAdvice({ user, symptomLogs, labReports }) {
  const recommendations = []
  const contraindications = []
  const nextSteps = []

  const labs = summarizeLabs(labReports)
  const symptoms = summarizeSymptoms(symptomLogs)

  const symptomNames = new Set(symptoms.top.map((s) => s.name))

  // Minimal, conservative library of suggestions.
  // We do NOT include dosing; we do include interaction/avoidance flags.
  const candidateSupplements = []

  // General safety / common deficiencies
  candidateSupplements.push({
    name: 'Vitamin D',
    reason: 'Common deficiency; may be worth checking if fatigue/low mood or limited sun exposure.',
    expected_benefit: 'May support bone/immune health if deficient.',
    evidence_strength: 'mixed',
    when_to_consider: 'Especially if you have a lab-confirmed low vitamin D level.',
  })

  // Sleep/stress-related symptoms (very conservative)
  if (symptomNames.has('headache') || symptomNames.has('nausea')) {
    candidateSupplements.push({
      name: 'Magnesium (glycinate or citrate)',
      reason: 'Some people find magnesium helpful for sleep quality or muscle tension; occasionally discussed for headaches. Evidence varies.',
      expected_benefit: 'May help sleep quality or muscle relaxation for some people.',
      evidence_strength: 'mixed',
      when_to_consider: 'If you do not have kidney disease and your clinician has no concerns.',
    })
  }

  // Omega-3: general health suggestion, but flag bleeding risks.
  candidateSupplements.push({
    name: 'Omega-3 (fish oil)',
    reason: 'Sometimes used for triglycerides/inflammation; evidence depends on goal and formulation.',
    expected_benefit: 'May support cardiovascular markers for some people; varies by individual.',
    evidence_strength: 'mixed',
    when_to_consider: 'If your diet is low in fatty fish and there are no bleeding-risk meds.',
  })

  // Iron: only as a "check labs" next step; avoid direct recommendation.
  if (labs?.lowHemoglobin) {
    contraindications.push({
      item: 'Iron supplementation',
      reason: 'Your latest labs show low hemoglobin; do not start iron unless iron deficiency is confirmed (e.g., ferritin/transferrin saturation) and a clinician recommends it.',
    })
    nextSteps.push('If hemoglobin is low, ask for iron studies (ferritin, transferrin saturation) and evaluation for the cause.')
  }

  // Apply interaction flags and assemble final list.
  for (const c of candidateSupplements) {
    const flags = buildInteractionFlags({ user, supplementName: c.name })

    // If any "avoid" flags exist, move to contraindications instead.
    const avoid = flags.filter((f) => f.level === 'avoid')
    const cautions = flags.filter((f) => f.level !== 'avoid')

    if (avoid.length) {
      contraindications.push({
        item: c.name,
        reason: avoid.map((x) => x.reason).join(' '),
      })
      continue
    }

    recommendations.push({
      name: c.name,
      reason: c.reason,
      expected_benefit: c.expected_benefit,
      evidence_strength: c.evidence_strength,
      cautions: cautions.map((x) => x.reason),
      notes: c.when_to_consider,
      non_prescriptive: true,
    })
  }

  // General next steps that are safe.
  if (symptomNames.size > 0) {
    nextSteps.push('Track symptom timing, triggers, severity, sleep, hydration, caffeine, and new foods/meds.')
    nextSteps.push('If symptoms are worsening, persistent, or have red flags, seek urgent clinical evaluation.')
  }

  const disclaimer =
    'This is general information, not a diagnosis or prescription. Do not start/stop medications or supplements based on this alone; review with a clinician/pharmacist, especially if pregnant, managing chronic conditions, or taking medications.'

  return {
    recommendations: uniqByKey(recommendations, (r) => norm(r.name)),
    contraindications: uniqByKey(contraindications, (r) => norm(r.item)),
    next_steps: Array.from(new Set(nextSteps)),
    disclaimer,
  }
}

function buildSupplementAdvisorContext(supplementAdvice) {
  if (!supplementAdvice) return ''
  const safeJson = JSON.stringify(supplementAdvice)
  return `Supplement advisor (non-prescriptive JSON): ${safeJson}`
}

module.exports = { buildSupplementAdvice, buildSupplementAdvisorContext }
