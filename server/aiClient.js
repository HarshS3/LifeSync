const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function callChatApi({
  apiKey,
  baseUrl,
  model,
  system,
  user,
  messages,
  providerLabel,
}) {
  try {
    const payloadMessages = Array.isArray(messages) && messages.length
      ? messages
      : [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: payloadMessages,
        temperature: 0.5,
        max_tokens: 350,
      }),
    })

    if (!res.ok) {
      console.error(`${providerLabel} API error`, await res.text())
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error(`Failed to call ${providerLabel}`, err)
    return null
  }
}

async function generateLLMReply({ message, memoryContext, systemPrompt, history }) {
  const defaultSystem = [
    'You are LifeSync, a personal wellness companion.',
    'You have access to the user\'s fitness, nutrition, sleep, mental health, medications, and habit data.',
    'IMPORTANT: Only mention data that is DIRECTLY relevant to the user\'s question.',
    'Do NOT list all their stats or data in every response - be concise and natural.',
    'If they ask about sleep, focus on sleep. If they ask about habits, focus on habits.',
    'Be conversational and human, not a data dump.',
    'Avoid medical diagnosis. You may describe symptom patterns and risk levels, but do not label diseases.',
    'You may do: pattern analysis, risk stratification, red-flag detection, and question generation for doctor visits.',
    'You must NOT do: prescriptions, medication dosing, starting/stopping meds, deterministic medical claims.',
    'Use uncertainty-aware language (e.g., "may", "could", "can be worth checking").',
    'If red flags are present, advise urgent professional evaluation (without prescribing a treatment).',
    'Keep responses brief unless they ask for detail.',
  ].join(' ')

  const system = (systemPrompt && String(systemPrompt).trim()) ? String(systemPrompt).trim() : defaultSystem

  const safeHistory = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-12)
    : []

  const messages = [
    { role: 'system', content: system },
    // Keep memory context separate so it doesn't look like user prose.
    { role: 'system', content: `Relevant user context (use only if helpful): ${memoryContext}` },
    ...safeHistory,
    { role: 'user', content: message },
  ]

  const user = `Question: ${message}\n\nRecent context: ${memoryContext}`

  // Prefer Groq if configured, otherwise fall back to OpenAI
  if (GROQ_API_KEY) {
    const reply = await callChatApi({
      apiKey: GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: GROQ_MODEL,
      system,
      user,
      messages,
      providerLabel: 'Groq',
    })
    if (reply) return reply
  }

  if (OPENAI_API_KEY) {
    const reply = await callChatApi({
      apiKey: OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      system,
      user,
      messages,
      providerLabel: 'OpenAI',
    })
    if (reply) return reply
  }

  return null
}

async function generateNutritionSemanticJson({
  canonicalId,
  input,
  nutrientGraph,
  derivedMetrics,
  interactions,
  uncertainty,
  userProfile,
}) {
  // If no provider key is configured, skip semantic layer.
  if (!GROQ_API_KEY && !OPENAI_API_KEY) return null

  const system = [
    'You are LifeSync Nutrition Semantic Layer.',
    'You must only synthesize explanations from the provided structured data.',
    'Do NOT introduce new factual nutrient numbers, interactions, or medical claims.',
    'Do NOT provide medical diagnosis or treatment advice.',
    'You must hedge language according to uncertainty.',
    'Return STRICT JSON only (no markdown).',
    'Schema:',
    '{"narrative": string, "tradeoffs": string[], "who_should_be_cautious": string[], "notes": string[]}',
  ].join(' ')

  const toPlain = (maybeMap) => {
    if (!maybeMap) return null
    if (typeof maybeMap?.entries === 'function') return Object.fromEntries(maybeMap.entries())
    return maybeMap
  }

  const payload = {
    canonicalId,
    input,
    serving: nutrientGraph?.serving,
    nutrients: toPlain(nutrientGraph?.nutrients),
    derived_metrics: derivedMetrics,
    interactions,
    uncertainty,
    user_profile: userProfile,
  }

  const user = `Generate a short, uncertainty-aware explanation for this food analysis.\n\nDATA_JSON: ${JSON.stringify(
    payload
  )}`

  const parseJson = (s) => {
    if (!s) return null
    try {
      return JSON.parse(s)
    } catch {
      const start = s.indexOf('{')
      const end = s.lastIndexOf('}')
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(s.slice(start, end + 1))
        } catch {
          return null
        }
      }
      return null
    }
  }

  // Prefer Groq if configured, otherwise fall back to OpenAI.
  if (GROQ_API_KEY) {
    const reply = await callChatApi({
      apiKey: GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: GROQ_MODEL,
      system,
      user,
      providerLabel: 'Groq',
    })
    const parsed = parseJson(reply)
    if (parsed) return parsed
  }

  if (OPENAI_API_KEY) {
    const reply = await callChatApi({
      apiKey: OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      system,
      user,
      providerLabel: 'OpenAI',
    })
    const parsed = parseJson(reply)
    if (parsed) return parsed
  }

  return null
}

async function generateNutritionHypothesisJson({
  canonicalId,
  input,
  derivedMetrics,
  interactions,
  uncertainty,
  userProfile,
}) {
  if (!GROQ_API_KEY && !OPENAI_API_KEY) return null

  const system = [
    'You are LifeSync Hypothesis Generator.',
    'You propose testable, user-specific hypotheses based ONLY on the provided structured signals.',
    'Do NOT provide medical advice, diagnosis, or certainty.',
    'Do NOT add factual nutrient numbers not present in the input.',
    'Return STRICT JSON only (no markdown).',
    'Schema:',
    '{"hypothesis": string, "supporting_factors": string[], "confidence": number, "recommended_validation": string}',
  ].join(' ')

  const payload = {
    canonicalId,
    input,
    derived_metrics: derivedMetrics,
    interactions,
    uncertainty,
    user_profile: userProfile,
  }

  const user = `Propose ONE hypothesis for how this food might affect this user.\n\nDATA_JSON: ${JSON.stringify(
    payload
  )}`

  const parseJson = (s) => {
    if (!s) return null
    try {
      return JSON.parse(s)
    } catch {
      const start = s.indexOf('{')
      const end = s.lastIndexOf('}')
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(s.slice(start, end + 1))
        } catch {
          return null
        }
      }
      return null
    }
  }

  if (GROQ_API_KEY) {
    const reply = await callChatApi({
      apiKey: GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: GROQ_MODEL,
      system,
      user,
      providerLabel: 'Groq',
    })
    const parsed = parseJson(reply)
    if (parsed) return parsed
  }

  if (OPENAI_API_KEY) {
    const reply = await callChatApi({
      apiKey: OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      system,
      user,
      providerLabel: 'OpenAI',
    })
    const parsed = parseJson(reply)
    if (parsed) return parsed
  }

  return null
}

module.exports = { generateLLMReply, generateNutritionSemanticJson, generateNutritionHypothesisJson }
