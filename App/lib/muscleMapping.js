/**
 * Utility to map high-level muscle groups (from server) to 
 * specific heatmap slugs (from MuscleHeatmap component).
 */

export const mapMuscleToHeatmapSlugs = (muscleName) => {
  const slugMap = {
    'chest':      ['chest'],
    'back':       ['upper-back', 'lower-back', 'trapezius'],
    'shoulders':  ['front-deltoids', 'back-deltoids', 'deltoids'],
    'biceps':     ['biceps'],
    'triceps':    ['triceps'],
    'legs':       ['quadriceps', 'hamstring', 'gluteal', 'calves'],
    'quads':      ['quadriceps'],
    'hamstrings': ['hamstring'],
    'abs':        ['abs', 'obliques'],
    'core':       ['abs', 'obliques'],
    'glutes':     ['gluteal'],
    'calves':     ['calves'],
    'forearms':   ['forearms'],
    'traps':      ['trapezius'],
    'lats':       ['upper-back'],
    'adductors':  ['adductors'],
  };

  return slugMap[muscleName.toLowerCase()] || [muscleName.toLowerCase()];
};

export const getHeatmapDataForExercise = (metadata) => {
  if (!metadata) return [];
  
  const entries = [];
  const primarySlugs = mapMuscleToHeatmapSlugs(metadata.primary);
  
  primarySlugs.forEach(slug => {
    entries.push({ slug, intensity: 4 }); // Max intensity for primary
  });
  
  if (metadata.secondary && metadata.secondary.length > 0) {
    metadata.secondary.forEach(muscle => {
      const secondarySlugs = mapMuscleToHeatmapSlugs(muscle);
      secondarySlugs.forEach(slug => {
        // Only add if not already added as primary
        if (!entries.some(e => e.slug === slug)) {
          entries.push({ slug, intensity: 2 }); // Moderate intensity for secondary
        }
      });
    });
  }
  
  return entries;
};
