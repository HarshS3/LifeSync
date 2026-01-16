import { MUSCLE_REGIONS, rollupTargetToRegion, targetsForExercise } from './exerciseTargets'

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

function clamp01(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function inWindow(dateValue, start, end) {
  const d = new Date(dateValue)
  if (!isValidDate(d)) return false
  return d >= start && d < end
}

function emptyTotals() {
  const totals = {}
  for (const r of MUSCLE_REGIONS) totals[r] = 0
  return totals
}

// Computes a 30-day "where you trained" intensity map.
// This is deterministic and uses workout set volume as a proxy.
export function computeMuscleHeatmap(workouts, options = {}) {
  const days = Number(options.days) || 30
  const now = new Date(options.now || new Date())
  if (!isValidDate(now)) return null

  const start = new Date(now)
  start.setDate(start.getDate() - Math.max(1, days))

  const all = Array.isArray(workouts) ? workouts : []
  const totals = emptyTotals()

  let workoutCount = 0
  let scoredSets = 0
  let ignoredSets = 0

  for (const w of all) {
    if (!inWindow(w?.date, start, now)) continue
    workoutCount += 1

    for (const ex of w?.exercises || []) {
      const targets = targetsForExercise(ex?.name)
      const primary = targets?.primary || []
      const secondary = targets?.secondary || []

      const sets = Array.isArray(ex?.sets) ? ex.sets : []
      for (const set of sets) {
        const reps = Number(set?.reps) || 0
        if (reps <= 0) continue

        const weight = Number(set?.weight) || 0
        const score = weight > 0 ? weight * reps : 1

        let contributed = false

        for (const t of primary) {
          const region = rollupTargetToRegion(t)
          if (!region) continue
          totals[region] = (totals[region] || 0) + score
          contributed = true
        }
        for (const t of secondary) {
          const region = rollupTargetToRegion(t)
          if (!region) continue
          totals[region] = (totals[region] || 0) + score * 0.35
          contributed = true
        }

        if (contributed) scoredSets += 1
        else ignoredSets += 1
      }
    }
  }

  const values = Object.values(totals)
  const max = values.length ? Math.max(...values) : 0
  const sum = values.reduce((a, b) => a + b, 0)

  const normalized = {}
  for (const r of MUSCLE_REGIONS) {
    normalized[r] = max > 0 ? clamp01(totals[r] / max) : 0
  }

  return {
    days,
    start: start.toISOString(),
    end: now.toISOString(),
    workoutCount,
    scoredSets,
    ignoredSets,
    totals,
    normalized,
    max,
    sum,
  }
}
