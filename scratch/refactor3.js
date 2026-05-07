const fs = require('fs');

const code = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');

let newCode = code.replace(/import \w+ from '\.\/nutrition\/MealsList'\\n/g, '');
newCode = newCode.replace(/import \w+ from '\.\/nutrition\/ClinicalTargets'\\n/g, '');
newCode = newCode.replace(/import \w+ from '\.\/nutrition\/MealBuilder'\\n/g, '');

const imports = [
  "import DailyLogTab from './nutrition/DailyLogTab'",
  "import LogMealTab from './nutrition/LogMealTab'",
  "import DetailsTab from './nutrition/DetailsTab'",
  "import SummaryTab from './nutrition/SummaryTab'",
  "import ScanProductTab from './nutrition/ScanProductTab'",
  ""
].join('\n');

newCode = newCode.replace("import SupplementSection from './Nutrition/SupplementSection'", imports + "import SupplementSection from './Nutrition/SupplementSection'");

const lines = newCode.split('\n');

const tab0Props = [
  'log', 'totals', 'fmt', 'formatTime', 'editMealFromDay', 'removeMealFromDay',
  'percent', 'calorieTarget', 'proteinTarget', 'clinicalTargets', 'timingAlerts',
  'generateCGMData', 'insightMatchesSelectedDay', 'nutritionInsight',
  'generateNutritionInsight', 'nutritionInsightGenerating', 'mealSuggestions',
  'generateMealSuggestions', 'mealSuggestionsGenerating', 'handleWaterChange',
  'setActiveTab', 'SupplementSection', 'autoSaveLog', 'InsulinIntelligencePanel'
].map(p => '  ' + p + '={' + p + '}').join('\n');

const tab1Props = [
  'newMeal', 'setNewMeal', 'foodSearchQuery', 'setFoodSearchQuery',
  'foodResults', 'foodSearchError', 'searchFood', 'foodSearchLoading', 'foodSearchAttempted',
  'handleSearchResultSelect', 'selectedFoodForAnalysis', 'setSelectedFoodForAnalysis',
  'analyzeSelectedFood', 'foodAnalysisLoading', 'foodAnalysis', 'foodAnalysisError',
  'savedTemplates', 'savedTemplatesLoading', 'useTemplate', 'deleteTemplate',
  'frequentMeals', 'frequentMealsLoading', 'MEAL_TYPES', 'addFoodToNewMeal',
  'removeFoodFromMeal', 'handleFoodQtyChange', 'saveMealToDay', 'mealSaving',
  'clearNewMeal', 'searchDBForFood', 'CustomFoodForm', 'MealBuilder', 'log'
].map(p => '  ' + p + '={' + p + '}').join('\n');

const tab3Props = [
  'log', 'totals', 'fmt', 'percent', 'calorieTarget', 'proteinTarget',
  'clinicalTargets', 'MACRO_FIELD_META', 'MINERAL_FIELD_META', 'VITAMIN_FIELD_META', 'renderNutrientInputs'
].map(p => '  ' + p + '={' + p + '}').join('\n');

const tab4Props = [
  'log', 'totals', 'fmt', 'percent', 'calorieTarget', 'proteinTarget', 'clinicalTargets'
].map(p => '  ' + p + '={' + p + '}').join('\n');

const tab5Props = [
  'barcodeInput', 'setBarcodeInput', 'lookupBarcode', 'barcodeLookupLoading',
  'startBarcodeScanner', 'supportsBarcodeDetector', 'scannerOpen', 'scanBusy',
  'videoRef', 'stopBarcodeScanner', 'barcodeResult', 'barcodeError', 'addScannedProductToMeal'
].map(p => '  ' + p + '={' + p + '}').join('\n');

function findBlock(startStr, endStrFunc) {
  const startIdx = lines.findIndex(l => l.includes(startStr));
  let endIdx = startIdx + 1;
  while (endIdx < lines.length && !endStrFunc(lines[endIdx], lines[endIdx+1], lines[endIdx+2])) {
    endIdx++;
  }
  return { startIdx, endIdx };
}

// Tab 0
let { startIdx: s0, endIdx: e0 } = findBlock('{activeTab === 0 && (', (l, l1, l2) => l.includes('      )}') && l1 === '' && l2 && l2.includes('{activeTab === 1 && ('));
// Tab 1
let { startIdx: s1, endIdx: e1 } = findBlock('{activeTab === 1 && (', (l, l1, l2) => l.includes('      )}') && l1 === '' && l2 && l2.includes('{activeTab === 3 && ('));
// Tab 3
let { startIdx: s3, endIdx: e3 } = findBlock('{activeTab === 3 && (', (l, l1, l2) => l.includes('      )}') && l1 === '' && l2 && l2.includes('{activeTab === 4 && ('));
// Tab 4
let { startIdx: s4, endIdx: e4 } = findBlock('{activeTab === 4 && (', (l, l1, l2) => l.includes('      )}') && l1 === '' && l2 && l2.includes('{activeTab === 5 && ('));
// Tab 5
let { startIdx: s5, endIdx: e5 } = findBlock('{activeTab === 5 && (', (l, l1, l2) => l.includes('      )}') && l1 === '' && l2 && l2.includes('{activeTab === 2 && ('));

console.log('0:', s0, '-', e0);
console.log('1:', s1, '-', e1);
console.log('3:', s3, '-', e3);
console.log('4:', s4, '-', e4);
console.log('5:', s5, '-', e5);

const finalLines = [];
let i = 0;
while (i < lines.length) {
  if (i === s0) {
    finalLines.push('      {activeTab === 0 && (');
    finalLines.push('        <DailyLogTab\\n' + tab0Props + '\\n        />');
    finalLines.push('      )}');
    i = e0;
  } else if (i === s1) {
    finalLines.push('      {activeTab === 1 && (');
    finalLines.push('        <LogMealTab\\n' + tab1Props + '\\n        />');
    finalLines.push('      )}');
    i = e1;
  } else if (i === s3) {
    finalLines.push('      {activeTab === 3 && (');
    finalLines.push('        <DetailsTab\\n' + tab3Props + '\\n        />');
    finalLines.push('      )}');
    i = e3;
  } else if (i === s4) {
    finalLines.push('      {activeTab === 4 && (');
    finalLines.push('        <SummaryTab\\n' + tab4Props + '\\n        />');
    finalLines.push('      )}');
    i = e4;
  } else if (i === s5) {
    finalLines.push('      {activeTab === 5 && (');
    finalLines.push('        <ScanProductTab\\n' + tab5Props + '\\n        />');
    finalLines.push('      )}');
    i = e5;
  } else {
    finalLines.push(lines[i]);
  }
  i++;
}

fs.writeFileSync('client/src/components/NutritionTracker.jsx', finalLines.join('\n').replace(/\\n/g, '\n'));
console.log('Script complete.');
