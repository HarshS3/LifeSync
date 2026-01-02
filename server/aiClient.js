const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

const LLM_MAX_OUTPUT_TOKENS = (() => {
  const raw = Number.parseInt(String(process.env.LLM_MAX_OUTPUT_TOKENS || '700').trim(), 10)
  if (!Number.isFinite(raw)) return 700
  return Math.max(128, Math.min(2048, raw))
})()

const LLM_PROVIDER = String(process.env.LLM_PROVIDER || 'auto').trim().toLowerCase()

function providerOrder() {
  // Allowed: auto|groq|gemini|openai|none
  if (LLM_PROVIDER === 'none') return []
  if (LLM_PROVIDER === 'groq') return ['groq']
  if (LLM_PROVIDER === 'gemini') return ['gemini']
  if (LLM_PROVIDER === 'openai') return ['openai']
  return ['groq', 'gemini', 'openai']
}

function hasKey(provider) {
  if (provider === 'groq') return Boolean(GROQ_API_KEY)
  if (provider === 'openai') return Boolean(OPENAI_API_KEY)
  if (provider === 'gemini') return Boolean(GEMINI_API_KEY)
  return false
}

async function callOpenAICompatibleChat({
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
        max_tokens: LLM_MAX_OUTPUT_TOKENS,
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

async function callGeminiGenerateContent({ apiKey, model, system, user, messages }) {
  try {
    const payloadMessages = Array.isArray(messages) && messages.length
      ? messages
      : [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]

    // Gemini uses roles: user | model. Use system_instruction for system prompt.
    const systemText = String(system || '').trim()
    const contents = payloadMessages
      .filter((m) => m && typeof m.content === 'string')
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(systemText ? { system_instruction: { parts: [{ text: systemText }] } } : {}),
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: LLM_MAX_OUTPUT_TOKENS,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Gemini API error', errText)

      // User-friendly rate limit handling.
      {
        const lowered = String(errText || '').toLowerCase()
        const isRateLimit = res.status === 429 || lowered.includes('resource_exhausted') || lowered.includes('quota')
        if (isRateLimit) {
          let retrySeconds = null
          const m = lowered.match(/retry in\s+([0-9]+\.?[0-9]*)s/)
          if (m && m[1]) {
            const n = Number.parseFloat(m[1])
            if (Number.isFinite(n)) retrySeconds = n
          }

          if (retrySeconds != null) {
            return `I\'m temporarily rate-limited. Please try again in about ${Math.ceil(
              retrySeconds
            )} seconds.`
          }
          return "I'm temporarily rate-limited. Please try again in about a minute."
        }
      }

      // Dev-friendly message when the key is present but invalid.
      if (String(process.env.NODE_ENV || '').trim() !== 'production') {
        const lowered = String(errText || '').toLowerCase()
        if (lowered.includes('api key not valid') || lowered.includes('api_key_invalid')) {
          return 'AI provider configuration error: GEMINI_API_KEY is invalid. Update server/.env with a valid key and restart the server.'
        }
      }

      return null
    }

    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts) || !parts.length) return null
    return parts.map((p) => p?.text).filter(Boolean).join('').trim() || null
  } catch (err) {
    console.error('Failed to call Gemini', err)
    return null
  }
}

async function callProvider({ provider, system, user, messages, modelOverride }) {
  if (provider === 'groq' && GROQ_API_KEY) {
    return callOpenAICompatibleChat({
      apiKey: GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: modelOverride || GROQ_MODEL,
      system,
      user,
      messages,
      providerLabel: 'Groq',
    })
  }

  if (provider === 'openai' && OPENAI_API_KEY) {
    return callOpenAICompatibleChat({
      apiKey: OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: modelOverride || 'gpt-4o-mini',
      system,
      user,
      messages,
      providerLabel: 'OpenAI',
    })
  }

  if (provider === 'gemini' && GEMINI_API_KEY) {
    return callGeminiGenerateContent({
      apiKey: GEMINI_API_KEY,
      model: modelOverride || GEMINI_MODEL,
      system,
      user,
      messages,
    })
  }

  return null
}

async function generateLLMReply({ message, memoryContext, systemPrompt, history, providerOverride, modelOverride }) {
  const defaultSystem = [
    'You are LifeSync, a personal wellness companion.',
    'You have access to the user\'s fitness, nutrition, sleep, mental health, medications, and habit data.',
    'IMPORTANT: Only mention data that is DIRECTLY relevant to the user\'s question.',
    'Do NOT list all their stats or data in every response. Stay focused, natural, and avoid data-dumps.',
    'If they ask about sleep, focus on sleep. If they ask about habits, focus on habits.',
    'Be conversational and human, not a data dump.',
    'Avoid medical diagnosis. You may describe symptom patterns and risk levels, but do not label diseases.',
    'You may do: pattern analysis, risk stratification, red-flag detection, and question generation for doctor visits.',
    'You must NOT do: prescriptions, medication dosing, starting/stopping meds, deterministic medical claims.',
    'Use uncertainty-aware language (e.g., "may", "could", "can be worth checking").',
    'If red flags are present, advise urgent professional evaluation (without prescribing a treatment).',
    'Default to 1–2 short paragraphs. Be concise, but not overly short unless the user asks for brevity.',
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

  const order = (() => {
    const po = providerOverride ? String(providerOverride).trim().toLowerCase() : ''
    if (!po) return providerOrder()
    return [po]
  })()

  for (const p of order) {
    if (!hasKey(p)) continue
    const reply = await callProvider({ provider: p, system, user, messages, modelOverride })
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
  if (!GROQ_API_KEY && !OPENAI_API_KEY && !GEMINI_API_KEY) return null

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

  for (const p of providerOrder()) {
    if (!hasKey(p)) continue
    const reply = await callProvider({ provider: p, system, user })
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
  if (!GROQ_API_KEY && !OPENAI_API_KEY && !GEMINI_API_KEY) return null

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

  for (const p of providerOrder()) {
    if (!hasKey(p)) continue
    const reply = await callProvider({ provider: p, system, user })
    const parsed = parseJson(reply)
    if (parsed) return parsed
  }

  return null
}

module.exports = { generateLLMReply, generateNutritionSemanticJson, generateNutritionHypothesisJson }
