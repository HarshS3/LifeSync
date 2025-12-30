const DEFAULT_AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

function buildRagContext({ citations, confidence }) {
  if (!Array.isArray(citations) || citations.length === 0) return ''

  const lines = []
  lines.push(`Textbook RAG (confidence ${(confidence * 100).toFixed(0)}%):`)

  for (const c of citations.slice(0, 5)) {
    const loc = `${c.source || 'unknown'}${c.page ? ` p.${c.page}` : ''}`
    const excerpt = String(c.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 500)
    lines.push(`- [${loc}] ${excerpt}`)
  }

  lines.push(
    'Instruction: In medical mode, only use the above textbook excerpts for factual claims. ' +
      'If they do not contain the answer, say you do not know from the textbook context.'
  )

  return lines.join('\n')
}

async function fetchTextbookRag({ question, userProfile, allowedScope }) {
  const url = `${DEFAULT_AI_SERVICE_URL.replace(/\/$/, '')}/rag/answer`

  const controller = new AbortController()
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 2500)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        top_k: 5,
        user_profile: userProfile || null,
        allowed_scope: allowedScope || null,
      }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`RAG service error ${resp.status}: ${text.slice(0, 200)}`)
    }

    const data = await resp.json()
    const citations = Array.isArray(data?.citations) ? data.citations : []
    const confidence = typeof data?.confidence === 'number' ? data.confidence : 0

    return {
      ok: true,
      confidence,
      citations,
      ragContext: buildRagContext({ citations, confidence }),
      raw: data,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

module.exports = { fetchTextbookRag }
