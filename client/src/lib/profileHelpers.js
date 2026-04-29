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

  // Strip arrow/dagger noise symbols that ACCUNIQ / InBody print after values
  const flat = text
    .replace(/[↑↓†‡⇑⇓▲▼]/g, '')
    .replace(/\s+/g, ' ')

  const toNum = (s) => {
    if (s == null) return null
    const n = Number(String(s).replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  // pick: regex must have capture group 1 = the number
  const pick = (re) => {
    const m = re.exec(flat)
    return m ? toNum(m[1]) : null
  }

  // pickAfter: find label, grab FIRST number that follows within 100 chars
  const pickAfter = (labelRe) => {
    const m = labelRe.exec(flat)
    if (!m) return null
    const after = flat.slice(m.index + m[0].length, m.index + m[0].length + 100)
    const n = after.match(/(-?\d+(?:[.,]\d+)?)/)
    return n ? toNum(n[1]) : null
  }

  const heightCm =
    pick(/\bheight\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*cm\b/i) ||
    pickAfter(/\bheight\b/i)

  const weightKg =
    pick(/\bweight\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pickAfter(/\bweight\b/i)

  const bmi =
    pick(/\bBMI\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pick(/body\s*mass\s*index\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pickAfter(/\bBMI\b/i)

  const bodyFatPercent =
    pick(/\bPBF\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pick(/percentage\s*of\s*body\s*fat\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pick(/body\s*fat\s*(?:%|percentage)\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pick(/percent\s*body\s*fat\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pickAfter(/percentage\s*of\s*body\s*fat\b/i)

  const fatMassKg =
    pick(/\bbody\s*fat\s*mass\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/\bfat\s*mass\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pickAfter(/\bfat\s*mass\b/i)

  const smmKg =
    pick(/\bSMM\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/skeletal\s*muscle\s*mass\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pickAfter(/\bSMM\b/i) ||
    pickAfter(/skeletal\s*muscle\s*mass\b/i)

  // NOTE: ACCUNIQ uses "Proteins" (plural)
  const proteinKg =
    pick(/\bproteins?\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pickAfter(/\bproteins?\b/i)

  const mineralKg =
    pick(/\bminerals?\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pick(/bone\s*mineral\s*content\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs)\b/i) ||
    pickAfter(/\bminerals?\b/i)

  // TBW can be in litres (L) on ACCUNIQ
  const tbwKg =
    pick(/\bTBW\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs|l)\b/i) ||
    pick(/total\s*body\s*water\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kgs|l)\b/i) ||
    pickAfter(/\bTBW\b/i) ||
    pickAfter(/total\s*body\s*water\b/i)

  const bmrKcal =
    pick(/\bBMR\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pick(/basal\s*metabolic\s*rate\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pickAfter(/\bBMR\b/i) ||
    pickAfter(/basal\s*metabolic\s*rate\b/i)

  const metabolicAge =
    pick(/(?:metabolic|biological)\s*age\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pickAfter(/(?:metabolic|biological)\s*age\b/i)

  const visceralFatLevel =
    pick(/visceral\s*fat\s*(?:level|rating)?\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pick(/\bVFL\b(?:\s*\(.*?\))?\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?)/i) ||
    pickAfter(/visceral\s*fat\s*level\b/i)

  // --- Segmental block parser ---
  // Use the original text (not flat) so line structure is preserved
  const segmentalFromBlock = (headerRegex) => {
    const m = text.match(headerRegex)
    if (!m || m.index == null) return null
    const startIdx = m.index
    const slice = text.slice(startIdx, startIdx + 900)
    // Stop before the next major section (TBW is AFTER segmental on ACCUNIQ, don't use it as stop)
    const endIdx = slice.search(/\n\s*(?:Proteins?\b|Minerals?\b|Body\s*Type\b|Biological\s*Age\b|Basal\s*Metabolic\b|Segmental\s*Fat\b|Segmental\s*Muscle\b)/i)
    const block = (endIdx > 30 ? slice.slice(0, endIdx) : slice)
      .replace(/[↑↓†‡⇑⇓▲▼]/g, '') // strip noise arrows

    const nums = Array.from(block.matchAll(/(-?\d+(?:[.,]\d+)?)/g))
      .map((mm) => toNum(mm[1]))
      .filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 200)

    const map5 = (vals) => {
      if (!Array.isArray(vals) || vals.length < 5) return null
      const trunk = vals.reduce((a, b) => (b > a ? b : a), vals[0])
      const rest = vals.filter((x) => x !== trunk)
      if (rest.length < 4) return null
      return {
        leftArm: rest[0],
        rightArm: rest[1],
        trunk,
        leftLeg: rest[2],
        rightLeg: rest[3],
      }
    }

    return { kg: map5(nums) }
  }

  const segFat    = segmentalFromBlock(/segmental\s*fat\s*mass/i)
  const segMuscle = segmentalFromBlock(/segmental\s*muscle\s*mass/i)

  return {
    heightCm, weightKg, bmi, bodyFatPercent, fatMassKg, smmKg,
    proteinKg, mineralKg, tbwKg, bmrKcal, metabolicAge, visceralFatLevel,
    ...(segFat?.kg    ? { segmentalFatKg:    segFat.kg    } : {}),
    ...(segMuscle?.kg ? { segmentalMuscleKg: segMuscle.kg } : {}),
  }
}
