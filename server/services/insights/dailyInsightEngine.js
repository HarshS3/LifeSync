const DailyInsight = require('../../models/DailyInsight')
const User = require('../../models/User')
const SymptomLog = require('../../models/SymptomLog')
const LabReport = require('../../models/LabReport')
const { NutritionLog } = require('../../models/Logs')
const { analyzeFood } = require('../nutritionPipeline/orchestrator')
const { generateLLMReply } = require('../../aiClient')
const crypto = require('crypto')

function normalizeDay(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date()
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  d.setHours(0, 0, 0, 0)
  const start = new Date(d)
  const end = new Date(d)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function maxDate(a, b) {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

function normFoodKey(s) {
  return String(s || '').trim().toLowerCase()
}

function computeMealSignals(log) {
  const meals = Array.isArray(log?.meals) ? log.meals : []
  let mealsCount = meals.length
  let highGlycemicProxyMeals = 0
  let totalMealsWithMacros = 0

  for (const meal of meals) {
    const carbs = Number(meal?.totalCarbs) || 0
    const protein = Number(meal?.totalProtein) || 0
    let fiber = 0
    for (const f of meal?.foods || []) fiber += Number(f?.fiber) || 0

    // Proxy used elsewhere in disease engine: carbs/(fiber+protein+1)
    const gpRaw = carbs / (fiber + protein + 1)
    if (carbs || protein || fiber) totalMealsWithMacros += 1
    if (gpRaw > 10) highGlycemicProxyMeals += 1
  }

  return {
    meals_count: mealsCount,
    high_glycemic_proxy_meals: highGlycemicProxyMeals,
    meals_with_macros: totalMealsWithMacros,
    proxy_note: 'High-glycemic proxy is computed as carbs/(fiber+protein+1) from logged meal macros.'
  }
}

function summarizeUncertainty(foods) {
  const vals = foods
    .map((f) => Number(f?.uncertainty?.nutrient_accuracy))
    .filter((n) => Number.isFinite(n))
  if (!vals.length) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return { nutrient_accuracy_avg: Number(avg.toFixed(3)), foods_count: vals.length }
}

function summarizeInteractions(foods) {
  const flat = []
  for (const f of foods) {
    for (const i of f?.interactions || []) {
      flat.push({
        food: f.name,
        canonicalId: f.canonicalId,
        targetKind: i.targetKind,
        targetKey: i.targetKey,
        interactionType: i.interactionType,
        riskLevel: i.riskLevel,
        strength: i.strength,
        uncertainty: i.uncertainty,
        meta: i.meta,
      })
    }
  }

  const ranked = flat
    .filter((i) => i.riskLevel && i.riskLevel !== 'none')
    .sort((a, b) => (Number(b.strength) || 0) - (Number(a.strength) || 0))

  const riskCounts = ranked.reduce(
    (acc, i) => {
      acc[i.riskLevel] = (acc[i.riskLevel] || 0) + 1
      return acc
    },
    { high: 0, moderate: 0, low: 0 }
  )

  return {
    risk_counts: riskCounts,
    top: ranked.slice(0, 8),
  }
}

function summarizeDisease(foods) {
  const byDisease = new Map()
  for (const f of foods) {
    for (const d of f?.diseaseAnalysis || []) {
      const id = d?.disease?.disease_id
      if (!id) continue
      const key = String(id)
      const score = Number(d?.computed?.risk_contribution_score01)
      const prev = byDisease.get(key)
      if (!prev || (Number.isFinite(score) && score > prev.risk_contribution_score01)) {
        byDisease.set(key, {
          disease_id: key,
          name: d?.disease?.name,
          category: d?.disease?.category,
          risk_contribution_score01: Number.isFinite(score) ? Number(score.toFixed(3)) : null,
          highest_trigger: d?.computed?.highest_trigger || null,
          safe_headline: d?.safe_output?.headline || null,
        })
      }
    }
  }
  return Array.from(byDisease.values()).sort((a, b) => (b.risk_contribution_score01 || 0) - (a.risk_contribution_score01 || 0))
}

function buildBullets({ user, log, mealSignals, interactionSummary, uncertaintySummary, diseaseSummary }) {
  const bullets = []

  const totals = log?.dailyTotals || {}
  const calories = Number(totals?.calories) || 0
  const protein = Number(totals?.protein) || 0
  const carbs = Number(totals?.carbs) || 0
  const fat = Number(totals?.fat) || 0
  const fiber = Number(totals?.fiber) || 0
  const sugar = Number(totals?.sugar) || 0
  const sodium = Number(totals?.sodium) || 0
  const waterMl = Number(log?.waterIntake) || 0

  const calorieTarget = Number(user?.dailyCalorieTarget) || 0
  const proteinTarget = Number(user?.dailyProteinTarget) || 0

  const fmtDelta = (actual, target, unit) => {
    if (!target || actual == null) return null
    const delta = actual - target
    const abs = Math.round(Math.abs(delta))
    const sign = delta >= 0 ? '+' : '-'
    const pct = Math.round((Math.abs(delta) / target) * 100)
    return `${sign}${abs}${unit}${pct ? ` (${pct}%)` : ''}`
  }

  const goalLabel = (actual, target, withinFrac) => {
    if (!target || !actual) return null
    const frac = Math.abs(actual - target) / target
    if (frac <= withinFrac) return 'on track'
    if (frac <= withinFrac * 2) return actual > target ? 'slightly high' : 'slightly low'
    return actual > target ? 'high' : 'low'
  }

  // Coverage / basic sanity
  const mealsCount = Number(mealSignals?.meals_count) || 0
  if (mealsCount === 0 && calories === 0) {
    return ['No meals logged — insights are limited.']
  }

  if (mealsCount <= 1) {
    bullets.push('Only 1 meal logged — patterns may be noisy.')
  }

  // Goals (if user has them)
  if (calories > 0 && calorieTarget > 0) {
    const delta = fmtDelta(calories, calorieTarget, ' kcal')
    const label = goalLabel(calories, calorieTarget, 0.07)
    bullets.push(`Calories: ${Math.round(calories)} / ${Math.round(calorieTarget)} kcal — ${label}${delta ? ` (${delta})` : ''}.`)
  } else if (calories > 0) {
    bullets.push(`Calories logged: ${Math.round(calories)} kcal.`)
  }

  if (protein > 0 && proteinTarget > 0) {
    const delta = fmtDelta(protein, proteinTarget, 'g')
    const label = goalLabel(protein, proteinTarget, 0.10)
    bullets.push(`Protein: ${Math.round(protein)} / ${Math.round(proteinTarget)}g — ${label}${delta ? ` (${delta})` : ''}.`)
  } else if (protein > 0) {
    bullets.push(`Protein logged: ${Math.round(protein)}g.`)
  }

  // Macro balance (simple, non-prescriptive)
  if (carbs > 0 || fat > 0 || protein > 0) {
    const macroCals = {
      protein: protein * 4,
      carbs: carbs * 4,
      fat: fat * 9,
    }
    const total = macroCals.protein + macroCals.carbs + macroCals.fat
    if (total > 0) {
      const pP = Math.round((macroCals.protein / total) * 100)
      const cP = Math.round((macroCals.carbs / total) * 100)
      const fP = Math.round((macroCals.fat / total) * 100)
      bullets.push(`Macro split: P${pP}% / C${cP}% / F${fP}%.`)
    }
  }

  // Quality flags
  if (fiber > 0 && fiber < 20) {
    bullets.push(`Fiber is low (${Math.round(fiber)}g). Aim for ~25–30g via legumes/veg/berries/whole grains.`)
  }

  if (sodium > 2300) {
    bullets.push(`Sodium is high (${Math.round(sodium)} mg). Consider reducing packaged/salty foods.`)
  }

  if (sugar > 60) {
    bullets.push(`Sugar is high (${Math.round(sugar)}g). Consider swapping in lower-sugar options.`)
  }

  if (waterMl > 0 && waterMl < 1500) {
    bullets.push(`Hydration looks low (${Math.round(waterMl)} ml logged).`)
  }

  // Quality snapshot (compact, non-prescriptive)
  {
    const parts = []
    if (fiber > 0) parts.push(`fiber ${Math.round(fiber)}g`)
    if (sugar > 0) parts.push(`sugar ${Math.round(sugar)}g`)
    if (sodium > 0) parts.push(`sodium ${Math.round(sodium)}mg`)
    if (waterMl > 0) parts.push(`water ${Math.round(waterMl)}ml`)
    if (parts.length > 0) bullets.push(`Quality snapshot: ${parts.join(' • ')}.`)
  }

  if (mealSignals?.high_glycemic_proxy_meals > 0) {
    bullets.push(
      `${mealSignals.high_glycemic_proxy_meals} meal(s) look high-glycemic (macro proxy). Add fiber/protein to smooth the spike.`
    )
  }

  // Pipeline risk summaries
  const highRisk = Number(interactionSummary?.risk_counts?.high) || 0
  const moderateRisk = Number(interactionSummary?.risk_counts?.moderate) || 0
  if (highRisk > 0) bullets.push(`Interactions flagged: ${highRisk} high-risk (${moderateRisk} moderate). Review details before making changes.`)
  else if (moderateRisk > 0) bullets.push(`Interactions flagged: ${moderateRisk} moderate-risk. Review details if relevant.`)

  if (Array.isArray(diseaseSummary) && diseaseSummary.length > 0) {
    const top = diseaseSummary[0]
    if (top?.safe_headline) bullets.push(`Condition-aware note: ${top.safe_headline}.`)
  }

  if (uncertaintySummary?.nutrient_accuracy_avg != null) {
    const acc = Number(uncertaintySummary.nutrient_accuracy_avg)
    if (Number.isFinite(acc) && acc < 0.55) {
      bullets.push('Insight confidence is limited (food matching uncertainty). Logging more specific foods helps.')
    }
  }

  // Keep it short and focused.
  return bullets.filter(Boolean).slice(0, 8)
}

async function computeDailyInsight({ userId, date }) {
  const { start, end } = normalizeDay(date)

  const [user, log] = await Promise.all([
    User.findById(userId),
    NutritionLog.findOne({ user: userId, date: { $gte: start, $lt: end } }),
  ])

  if (!user) throw new Error('User not found')

  const logDoc = log || null
  const meals = Array.isArray(logDoc?.meals) ? logDoc.meals : []

  const symptomWindowDays = 2
  const symptomStart = new Date(start)
  symptomStart.setDate(symptomStart.getDate() - symptomWindowDays)
  const symptomEnd = new Date(end)
  symptomEnd.setDate(symptomEnd.getDate() + symptomWindowDays)

  const labWindowDays = 14
  const labStart = new Date(start)
  labStart.setDate(labStart.getDate() - labWindowDays)
  const labEnd = new Date(end)
  labEnd.setDate(labEnd.getDate() + labWindowDays)

  const [symptoms, labs] = await Promise.all([
    SymptomLog.find({ user: userId, date: { $gte: symptomStart, $lt: symptomEnd } }).sort({ date: -1 }).limit(50),
    LabReport.find({ user: userId, date: { $gte: labStart, $lt: labEnd } }).sort({ date: -1 }).limit(20),
  ])

  const mealSignals = computeMealSignals(logDoc)

  const foodMap = new Map()
  for (const meal of meals) {
    for (const f of meal?.foods || []) {
      const key = normFoodKey(f?.name)
      if (!key) continue
      const prev = foodMap.get(key)
      foodMap.set(key, {
        name: f?.name || key,
        occurrences: (prev?.occurrences || 0) + 1,
      })
    }
  }

  const uniqueFoods = Array.from(foodMap.values())

  const foodAnalyses = []
  const errors = []

  for (const f of uniqueFoods) {
    try {
      const analysis = await analyzeFood({ input: f.name, user, includeLLM: false })
      foodAnalyses.push({
        name: f.name,
        canonicalId: analysis?.canonical_id || '',
        occurrences: f.occurrences,
        derivedMetrics: analysis?.derived_metrics || null,
        interactions: Array.isArray(analysis?.interactions) ? analysis.interactions : [],
        uncertainty: analysis?.uncertainty || null,
        scoring: analysis?.scoring || null,
        diseaseAnalysis: Array.isArray(analysis?.disease_analysis) ? analysis.disease_analysis : [],
      })
    } catch (err) {
      errors.push(`Food analysis failed for "${f.name}": ${err?.message || String(err)}`)
    }
  }

  const interactionSummary = summarizeInteractions(foodAnalyses)
  const uncertaintySummary = summarizeUncertainty(foodAnalyses)
  const diseaseSummary = summarizeDisease(foodAnalyses)

  const nutritionAggregate = {
    meal_signals: mealSignals,
    interactions: interactionSummary,
    uncertainty: uncertaintySummary,
    disease: diseaseSummary,
  }

  const bullets = buildBullets({
    user,
    log: logDoc,
    mealSignals,
    interactionSummary,
    uncertaintySummary,
    diseaseSummary,
  })

  // inputsUpdatedAt drives staleness checks.
  let inputsUpdatedAt = null
  inputsUpdatedAt = maxDate(inputsUpdatedAt, logDoc?.updatedAt)
  inputsUpdatedAt = maxDate(inputsUpdatedAt, symptoms?.[0]?.updatedAt)
  inputsUpdatedAt = maxDate(inputsUpdatedAt, labs?.[0]?.updatedAt)

  const status = logDoc || uniqueFoods.length ? 'ok' : 'no_data'

  return {
    user: userId,
    date: start,
    status,
    inputsUpdatedAt,
    computedAt: new Date(),
    version: 2,
    nutrition: {
      logId: logDoc?._id || null,
      mealsCount: meals.length,
      foodsCount: meals.reduce((s, m) => s + (Array.isArray(m?.foods) ? m.foods.length : 0), 0),
      waterIntake: Number(logDoc?.waterIntake) || 0,
      dailyTotalsLogged: logDoc?.dailyTotals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
      mealSignals,
      foods: foodAnalyses.slice(0, 25),
      aggregate: nutritionAggregate,
      bullets,
    },
    symptoms: {
      windowDays: symptomWindowDays,
      items: symptoms,
    },
    labs: {
      windowDays: labWindowDays,
      items: labs,
    },
    errors,
  }
}

async function upsertDailyInsightForDate({ userId, date, force = false }) {
  const { start, end } = normalizeDay(date)

  if (!force) {
    const existing = await DailyInsight.findOne({ user: userId, date: { $gte: start, $lt: end } })

    if (existing?.inputsUpdatedAt) {
      const { start: s, end: e } = normalizeDay(date)

      const symptomWindowDays = Number(existing?.symptoms?.windowDays) || 2
      const symptomStart = new Date(s)
      symptomStart.setDate(symptomStart.getDate() - symptomWindowDays)
      const symptomEnd = new Date(e)
      symptomEnd.setDate(symptomEnd.getDate() + symptomWindowDays)

      const labWindowDays = Number(existing?.labs?.windowDays) || 14
      const labStart = new Date(s)
      labStart.setDate(labStart.getDate() - labWindowDays)
      const labEnd = new Date(e)
      labEnd.setDate(labEnd.getDate() + labWindowDays)

      const [log, symptomNewest, labNewest] = await Promise.all([
        NutritionLog.findOne({ user: userId, date: { $gte: s, $lt: e } }).select('updatedAt'),
        SymptomLog.findOne({ user: userId, date: { $gte: symptomStart, $lt: symptomEnd } }).sort({ updatedAt: -1 }).select('updatedAt'),
        LabReport.findOne({ user: userId, date: { $gte: labStart, $lt: labEnd } }).sort({ updatedAt: -1 }).select('updatedAt'),
      ])

      let newest = null
      newest = maxDate(newest, log?.updatedAt)
      newest = maxDate(newest, symptomNewest?.updatedAt)
      newest = maxDate(newest, labNewest?.updatedAt)

      if (newest && newest <= existing.inputsUpdatedAt) {
        return existing
      }
    }
  }

  const computed = await computeDailyInsight({ userId, date: start })

  const saved = await DailyInsight.findOneAndUpdate(
    { user: userId, date: computed.date },
    { $set: computed },
    { upsert: true, new: true }
  )

  return saved
}

function stableJson(obj) {
  try {
    return JSON.stringify(obj)
  } catch {
    return ''
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s || ''), 'utf8').digest('hex')
}

function buildNarrativeContext(doc) {
  const totals = doc?.nutrition?.dailyTotalsLogged || {}
  const context = {
    date: doc?.date ? new Date(doc.date).toISOString().slice(0, 10) : null,
    totals: {
      calories: totals.calories || 0,
      protein: totals.protein || 0,
      carbs: totals.carbs || 0,
      fat: totals.fat || 0,
      fiber: totals.fiber || 0,
      sugar: totals.sugar || 0,
      sodium: totals.sodium || 0,
      water_ml: doc?.nutrition?.waterIntake || 0,
    },
    meal_signals: doc?.nutrition?.aggregate?.meal_signals || doc?.nutrition?.mealSignals || null,
    bullets: Array.isArray(doc?.nutrition?.bullets) ? doc.nutrition.bullets.slice(0, 8) : [],
    interaction_summary: doc?.nutrition?.aggregate?.interactions || null,
    disease_summary: Array.isArray(doc?.nutrition?.aggregate?.disease) ? doc.nutrition.aggregate.disease.slice(0, 3) : [],
    uncertainty_summary: doc?.nutrition?.aggregate?.uncertainty || null,
    evidence_windows: {
      symptoms_window_days: doc?.symptoms?.windowDays,
      symptoms_count: Array.isArray(doc?.symptoms?.items) ? doc.symptoms.items.length : 0,
      labs_window_days: doc?.labs?.windowDays,
      labs_count: Array.isArray(doc?.labs?.items) ? doc.labs.items.length : 0,
    },
  }

  // Provide minimal symptom/lab hints without dumping PHI.
  const topSymptom = Array.isArray(doc?.symptoms?.items)
    ? doc.symptoms.items
        .slice(0, 10)
        .map((s) => ({
          date: s?.date ? new Date(s.date).toISOString().slice(0, 10) : null,
          symptomName: s?.symptomName,
          severity: s?.severity,
        }))
        .slice(0, 5)
    : []

  const topLabs = Array.isArray(doc?.labs?.items)
    ? doc.labs.items
        .slice(0, 5)
        .map((l) => ({
          date: l?.date ? new Date(l.date).toISOString().slice(0, 10) : null,
          panelName: l?.panelName,
        }))
    : []

  return { ...context, top_symptoms: topSymptom, top_labs: topLabs }
}

async function ensureDailyInsightNarrative({ userId, date, force = false } = {}) {
  // Feature flag: keep deterministic insights fully functional even without an LLM key.
  const enabled = String(process.env.DAILY_INSIGHTS_LLM || '').trim() === '1'
  if (!enabled) return null

  const doc = await upsertDailyInsightForDate({ userId, date, force })
  if (!doc) return null
  if (doc.status === 'no_data') return doc

  const context = buildNarrativeContext(doc)
  const contextHash = sha256(stableJson(context))
  const existingHash = String(doc?.narrative?.hash || '')
  if (!force && existingHash && existingHash === contextHash) {
    return doc
  }

  const systemPrompt = [
    'You are LifeSync Daily Insight Narrator.',
    'You must only use the provided structured signals. Do not invent facts or nutrient numbers.',
    'Do not diagnose or give treatment/medication advice.',
    'Symptoms and labs are included only as time-adjacent context; do not imply causation from food to symptoms or labs.',
    'Be uncertainty-aware; hedge if confidence is limited.',
    'Output plain text, concise, 4-8 lines max.',
    'Format: 1 short summary sentence, then 2-4 bullet-like lines (use hyphens).',
  ].join(' ')

  const message = [
    'Write a brief daily nutrition insight based on the signals below.',
    'If you mention symptoms or labs, frame them as "around this time" context only (not caused by food).',
    'If data is sparse, say so and suggest what to track next (1 sentence).',
    '',
    'SIGNALS_JSON:',
    stableJson(context),
  ].join('\n')

  const reply = await generateLLMReply({
    message,
    memoryContext: '',
    systemPrompt,
    history: [],
  })

  if (!reply) return doc

  const cleaned = String(reply).trim()
  if (!cleaned) return doc

  const updated = await DailyInsight.findByIdAndUpdate(
    doc._id,
    {
      $set: {
        narrative: {
          text: cleaned,
          hash: contextHash,
          model: String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'),
          updatedAt: new Date(),
        },
      },
    },
    { new: true }
  )

  return updated || doc
}

module.exports = {
  normalizeDay,
  computeDailyInsight,
  upsertDailyInsightForDate,
  ensureDailyInsightNarrative,
}
