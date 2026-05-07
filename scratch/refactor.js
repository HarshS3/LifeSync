const fs = require('fs');

let code = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');

const importsToAdd = "import DailyLogTab from './nutrition/DailyLogTab'\nimport LogMealTab from './nutrition/LogMealTab'\nimport DetailsTab from './nutrition/DetailsTab'\nimport SummaryTab from './nutrition/SummaryTab'\nimport ScanProductTab from './nutrition/ScanProductTab'\n";

if (!code.includes('DailyLogTab')) {
  code = code.replace("import MealsList", importsToAdd + "import MealsList");
}

fs.writeFileSync('client/src/components/NutritionTracker.jsx', code);
console.log('Script ran successfully');
