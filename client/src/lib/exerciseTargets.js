function normExerciseName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

// Exercise -> muscle-part targets. Pragmatic mapping for analytics/visualization.
// Extend this map as the library grows.
export const EXERCISE_TARGET_MAP = {
  // Chest
  'bench press': { primary: ['chest.mid'], secondary: ['triceps', 'shoulders.front_delt'] },
  'close-grip bench press': { primary: ['triceps.lateral_head'], secondary: ['chest.mid'] },
  'incline bench press': { primary: ['chest.upper'], secondary: ['triceps', 'shoulders.front_delt'] },
  'decline bench press': { primary: ['chest.lower'], secondary: ['triceps', 'shoulders.front_delt'] },
  'dumbbell flyes': { primary: ['chest.mid'], secondary: ['shoulders.front_delt'] },
  'dumbbell flies': { primary: ['chest.mid'], secondary: ['shoulders.front_delt'] },
  'cable crossover': { primary: ['chest.mid'], secondary: ['shoulders.front_delt'] },
  'push-ups': { primary: ['chest.mid'], secondary: ['triceps', 'shoulders.front_delt'] },
  'pushups': { primary: ['chest.mid'], secondary: ['triceps', 'shoulders.front_delt'] },
  'chest dips': { primary: ['chest.lower'], secondary: ['triceps', 'shoulders.front_delt'] },
  'pec deck machine': { primary: ['chest.mid'], secondary: [] },

  // Back
  'deadlift': { primary: ['back.mid_back', 'legs.glutes', 'legs.hamstrings'], secondary: ['back.traps'] },
  'romanian deadlift': { primary: ['legs.hamstrings', 'legs.glutes'], secondary: ['back.mid_back'] },
  'pull-ups': { primary: ['back.lats'], secondary: ['biceps'] },
  'pullups': { primary: ['back.lats'], secondary: ['biceps'] },
  'lat pulldown': { primary: ['back.lats'], secondary: ['biceps'] },
  'lat pull-down': { primary: ['back.lats'], secondary: ['biceps'] },
  'barbell rows': { primary: ['back.mid_back'], secondary: ['biceps', 'back.lats'] },
  'barbell row': { primary: ['back.mid_back'], secondary: ['biceps', 'back.lats'] },
  'dumbbell rows': { primary: ['back.mid_back'], secondary: ['biceps', 'back.lats'] },
  'dumbbell row': { primary: ['back.mid_back'], secondary: ['biceps', 'back.lats'] },
  'cable rows': { primary: ['back.mid_back'], secondary: ['biceps'] },
  'seated cable row': { primary: ['back.mid_back'], secondary: ['biceps'] },
  't-bar rows': { primary: ['back.mid_back'], secondary: ['biceps'] },
  't bar rows': { primary: ['back.mid_back'], secondary: ['biceps'] },
  't-bar row': { primary: ['back.mid_back'], secondary: ['biceps'] },
  'face pulls': { primary: ['shoulders.rear_delt', 'back.traps'], secondary: [] },
  'shrugs': { primary: ['back.traps'], secondary: [] },

  // Shoulders
  'overhead press': { primary: ['shoulders.front_delt'], secondary: ['triceps', 'shoulders.lateral_delt'] },
  'lateral raises': { primary: ['shoulders.lateral_delt'], secondary: [] },
  'front raises': { primary: ['shoulders.front_delt'], secondary: [] },
  'rear delt flyes': { primary: ['shoulders.rear_delt'], secondary: [] },
  'arnold press': { primary: ['shoulders.front_delt'], secondary: ['shoulders.lateral_delt', 'triceps'] },
  'upright rows': { primary: ['shoulders.lateral_delt'], secondary: ['back.traps', 'biceps'] },

  // Arms
  'bicep curls': { primary: ['biceps.long_head', 'biceps.short_head'], secondary: [] },
  'biceps curls': { primary: ['biceps.long_head', 'biceps.short_head'], secondary: [] },
  'barbell curls': { primary: ['biceps.long_head', 'biceps.short_head'], secondary: [] },
  'dumbbell curls': { primary: ['biceps.long_head', 'biceps.short_head'], secondary: [] },
  'hammer curls': { primary: ['biceps.long_head'], secondary: ['forearms'] },
  'preacher curls': { primary: ['biceps.short_head'], secondary: [] },
  'concentration curls': { primary: ['biceps.short_head'], secondary: [] },
  'cable curls': { primary: ['biceps.long_head', 'biceps.short_head'], secondary: [] },
  'incline curls': { primary: ['biceps.long_head'], secondary: [] },

  'tricep pushdowns': { primary: ['triceps.lateral_head'], secondary: [] },
  'triceps pushdowns': { primary: ['triceps.lateral_head'], secondary: [] },
  'tricep pushdown': { primary: ['triceps.lateral_head'], secondary: [] },
  'triceps pushdown': { primary: ['triceps.lateral_head'], secondary: [] },
  'skull crushers': { primary: ['triceps.long_head'], secondary: [] },
  'overhead extensions': { primary: ['triceps.long_head'], secondary: [] },
  'dips': { primary: ['triceps.long_head'], secondary: ['chest.lower'] },
  'close grip bench': { primary: ['triceps.lateral_head'], secondary: ['chest.mid'] },
  'kickbacks': { primary: ['triceps.lateral_head'], secondary: [] },
  'diamond push-ups': { primary: ['triceps.lateral_head'], secondary: ['chest.mid'] },

  // Legs
  'squat': { primary: ['legs.quads', 'legs.glutes'], secondary: ['legs.hamstrings'] },
  'squats': { primary: ['legs.quads', 'legs.glutes'], secondary: ['legs.hamstrings'] },
  'leg press': { primary: ['legs.quads', 'legs.glutes'], secondary: [] },
  'lunges': { primary: ['legs.glutes', 'legs.quads'], secondary: [] },
  'bulgarian split squats': { primary: ['legs.quads', 'legs.glutes'], secondary: ['legs.hamstrings'] },
  'hip thrusts': { primary: ['legs.glutes'], secondary: ['legs.hamstrings'] },
  'leg extensions': { primary: ['legs.quads'], secondary: [] },
  'leg curls': { primary: ['legs.hamstrings'], secondary: [] },
  'calf raises': { primary: ['legs.calves'], secondary: [] },
}

export function targetsForExercise(exerciseName) {
  const key = normExerciseName(exerciseName)
  return EXERCISE_TARGET_MAP[key] || null
}

export function normalizeTargetKey(targetKey) {
  return String(targetKey || '').trim().toLowerCase().replace(/\s+/g, '_')
}

export function rollupTargetToRegion(targetKey) {
  const k = normalizeTargetKey(targetKey)

  if (k.startsWith('chest.')) return 'chest'
  if (k.startsWith('shoulders.')) return 'shoulders'

  if (k === 'biceps' || k.startsWith('biceps.')) return 'biceps'
  if (k === 'triceps' || k.startsWith('triceps.')) return 'triceps'
  if (k === 'forearms') return 'forearms'

  if (k.startsWith('back.')) return 'back'

  if (k === 'legs.quads') return 'quads'
  if (k === 'legs.hamstrings') return 'hamstrings'
  if (k === 'legs.glutes') return 'glutes'
  if (k === 'legs.calves') return 'calves'

  // Optional core grouping if you add mapping later
  if (k.startsWith('core.') || k === 'abs') return 'core'

  return null
}

export const MUSCLE_REGIONS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
]
