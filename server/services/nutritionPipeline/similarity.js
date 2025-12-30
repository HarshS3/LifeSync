const { normalizeText } = require('./text')

function levenshtein(a, b) {
  const s = normalizeText(a)
  const t = normalizeText(b)
  const n = s.length
  const m = t.length
  if (!n) return m
  if (!m) return n

  const dp = new Array(m + 1)
  for (let j = 0; j <= m; j++) dp[j] = j

  for (let i = 1; i <= n; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j]
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost
      )
      prev = tmp
    }
  }

  return dp[m]
}

function tokenJaccard(a, b) {
  const as = new Set(normalizeText(a).split(' ').filter(Boolean))
  const bs = new Set(normalizeText(b).split(' ').filter(Boolean))
  if (as.size === 0 && bs.size === 0) return 1
  if (as.size === 0 || bs.size === 0) return 0
  let inter = 0
  for (const tok of as) if (bs.has(tok)) inter++
  const union = as.size + bs.size - inter
  return union === 0 ? 0 : inter / union
}

function stringSimilarity(a, b) {
  const s = normalizeText(a)
  const t = normalizeText(b)
  if (!s && !t) return 1
  if (!s || !t) return 0
  if (s === t) return 1

  const dist = levenshtein(s, t)
  const maxLen = Math.max(s.length, t.length)
  const levSim = maxLen ? 1 - dist / maxLen : 0
  const jac = tokenJaccard(s, t)
  return Math.max(0, Math.min(1, 0.65 * levSim + 0.35 * jac))
}

module.exports = {
  levenshtein,
  tokenJaccard,
  stringSimilarity,
}
