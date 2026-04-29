export const parseMarkersFromOcrText = (rawText) => {
  const text = String(rawText || '')
    .replace(/\r/g, '\n')
    .replace(/[\t\u00A0]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const parseNumberFromString = (s) => {
    const m = String(s || '').match(/(-?\d+(?:[\.,]\d+)?)/)
    if (!m) return null
    const n = Number(String(m[1]).replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const findNumberAfterMatch = (s, matchIndex, matchText) => {
    const start = Math.max(0, (matchIndex || 0) + String(matchText || '').length)
    const window = String(s || '').slice(start, start + 140)
    return parseNumberFromString(window)
  }

  const findNumberFor = (labelRegexes) => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const re of labelRegexes) {
        const m = re.exec(line)
        if (!m) continue
        const sameLineAfter = findNumberAfterMatch(line, m.index, m[0])
        if (sameLineAfter != null) return sameLineAfter

        const next = lines[i + 1] || ''
        const nextLineAny = parseNumberFromString(next)
        if (nextLineAny != null) return nextLineAny
      }
    }

    for (const re of labelRegexes) {
      const m = re.exec(text)
      if (!m) continue
      const after = findNumberAfterMatch(text, m.index, m[0])
      if (after != null) return after
    }

    return null
  }

  return {
    hemoglobin: findNumberFor([/hemoglobin/i]),
    ferritin: findNumberFor([/ferritin/i]),
    iron: findNumberFor([/serum\s*iron/i, /\biron/i]),
    vitaminB12: findNumberFor([/vitamin\s*b\s*12/i, /\bb\s*12/i, /cobalamin/i]),
    vitaminD: findNumberFor([
      /vitamin\s*d/i,
      /25\s*\(?oh\)?\s*d/i,
      /25\s*[-\s]*hydroxy(?:vitamin)?\s*d/i,
    ]),
    tsh: findNumberFor([/\btsh/i, /thyroid\s*stimulating\s*hormone/i]),
    crp: findNumberFor([/\bcrp/i, /c\s*-?reactive\s*protein/i]),
    fastingGlucose: findNumberFor([/fasting\s*glucose/i, /glucose\s*\(\s*fasting\s*\)/i]),
    hba1c: findNumberFor([/hba1c/i, /\ba1c/i, /glycated\s*hemoglobin/i]),
    lipids: {
      totalCholesterol: findNumberFor([/total\s*cholesterol/i]),
      ldl: findNumberFor([/\bldl/i, /low\s*density\s*lipoprotein/i]),
      hdl: findNumberFor([/\bhdl/i, /high\s*density\s*lipoprotein/i]),
      triglycerides: findNumberFor([/triglycerides?/i, /\btg/i]),
    },
  }
}

export const parseBodyCompositionFromOcrText = (rawText) => {
  const text = String(rawText || '')
    .replace(/\r/g, '\n')
    .replace(/[\t\u00A0]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const flat = text.replace(/\s+/g, ' ')

  const toNum = (s) => {
    if (s == null) return null
    const n = Number(String(s).replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const pick = (re, from = flat) => {
    const m = re.exec(from)
    return m ? toNum(m[1]) : null
  }

  const pickAfterLabel = (labelRe) => {
    const m = labelRe.exec(flat)
    if (!m) return null
    const after = flat.slice(m.index + m[0].length, m.index + m[0].length + 80)
    const n = after.match(/(-?\d+(?:[\.,]\d+)?)/)
    return n ? toNum(n[1]) : null
  }

  const heightCm =
    pick(/\bheight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*cm\b/i, flat) ||
    pick(/\bheight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i, flat)

  const weightKg =
    pick(/\bweight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i, flat) ||
    pick(/\bweight\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i, flat)

  const bmi = pick(/\bBMI\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)
  const bodyFatPercent =
    pick(/\bPBF\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*%/i) ||
    pick(/percent\s*body\s*fat\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*%?/i) ||
    pick(/body\s*fat\s*(?:%|percentage)\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

  const fatMassKg =
    pick(/\bbody\s*fat\s*mass\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/\bfat\s*mass\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)

  const smmKg =
    pick(/\bSMM\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/skeletal\s*muscle\s*mass\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)

  const proteinKg = pick(/\bprotein\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)
  const mineralKg =
    pick(/\bminerals?\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/\bbone\s*mineral\s*content\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i)

  const tbwKg =
    pick(/\bTBW\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/total\s*body\s*water\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kg|kgs|l)\b/i)

  const bmrKcal =
    pick(/\bBMR\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)\s*(?:kcal|kcals)?\b/i) ||
    pick(/basal\s*metabolic\s*rate\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

  const metabolicAge =
    pick(/metabolic\s*age\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

  const visceralFatLevel =
    pick(/visceral\s*fat\s*(?:level|rating)?\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i) ||
    pick(/\bVFL\b\s*[:\-]?\s*([0-9]+(?:[\.,][0-9]+)?)/i)

  const segmentalFromBlock = (headerRegex) => {
    const m = text.match(headerRegex)
    if (!m || m.index == null) return null
    const startIdx = m.index
    const slice = text.slice(startIdx, startIdx + 900)
    const endIdx = slice.search(/\n\s*(TBW\b|Body\s*Composition|InBody\b|Weight\b|BMR\b)\s*/i)
    const block = (endIdx > 30 ? slice.slice(0, endIdx) : slice)

    const nums = Array.from(block.matchAll(/(-?\d+(?:[\.,]\d+)?)/g))
      .map((mm) => toNum(mm[1]))
      .filter((v) => typeof v === 'number' && Number.isFinite(v))

    const pcts = Array.from(block.matchAll(/(-?\d+(?:[\.,]\d+)?)\s*%/g))
      .map((mm) => toNum(mm[1]))
      .filter((v) => typeof v === 'number' && Number.isFinite(v))

    const map5 = (vals) => {
      if (!Array.isArray(vals) || vals.length < 5) return null
      const trunk = vals.reduce((a, b) => (b > a ? b : a), vals[0])
      const rest = vals.filter((x) => x !== trunk)
      if (rest.length < 4) return null
      return {
        rightArm: rest[0],
        leftArm: rest[1],
        trunk: trunk,
        rightLeg: rest[2],
        leftLeg: rest[3],
      }
    }

    return {
      kg: map5(nums),
      pct: map5(pcts),
    }
  }

  const segFat = segmentalFromBlock(/segmental\s*fat\s*mass/i)
  const segMuscle = segmentalFromBlock(/segmental\s*muscle\s*mass/i)

  return {
    heightCm, weightKg, bmi, bodyFatPercent, fatMassKg, smmKg, proteinKg, mineralKg, tbwKg, bmrKcal, metabolicAge, visceralFatLevel,
    ...(segFat?.kg ? { segmentalFatKg: segFat.kg } : {}),
    ...(segFat?.pct ? { segmentalFatPercent: segFat.pct } : {}),
    ...(segMuscle?.kg ? { segmentalMuscleKg: segMuscle.kg } : {}),
  }
}
