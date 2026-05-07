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

function findBlock(startTab) {
  const startStr = \`{activeTab === \${startTab} && (\`;
  const startIdx = lines.findIndex(l => l.includes(startStr));
  if (startIdx === -1) return { startIdx: -1, endIdx: -1 };
  
  let endIdx = -1;
  // look for `      )}` followed by empty line
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].includes('      )}') && lines[i+1] === '') {
      // confirm it is the real end by checking if a new tab starts nearby
      let nextTabFound = false;
      for (let j = i+2; j < i+5 && j < lines.length; j++) {
        if (lines[j].includes('{activeTab === ') || lines[j].includes('</Box>')) {
          nextTabFound = true;
          break;
        }
      }
      if (nextTabFound) {
        endIdx = i;
        break;
      }
    }
  }
  return { startIdx, endIdx };
}

let t0 = findBlock(0);
let t1 = findBlock(1);
let t3 = findBlock(3);
let t4 = findBlock(4);
let t5 = findBlock(5);

console.log('0:', t0);
console.log('1:', t1);
console.log('3:', t3);
console.log('4:', t4);
console.log('5:', t5);

const finalLines = [];
let i = 0;
while (i < lines.length) {
  if (i === t0.startIdx) {
    finalLines.push('      {activeTab === 0 && (');
    finalLines.push('        <DailyLogTab\\n' + tab0Props + '\\n        />');
    finalLines.push('      )}');
    i = t0.endIdx;
  } else if (i === t1.startIdx) {
    finalLines.push('      {activeTab === 1 && (');
    finalLines.push('        <LogMealTab\\n' + tab1Props + '\\n        />');
    finalLines.push('      )}');
    i = t1.endIdx;
  } else if (i === t3.startIdx) {
    finalLines.push('      {activeTab === 3 && (');
    finalLines.push('        <DetailsTab\\n' + tab3Props + '\\n        />');
    finalLines.push('      )}');
    i = t3.endIdx;
  } else if (i === t4.startIdx) {
    finalLines.push('      {activeTab === 4 && (');
    finalLines.push('        <SummaryTab\\n' + tab4Props + '\\n        />');
    finalLines.push('      )}');
    i = t4.endIdx;
  } else if (i === t5.startIdx) {
    finalLines.push('      {activeTab === 5 && (');
    finalLines.push('        <ScanProductTab\\n' + tab5Props + '\\n        />');
    finalLines.push('      )}');
    i = t5.endIdx;
  } else {
    finalLines.push(lines[i]);
  }
  i++;
}

fs.writeFileSync('client/src/components/NutritionTracker.jsx', finalLines.join('\n').replace(/\\n/g, '\n'));
console.log('Script complete.');