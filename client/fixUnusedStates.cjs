const fs = require('fs');
let c = fs.readFileSync('src/components/NutritionTracker.jsx', 'utf8');

const unusedStates = [
  'isMobile',
  'nutritionStats',
  'nutritionStatsLoading',
  'rangeDaysLogged',
  'periodSummaryLoading',
  'weeklyTotals',
  'monthlyTotals',
  'clinicalTargetsRequiresSetup',
  'clinicalTargetsMissingFields',
  'clinicalTargetsDebug',
  'templateDialogOpen',
  'resolvedFood',
  'resolvedFoodLoading',
  'foodGraph',
  'foodGraphLoading',
  'foodCausal',
  'foodCausalLoading',
  'hypotheses',
  'hypothesesCount',
  'hypothesesLoading',
  'barcodeLookupError',
  'barcodeProduct'
];

unusedStates.forEach(v => {
  const re = new RegExp(\\s*const \\\[, set[a-zA-Z0-9_]+\\\] = useState\\([\\s\\S]*?\\)(?:;)?\\r?\\n, 'g');
  c = c.replace(re, '\n');
});

fs.writeFileSync('src/components/NutritionTracker.jsx', c);
