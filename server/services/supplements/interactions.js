function n(s) {
  return String(s || '').toLowerCase()
}

function listFromUser(user, field) {
  const v = user?.[field]
  if (!Array.isArray(v)) return []
  return v.map((x) => n(x)).filter(Boolean)
}

function medsFromUser(user) {
  const meds = user?.medications
  if (!Array.isArray(meds)) return []
  return meds.map((m) => n(m?.name)).filter(Boolean)
}

function hasAny(haystack, needles) {
  const set = new Set(haystack)
  return needles.some((x) => set.has(n(x)))
}

function buildInteractionFlags({ user, supplementName }) {
  const name = n(supplementName)
  const meds = medsFromUser(user)
  const conditions = listFromUser(user, 'conditions')
  const allergies = listFromUser(user, 'allergies')

  const flags = []

  // Always caution if the user's allergies include the supplement (rough check).
  if (hasAny(allergies, [name])) {
    flags.push({ level: 'avoid', reason: `Allergy list includes "${supplementName}"` })
  }

  // Conservative interaction buckets. Keep these generic and non-prescriptive.
  const onAnticoagulant = meds.some((m) =>
    ['warfarin', 'coumadin', 'apixaban', 'eliquis', 'rivaroxaban', 'xarelto', 'dabigatran', 'pradaxa', 'heparin'].some((x) => m.includes(x))
  )
  const onAntiplatelet = meds.some((m) => ['clopidogrel', 'plavix', 'aspirin'].some((x) => m.includes(x)))
  const onSSRIorSNRI = meds.some((m) => ['sertraline', 'zoloft', 'fluoxetine', 'prozac', 'escitalopram', 'lexapro', 'citalopram', 'celexa', 'paroxetine', 'paxil', 'venlafaxine', 'duloxetine'].some((x) => m.includes(x)))
  const onThyroidMed = meds.some((m) => ['levothyroxine', 'synthroid', 'liothyronine'].some((x) => m.includes(x)))
  const hasKidneyDisease = conditions.some((c) => c.includes('kidney') || c.includes('renal'))
  const hasLiverDisease = conditions.some((c) => c.includes('liver') || c.includes('hepatic'))
  const pregnant = conditions.some((c) => c.includes('pregnan'))

  if (name.includes('omega') || name.includes('fish oil')) {
    if (onAnticoagulant || onAntiplatelet) {
      flags.push({ level: 'caution', reason: 'May increase bleeding risk when combined with blood thinners/antiplatelets; discuss clinician guidance.' })
    }
  }

  if (name.includes('st john')) {
    if (onSSRIorSNRI) {
      flags.push({ level: 'avoid', reason: 'Potential interaction with SSRIs/SNRIs; avoid unless clinician explicitly approves.' })
    } else {
      flags.push({ level: 'caution', reason: 'Has many drug interactions; avoid unless a clinician reviews your full medication list.' })
    }
  }

  if (name.includes('magnesium')) {
    if (hasKidneyDisease) {
      flags.push({ level: 'avoid', reason: 'Kidney disease can increase magnesium accumulation risk; clinician guidance needed.' })
    }
  }

  if (name.includes('iron')) {
    // Iron is high-risk to recommend without lab confirmation.
    flags.push({ level: 'caution', reason: 'Do not start iron without confirming deficiency on labs; too much can be harmful.' })
  }

  if (name.includes('vitamin a')) {
    if (pregnant) {
      flags.push({ level: 'avoid', reason: 'Vitamin A excess can be harmful during pregnancy; clinician guidance needed.' })
    }
  }

  if (name.includes('vitamin d')) {
    if (hasKidneyDisease) {
      flags.push({ level: 'caution', reason: 'Vitamin D metabolism can be altered in kidney disease; clinician guidance recommended.' })
    }
  }

  if (name.includes('calcium')) {
    if (onThyroidMed) {
      flags.push({ level: 'caution', reason: 'Can interfere with thyroid medication absorption; clinician/pharmacist can advise timing.' })
    }
  }

  if (hasLiverDisease) {
    flags.push({ level: 'caution', reason: 'Liver disease can change supplement safety; use clinician guidance.' })
  }

  return flags
}

module.exports = { buildInteractionFlags }
