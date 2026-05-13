export const generateCGMData = (meals) => {
  const points = [];
  const baseline = 90;

  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const min = (i % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    points.push({ time: timeStr, minuteOfDay: i * 30, glucose: baseline });
  }

  if (!meals || meals.length === 0) return points;

  const mealsSorted = [...meals]
    .map(meal => {
      const parts = (meal.time || '').split(':').map(Number);
      const mealMinute = (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
        ? parts[0] * 60 + parts[1]
        : null;
      return { meal, mealMinute };
    })
    .filter(m => m.mealMinute !== null)
    .sort((a, b) => a.mealMinute - b.mealMinute);

  let cumulativeFiberEaten = 0;

  mealsSorted.forEach(({ meal, mealMinute }) => {
    let totalCarbs = 0, totalFiber = 0, totalProtein = 0, totalFat = 0;

    meal.foods?.forEach(f => {
      totalCarbs   += f.carbs   || 0;
      totalFiber   += f.fiber   || 0;
      totalProtein += f.protein || 0;
      totalFat     += f.fat     || 0;
    });

    if (totalCarbs === 0) {
      cumulativeFiberEaten += totalFiber;
      return;
    }

    const fiberCarryoverBonus = Math.min(cumulativeFiberEaten * 0.015, 0.40);
    const adjustedGP = (totalCarbs / (totalFiber + totalProtein + 1)) * (1 - fiberCarryoverBonus);

    const baseAmp    = Math.min(totalCarbs, 80);
    const multiplier = Math.min(adjustedGP / 5, 2.5);
    const peakAmp    = baseAmp * multiplier;

    const buffer = totalFiber + (totalFat * 0.5) + (totalProtein * 0.2);
    const timeConstant = 45 + Math.min(buffer * 3, 90);

    points.forEach(pt => {
      if (pt.minuteOfDay < mealMinute) return;
      const t = pt.minuteOfDay - mealMinute;
      const response = Math.max(0, (t / timeConstant) * Math.exp(1 - (t / timeConstant)));
      pt.glucose += peakAmp * response;
    });

    cumulativeFiberEaten += totalFiber;
  });

  points.forEach(pt => {
    pt.glucose = Math.max(75, Math.round(pt.glucose));
  });

  return points;
};

export const fmt = (value, decimals = 1) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export const percent = (value, target) => {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.round((Number(value) / target) * 100))
}
