function pct(score01) {
  const n = Number(score01)
  if (!Number.isFinite(n)) return null
  return Math.round(Math.max(0, Math.min(1, n)) * 100)
}

function titleFromInput(input) {
  const s = String(input || '').trim()
  if (!s) return 'This food'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function describeMetric(metric, name) {
  if (!metric) return null
  const label = metric.label || 'unknown'
  const p = pct(metric.score)
  const suffix = p == null ? '' : ` (${p}%)`
  return `${name}: ${label}${suffix}`
}

function conditionDisplay(conditionId) {
  const s = String(conditionId || '').trim()
  if (!s) return null
  // Keep it readable.
  return s.replace(/_/g, ' ')
}

function buildCautions({ derivedMetrics, diseaseAnalysis }) {
  const cautions = []

  const gp = derivedMetrics?.glycemic_pressure?.label
  if (gp === 'high') cautions.push('Higher glycemic impact — portion and pairing matter.')
  if (gp === 'moderate') cautions.push('Moderate glycemic impact — pairing with protein/fiber may help stability.')

  const inflammatory = derivedMetrics?.inflammatory_potential?.label
  if (inflammatory === 'high') cautions.push('Higher inflammatory potential — consider overall context and frequency.')

  const highTrigger = (diseaseAnalysis || []).some((d) => d?.computed?.highest_trigger?.risk_level === 'high')
  if (highTrigger) cautions.push('A higher-risk pattern trigger was detected — consider discussing with a clinician if this matches your symptoms.')

  return cautions.slice(0, 4)
}

function buildBullets({ mealObject, nutrientGraph, derivedMetrics, diseaseAnalysis }) {
  const bullets = []

  if (mealObject?.serving?.description || mealObject?.serving?.weight_g) {
    bullets.push(
      `Serving context: ${mealObject?.serving?.description || '1 serving'} (${mealObject?.serving?.weight_g || '—'} g).`
    )
  }

  const calories = Number(nutrientGraph?.serving?.calories)
  if (Number.isFinite(calories)) bullets.push(`Energy: ~${Math.round(calories)} kcal for the analyzed serving.`)

  const gm = describeMetric(derivedMetrics?.glycemic_pressure, 'Glycemic pressure')
  const sat = describeMetric(derivedMetrics?.satiety_index, 'Satiety')
  const inf = describeMetric(derivedMetrics?.inflammatory_potential, 'Inflammatory potential')

  if (gm) bullets.push(gm)
  if (sat) bullets.push(sat)
  if (inf) bullets.push(inf)

  if (Array.isArray(diseaseAnalysis) && diseaseAnalysis.length) {
    const items = diseaseAnalysis
      .map((d) => {
        const id = d?.disease?.disease_id
        const headline = d?.safe_output?.headline
        if (!id || !headline) return null
        return { id, headline }
      })
      .filter(Boolean)

    for (const it of items.slice(0, 2)) {
      bullets.push(`For ${conditionDisplay(it.id)}: ${it.headline}.`)
    }
  }

  return bullets.slice(0, 7)
}

function buildNarrative({ input, mealObject, derivedMetrics, diseaseAnalysis }) {
  const title = titleFromInput(input)
  const gp = derivedMetrics?.glycemic_pressure?.label
  const sat = derivedMetrics?.satiety_index?.label

  const base = []
  base.push(`${title} was analyzed from your saved recipe/serving data when available, then converted into derived metrics.`)

  if (gp === 'high') base.push('Its glycemic pressure is high, which can contribute to faster blood sugar swings for some people.')
  else if (gp === 'moderate') base.push('Its glycemic pressure is moderate, so portion size and what you pair it with can change the overall impact.')
  else if (gp === 'low') base.push('Its glycemic pressure is low, suggesting a steadier energy profile for many people.')

  if (sat === 'high') base.push('It also scores high for satiety, meaning it may keep you full longer.')
  else if (sat === 'moderate') base.push('Satiety is moderate, so you may feel satisfied depending on portion and timing.')
  else if (sat === 'low') base.push('Satiety is low, so you may get hungry sooner unless you pair it with protein/fiber.')

  const diseaseLine = Array.isArray(diseaseAnalysis) && diseaseAnalysis.length
    ? `Based on your profile conditions (${diseaseAnalysis.map((d) => conditionDisplay(d?.disease?.disease_id)).filter(Boolean).join(', ')}), the system computed mechanical risk contributions — not medical advice.`
    : null

  if (diseaseLine) base.push(diseaseLine)

  return base.join(' ')
}

function buildPersonalizedExplanation({ input, mealObject, nutrientGraph, derivedMetrics, diseaseAnalysis }) {
  const narrative = buildNarrative({ input, mealObject, derivedMetrics, diseaseAnalysis })
  const bullets = buildBullets({ mealObject, nutrientGraph, derivedMetrics, diseaseAnalysis })
  const cautions = buildCautions({ derivedMetrics, diseaseAnalysis })

  return {
    narrative,
    bullets,
    cautions,
    limits: {
      no_diagnosis: true,
      no_medication_advice: true,
      no_dosage_suggestions: true,
    },
  }
}

module.exports = {
  buildPersonalizedExplanation,
}
