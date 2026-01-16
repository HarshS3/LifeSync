import { targetsForExercise } from './exerciseTargets'

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime())
}

function dayKeyLocal(input) {
  const d = new Date(input)
  if (!isValidDate(d)) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDayLocal(input) {
  const d = new Date(input)
  if (!isValidDate(d)) return null
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetweenLocal(a, b) {
  const da = startOfDayLocal(a)
  const db = startOfDayLocal(b)
  if (!da || !db) return null
  const diffMs = da.getTime() - db.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

function workoutVolume(workout) {
  let volume = 0
  for (const ex of workout?.exercises || []) {
    for (const set of ex?.sets || []) {
      const reps = Number(set?.reps) || 0
      const weight = Number(set?.weight) || 0
      if (reps > 0 && weight > 0) volume += reps * weight
    }
  }
  return volume
}

function inWindow(dateValue, start, end) {
  const d = new Date(dateValue)
  if (!isValidDate(d)) return false
  return d >= start && d < end
}

function toFixedMaybe(n, digits = 1) {
  const x = Number(n)
  if (!Number.isFinite(x)) return null
  return Number(x.toFixed(digits))
}

function clamp01(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function pctChange(from, to) {
  const a = Number(from)
  const b = Number(to)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null
  return (b - a) / a
}

function median(vals) {
  const arr = (Array.isArray(vals) ? vals : []).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (!arr.length) return null
  const mid = Math.floor(arr.length / 2)
  if (arr.length % 2 === 1) return arr[mid]
  return (arr[mid - 1] + arr[mid]) / 2
}

function mean(vals) {
  const arr = (Array.isArray(vals) ? vals : []).filter((n) => Number.isFinite(n))
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function stdev(vals) {
  const m = mean(vals)
  if (m == null) return null
  const arr = vals.filter((n) => Number.isFinite(n))
  if (arr.length < 2) return null
  const v = arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(v)
}

function normExerciseName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function estimate1RM(weight, reps) {
  const w = Number(weight)
  const r = Number(reps)
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null
  // Epley formula; stable enough for gentle trend detection.
  return w * (1 + r / 30)
}

function workoutSetCount(workout) {
  let sets = 0
  for (const ex of workout?.exercises || []) {
    for (const s of ex?.sets || []) {
      const reps = Number(s?.reps) || 0
      if (reps > 0) sets += 1
    }
  }
  return sets
}

function workoutVolumeOrSets(workout) {
  const vol = workoutVolume(workout)
  if (vol > 0) return { value: vol, kind: 'volume' }
  const sets = workoutSetCount(workout)
  return { value: sets, kind: 'sets' }
}

function topExercisesByAppearances(workouts, minAppearances = 3) {
  const counts = new Map()
  for (const w of workouts) {
    for (const ex of w?.exercises || []) {
      const name = normExerciseName(ex?.name)
      if (!name) continue
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }

  const arr = Array.from(counts.entries())
    .filter(([, c]) => c >= minAppearances)
    .sort((a, b) => b[1] - a[1])

  return arr.map(([name]) => name)
}

function perWorkoutExerciseBest(workoutsSortedAsc, exerciseNameNorm) {
  const series = []
  for (const w of workoutsSortedAsc) {
    const wDate = new Date(w?.date)
    if (!isValidDate(wDate)) continue

    let bestWeight = 0
    let bestEst1RM = null

    for (const ex of w?.exercises || []) {
      const n = normExerciseName(ex?.name)
      if (!n || n !== exerciseNameNorm) continue

      for (const set of ex?.sets || []) {
        const weight = Number(set?.weight) || 0
        const reps = Number(set?.reps) || 0
        if (weight > bestWeight) bestWeight = weight
        const e1 = estimate1RM(weight, reps)
        if (e1 != null && (bestEst1RM == null || e1 > bestEst1RM)) bestEst1RM = e1
      }
    }

    if (bestWeight > 0 || bestEst1RM != null) {
      series.push({ date: wDate, bestWeight, bestEst1RM })
    }
  }
  return series
}

function buildMuscleTargetBreakdown(workouts, windowStart, now) {
  const buckets = new Map() // target -> score
  let total = 0

  for (const w of workouts) {
    if (!inWindow(w?.date, windowStart, now)) continue
    for (const ex of w?.exercises || []) {
      const targets = targetsForExercise(ex?.name)
      const primary = targets?.primary || []
      const secondary = targets?.secondary || []

      const sets = Array.isArray(ex?.sets) ? ex.sets : []

      for (const set of sets) {
        const reps = Number(set?.reps) || 0
        if (reps <= 0) continue
        const weight = Number(set?.weight) || 0
        const score = weight > 0 ? weight * reps : 1 // fall back to set-count weighting

        for (const t of primary) {
          buckets.set(t, (buckets.get(t) || 0) + score)
          total += score
        }
        for (const t of secondary) {
          buckets.set(t, (buckets.get(t) || 0) + score * 0.35)
          total += score * 0.35
        }
      }
    }
  }

  const arr = Array.from(buckets.entries())
    .map(([k, v]) => ({ key: k, value: v, share: total > 0 ? v / total : 0 }))
    .sort((a, b) => b.value - a.value)

  return { total, items: arr }
}

function computeStreak(workoutsSortedDesc) {
  const uniqueDays = []
  const seen = new Set()
  for (const w of workoutsSortedDesc) {
    const key = dayKeyLocal(w?.date)
    if (!key || seen.has(key)) continue
    seen.add(key)
    uniqueDays.push(w.date)
  }

  if (uniqueDays.length === 0) return 0

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const diff = daysBetweenLocal(uniqueDays[i - 1], uniqueDays[i])
    if (diff === 1) streak += 1
    else break
  }
  return streak
}

function bestPRs(workoutsSortedAsc, splitDate) {
  const before = new Map() // exerciseName -> bestWeight
  const after = new Map()

  for (const w of workoutsSortedAsc) {
    const wDate = new Date(w?.date)
    if (!isValidDate(wDate)) continue

    for (const ex of w?.exercises || []) {
      const name = String(ex?.name || '').trim()
      if (!name) continue

      let bestWeightThisWorkout = 0
      for (const set of ex?.sets || []) {
        const weight = Number(set?.weight) || 0
        if (weight > bestWeightThisWorkout) bestWeightThisWorkout = weight
      }

      if (!bestWeightThisWorkout) continue

      const target = wDate >= splitDate ? after : before
      const prev = target.get(name) || 0
      if (bestWeightThisWorkout > prev) target.set(name, bestWeightThisWorkout)
    }
  }

  const prs = []
  for (const [name, bestAfter] of after.entries()) {
    const bestBefore = before.get(name) || 0
    const delta = bestAfter - bestBefore
    if (bestBefore > 0 && delta >= 2.5) {
      prs.push({ name, bestAfter, delta })
    }
  }

  prs.sort((a, b) => b.delta - a.delta)
  return prs.slice(0, 2)
}

// Returns a small list of calm, deterministic training insights.
// No advice, no diagnosis, no pressure.
export function computeTrainingInsights(workouts, nowInput = new Date()) {
  const now = new Date(nowInput)
  if (!isValidDate(now)) return []

  const all = Array.isArray(workouts) ? workouts : []
  const cleaned = all.filter((w) => isValidDate(new Date(w?.date)))
  if (cleaned.length < 2) return []

  const sortedDesc = [...cleaned].sort((a, b) => new Date(b.date) - new Date(a.date))
  const sortedAsc = [...cleaned].sort((a, b) => new Date(a.date) - new Date(b.date))

  const start7 = new Date(now)
  start7.setDate(start7.getDate() - 7)
  const start14 = new Date(now)
  start14.setDate(start14.getDate() - 14)
  const start28 = new Date(now)
  start28.setDate(start28.getDate() - 28)

  const last7 = cleaned.filter((w) => inWindow(w.date, start7, now))
  const prev7 = cleaned.filter((w) => inWindow(w.date, start14, start7))

  const last14 = cleaned.filter((w) => inWindow(w.date, start14, now))
  const prev14 = cleaned.filter((w) => inWindow(w.date, start28, start14))

  const last7Count = last7.length
  const prev7Count = prev7.length

  const insights = []

  const pushInsight = (x) => {
    if (!x) return
    const confidence = clamp01(x.confidence)
    const impact = Number.isFinite(Number(x.impact)) ? Number(x.impact) : 0
    insights.push({ ...x, confidence, impact })
  }

  // Frequency trend
  if (last7Count > 0 || prev7Count > 0) {
    const delta = last7Count - prev7Count
    const label = delta > 0 ? 'up' : delta < 0 ? 'down' : 'steady'
    const detail = delta === 0
      ? `You logged ${last7Count} session(s) in the last 7 days — steady versus the week before.`
      : `You logged ${last7Count} session(s) in the last 7 days — ${label} by ${Math.abs(delta)} versus the week before.`

    pushInsight({
      kind: 'training',
      title: 'Consistency',
      detail,
      confidence: last7Count >= 2 ? 0.7 : 0.45,
      impact: Math.min(1, Math.abs(delta) / 4),
    })
  }

  // Training frequency balance (spacing / clustering)
  if (last14.length >= 4) {
    const days = Array.from(
      new Set(
        last14
          .map((w) => dayKeyLocal(w?.date))
          .filter(Boolean)
      )
    )
      .map((k) => new Date(`${k}T00:00:00`))
      .sort((a, b) => a - b)

    const gaps = []
    for (let i = 1; i < days.length; i += 1) {
      const diff = daysBetweenLocal(days[i], days[i - 1])
      if (diff != null) gaps.push(diff)
    }

    const medGap = median(gaps)
    const sdGap = stdev(gaps)
    const cv = medGap && sdGap != null ? sdGap / Math.max(1, medGap) : null

    if (cv != null && medGap != null) {
      const clustered = cv >= 0.9
      const label = clustered ? 'clustered' : 'fairly even'
      const longestGap = gaps.length ? Math.max(...gaps) : null
      const detailParts = [`Your training days are ${label} across the last 2 weeks.`]
      if (longestGap != null && longestGap >= 4) detailParts.push(`Longest gap was ${longestGap} days.`)

      pushInsight({
        kind: 'training',
        title: 'Frequency Balance',
        detail: detailParts.join(' '),
        confidence: 0.65,
        impact: Math.min(1, (cv - 0.4) / 1.2),
      })
    }
  }

  // Streak (consecutive days)
  const streak = computeStreak(sortedDesc)
  if (streak >= 2) {
    pushInsight({
      kind: 'training',
      title: 'Streak',
      detail: `You’ve trained ${streak} day(s) in a row.`,
      confidence: streak >= 3 ? 0.75 : 0.55,
      impact: Math.min(1, streak / 5),
    })
  }

  // Volume trend (simple load proxy)
  const last7Vol = last7.reduce((sum, w) => sum + workoutVolume(w), 0)
  const prev7Vol = prev7.reduce((sum, w) => sum + workoutVolume(w), 0)
  if (last7Vol > 0 || prev7Vol > 0) {
    const delta = last7Vol - prev7Vol
    const label = delta > 0 ? 'higher' : delta < 0 ? 'lower' : 'about the same'
    const magnitude = toFixedMaybe(Math.abs(delta) / 1000, 1)
    const base = `Training load (volume proxy) is ${label} than the week before.`
    const suffix = magnitude != null && magnitude > 0 ? ` (~${magnitude}k kg·reps difference).` : ''

    pushInsight({
      kind: 'training',
      title: 'Training Load',
      detail: `${base}${suffix}`,
      confidence: (last7Vol > 0 && prev7Vol > 0) ? 0.65 : 0.4,
      impact: Math.min(1, (magnitude || 0) / 8),
    })
  }

  // Volume trend (14-day rolling vs prior 14 days) — more stable signal
  {
    const last14V = last14.reduce((sum, w) => sum + workoutVolume(w), 0)
    const prev14V = prev14.reduce((sum, w) => sum + workoutVolume(w), 0)
    if ((last14V > 0 || prev14V > 0) && last14.length >= 4) {
      const delta = last14V - prev14V
      const label = delta > 0 ? 'higher' : delta < 0 ? 'lower' : 'flat'
      const mag = toFixedMaybe(Math.abs(delta) / 1000, 1)
      const suffix = mag != null && mag > 0 ? ` (~${mag}k kg·reps difference).` : ''

      pushInsight({
        kind: 'training',
        title: 'Volume Trend (14d)',
        detail: `Your last 14 days are ${label} than the previous 14 days.${suffix}`,
        confidence: (last14V > 0 && prev14V > 0) ? 0.7 : 0.55,
        impact: Math.min(1, (mag || 0) / 12),
      })
    }
  }

  // PRs in last 14 days compared to earlier 14 days
  const prs = bestPRs(sortedAsc.filter((w) => inWindow(w.date, start28, now)), start14)
  if (prs.length > 0) {
    const parts = prs.map((p) => `${p.name}: +${toFixedMaybe(p.delta, 1)}kg`)
    pushInsight({
      kind: 'training',
      title: 'Personal Bests',
      detail: `New best weight in the last 2 weeks: ${parts.join(' • ')}.`,
      confidence: 0.65,
      impact: Math.min(1, prs.reduce((m, p) => Math.max(m, p.delta), 0) / 10),
    })
  }

  // Progression signal (gentle): top repeated exercise trend
  {
    const top = topExercisesByAppearances(sortedAsc.filter((w) => inWindow(w.date, start28, now)), 3)
    const exercise = top[0]
    if (exercise) {
      const series = perWorkoutExerciseBest(sortedAsc, exercise)
      if (series.length >= 4) {
        const lastN = series.slice(-2)
        const prevN = series.slice(-4, -2)

        const lastAvg = mean(lastN.map((s) => s.bestEst1RM ?? null).filter((n) => n != null))
        const prevAvg = mean(prevN.map((s) => s.bestEst1RM ?? null).filter((n) => n != null))

        const p = pctChange(prevAvg, lastAvg)
        if (p != null) {
          const pct = Math.round(Math.abs(p) * 100)
          const direction = p > 0.02 ? 'up' : p < -0.02 ? 'down' : 'flat'
          if (direction !== 'flat') {
            pushInsight({
              kind: 'training',
              title: 'Progression Signal',
              detail: `${exercise.replace(/\b\w/g, (c) => c.toUpperCase())} estimated strength looks ${direction} (~${pct}%) across your recent sessions.`,
              confidence: 0.65,
              impact: Math.min(1, pct / 12),
            })
          } else {
            pushInsight({
              kind: 'training',
              title: 'Progression Signal',
              detail: `${exercise.replace(/\b\w/g, (c) => c.toUpperCase())} looks roughly stable across your recent sessions.`,
              confidence: 0.55,
              impact: 0.2,
            })
          }
        }
      }
    }
  }

  // Plateau detection (data-gated)
  {
    const top = topExercisesByAppearances(sortedAsc.filter((w) => inWindow(w.date, start28, now)), 4)
    const exercise = top[0]
    if (exercise) {
      const series = perWorkoutExerciseBest(sortedAsc, exercise)
      if (series.length >= 5) {
        const recent = series.slice(-4)
        const vals = recent.map((s) => s.bestEst1RM ?? null).filter((n) => n != null)
        if (vals.length >= 3) {
          const start = vals[0]
          const end = vals[vals.length - 1]
          const p = pctChange(start, end)
          const sd = stdev(vals)
          const m = mean(vals)

          const flat = p != null && Math.abs(p) < 0.01
          const lowVar = sd != null && m != null ? (sd / Math.max(1, m)) < 0.02 : false

          if (flat && lowVar) {
            pushInsight({
              kind: 'training',
              title: 'Plateau Watch',
              detail: `${exercise.replace(/\b\w/g, (c) => c.toUpperCase())} has been pretty flat across your last ${vals.length} logged sessions.`,
              confidence: 0.6,
              impact: 0.45,
            })
          }
        }
      }
    }
  }

  // Muscle targeted breakdown (last 14 days) + imbalance flag
  {
    const breakdown = buildMuscleTargetBreakdown(cleaned, start14, now)
    const items = breakdown.items
    if (breakdown.total > 0 && items.length >= 2) {
      const top3 = items.slice(0, 3)
      const fmt = (x) => `${x.key.replace(/_/g, ' ')} ${(x.share * 100).toFixed(0)}%`
      const detail = `Top muscle targets (last 14d): ${top3.map(fmt).join(' • ')}.`

      const topShare = top3[0]?.share || 0
      const imbalance = topShare >= 0.5
      pushInsight({
        kind: 'training',
        title: 'Muscle Targets',
        detail: imbalance ? `${detail} Your focus is heavily skewed toward ${top3[0].key.replace(/_/g, ' ')}.` : detail,
        confidence: 0.7,
        impact: imbalance ? 0.7 : 0.35,
      })
    }
  }

  // Keep it quiet: rank all computed metrics, then show a small subset.
  // Implemented metrics may be more than what we display.
  const ranked = insights
    .filter((x) => (Number(x.confidence) || 0) >= 0.5)
    .sort((a, b) => {
      const aScore = (a.confidence * 2) + (a.impact * 1.2)
      const bScore = (b.confidence * 2) + (b.impact * 1.2)
      return bScore - aScore
    })

  // Prefer showing muscle targets when available (it anchors the rest).
  const muscle = ranked.find((x) => x.title === 'Muscle Targets')
  const rest = ranked.filter((x) => x !== muscle)
  const out = []
  if (muscle) out.push(muscle)
  for (const x of rest) {
    if (out.length >= 4) break
    out.push(x)
  }
  return out
}
