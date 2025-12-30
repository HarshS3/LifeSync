const {
  FoodAlias,
  FoodEntity,
} = require('../../models/nutritionKnowledge')
const { normalizeText, canonicalIdFromName } = require('./text')
const { stringSimilarity } = require('./similarity')

async function resolveCanonicalFood({ input, locale = 'en', allowProvisional = true }) {
  const normalized = normalizeText(input)
  if (!normalized) {
    return {
      input,
      normalized,
      canonical_id: null,
      confidence: 0,
      method: 'empty',
    }
  }

  const alias = await FoodAlias.findOne({ aliasNormalized: normalized, locale })
  if (alias) {
    return {
      input,
      normalized,
      canonical_id: alias.canonicalId,
      confidence: Math.max(0, Math.min(1, alias.confidence || 0.75)),
      method: 'alias_exact',
    }
  }

  // Candidate search using prefix token to keep query cheap
  const firstToken = normalized.split(' ')[0]
  const candidates = await FoodEntity.find({
    locale,
    primaryName: { $regex: `^${firstToken}`, $options: 'i' },
  }).limit(50)

  let best = null
  for (const c of candidates) {
    const score = stringSimilarity(normalized, c.primaryName)
    if (!best || score > best.score) best = { canonicalId: c.canonicalId, score, name: c.primaryName }
  }

  if (best && best.score >= 0.88) {
    return {
      input,
      normalized,
      canonical_id: best.canonicalId,
      confidence: Math.max(0, Math.min(1, best.score * 0.98)),
      method: 'entity_similarity',
      matched: best.name,
    }
  }

  if (best && best.score >= 0.75) {
    return {
      input,
      normalized,
      canonical_id: best.canonicalId,
      confidence: Math.max(0, Math.min(1, best.score * 0.9)),
      method: 'entity_similarity_low',
      matched: best.name,
    }
  }

  if (!allowProvisional) {
    return {
      input,
      normalized,
      canonical_id: null,
      confidence: best ? best.score * 0.6 : 0.4,
      method: 'no_match',
    }
  }

  const canonicalId = canonicalIdFromName(normalized)
  if (!canonicalId) {
    return {
      input,
      normalized,
      canonical_id: null,
      confidence: 0,
      method: 'no_match',
    }
  }

  await FoodEntity.updateOne(
    { canonicalId },
    {
      $setOnInsert: {
        canonicalId,
        primaryName: normalized,
        locale,
        provisional: true,
        provenance: { createdBy: 'system', createdFrom: String(input || '').slice(0, 200) },
      },
    },
    { upsert: true }
  )

  await FoodAlias.updateOne(
    { aliasNormalized: normalized, locale },
    {
      $setOnInsert: {
        alias: input,
        aliasNormalized: normalized,
        canonicalId,
        confidence: 0.55,
        source: 'system',
        locale,
      },
    },
    { upsert: true }
  )

  return {
    input,
    normalized,
    canonical_id: canonicalId,
    confidence: 0.55,
    method: 'provisional_created',
  }
}

module.exports = {
  resolveCanonicalFood,
}
