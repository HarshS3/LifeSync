function normalizeText(input) {
  if (!input) return ''
  const s = String(input)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}

function slugify(input) {
  const n = normalizeText(input)
  if (!n) return ''
  return n.replace(/\s+/g, '_').replace(/_+/g, '_')
}

function canonicalIdFromName(input) {
  const slug = slugify(input)
  if (!slug) return null
  return `food_${slug}`
}

module.exports = {
  normalizeText,
  slugify,
  canonicalIdFromName,
}
