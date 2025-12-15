const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

async function callChatApi({
  apiKey,
  baseUrl,
  model,
  system,
  user,
  providerLabel,
}) {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
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

async function generateLLMReply({ message, memoryContext }) {
  const system = [
    'You are LifeSync, a personal wellness companion.',
    'You have access to the user\'s fitness, nutrition, sleep, mental health, medications, and habit data.',
    'IMPORTANT: Only mention data that is DIRECTLY relevant to the user\'s question.',
    'Do NOT list all their stats or data in every response - be concise and natural.',
    'If they ask about sleep, focus on sleep. If they ask about habits, focus on habits.',
    'Be conversational and human, not a data dump.',
    'Avoid medical diagnosis. Frame advice as gentle suggestions.',
    'Keep responses brief unless they ask for detail.',
  ].join(' ')

  const user = `Question: ${message}\n\nRecent context: ${memoryContext}`

  // Prefer Groq if configured, otherwise fall back to OpenAI
  if (GROQ_API_KEY) {
    const reply = await callChatApi({
      apiKey: GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: GROQ_MODEL,
      system,
      user,
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
      providerLabel: 'OpenAI',
    })
    if (reply) return reply
  }

  return null
}

module.exports = { generateLLMReply }
