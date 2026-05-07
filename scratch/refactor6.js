const fs = require('fs');

const code = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');

let newCode = code.replace(/import \w+ from '\.\/nutrition\/MealsList'\\n/g, '');
newCode = newCode.replace(/import \w+ from '\.\/nutrition\/ClinicalTargets'\\n/g, '');
newCode = newCode.replace(/import \w+ from '\.\/nutrition\/MealBuilder'\\n/g, '');

const imports = "import DailyLogTab from './nutrition/DailyLogTab'\nimport LogMealTab from './nutrition/LogMealTab'\nimport DetailsTab from './nutrition/DetailsTab'\nimport SummaryTab from './nutrition/SummaryTab'\nimport ScanProductTab from './nutrition/ScanProductTab'\n";

newCode = newCode.replace("import SupplementSection from './Nutrition/SupplementSection'", imports + "import SupplementSection from './Nutrition/SupplementSection'");

const lines = newCode.split('\n');

const tab0Props = [
  'log', 'totals', 'fmt', 'formatTime', 'editMealFromDay', 'removeMealFromDay',
  'percent', 'calorieTarget', 'proteinTarget', 'clinicalTargets', 'timingAlerts',
  'generateCGMData', 'insightMatchesSelectedDay', 'nutritionInsight',
  'generateNutritionInsight', 'nutritionInsightGenerating', 'mealSuggestions',
  'generateMealSuggestions', 'mealSuggestionsGenerating', 'handleWaterChange',
  'setActiveTab', 'SupplementSection', 'autoSaveLog', 'InsulinIntelligencePanel'
].map(p => '          ' + p + '={' + p + '}').join('\n');

const tab1Props = [
  'newMeal', 'setNewMeal', 'foodSearchQuery', 'setFoodSearchQuery',
  'foodResults', 'foodSearchError', 'searchFood', 'foodSearchLoading', 'foodSearchAttempted',
  'handleSearchResultSelect', 'selectedFoodForAnalysis', 'setSelectedFoodForAnalysis',
  'analyzeSelectedFood', 'foodAnalysisLoading', 'foodAnalysis', 'foodAnalysisError',
  'savedTemplates', 'savedTemplatesLoading', 'useTemplate', 'deleteTemplate',
  'frequentMeals', 'frequentMealsLoading', 'MEAL_TYPES', 'addFoodToNewMeal',
  'removeFoodFromMeal', 'handleFoodQtyChange', 'saveMealToDay', 'mealSaving',
  'clearNewMeal', 'searchDBForFood', 'CustomFoodForm', 'MealBuilder', 'log'
].map(p => '          ' + p + '={' + p + '}').join('\n');

const tab3Props = [
  'log', 'totals', 'fmt', 'percent', 'calorieTarget', 'proteinTarget',
  'clinicalTargets', 'MACRO_FIELD_META', 'MINERAL_FIELD_META', 'VITAMIN_FIELD_META', 'renderNutrientInputs'
].map(p => '          ' + p + '={' + p + '}').join('\n');

const tab4Props = [
  'log', 'totals', 'fmt', 'percent', 'calorieTarget', 'proteinTarget', 'clinicalTargets'
].map(p => '          ' + p + '={' + p + '}').join('\n');

const tab5Props = [
  'barcodeInput', 'setBarcodeInput', 'lookupBarcode', 'barcodeLookupLoading',
  'startBarcodeScanner', 'supportsBarcodeDetector', 'scannerOpen', 'scanBusy',
  'videoRef', 'stopBarcodeScanner', 'barcodeResult', 'barcodeError', 'addScannedProductToMeal'
].map(p => '          ' + p + '={' + p + '}').join('\n');

let finalLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes('{activeTab === 0 && (')) {
    finalLines.push('      {activeTab === 0 && (');
    finalLines.push('        <DailyLogTab\n' + tab0Props + '\n        />');
    finalLines.push('      )}');
    // skip until next tab 1
    while(i < lines.length && !lines[i].includes('{activeTab === 1 && (')) {
      i++;
    }
    // we skipped too far? if we stop AT {activeTab === 1 && (, the loop will catch it on next iter since we don't inc i here?
    // wait, we need to leave the blank lines / comments before tab 1.
    continue; // let the loop handle the next check
  }

  if (lines[i].includes('{activeTab === 1 && (')) {
    finalLines.push('      {/* ─── TAB 1: LOG MEAL ─── */}');
    finalLines.push('      {activeTab === 1 && (');
    finalLines.push('        <LogMealTab\n' + tab1Props + '\n        />');
    finalLines.push('      )}');
    while(i < lines.length && !lines[i].includes('{activeTab === 3 && (')) {
      i++;
    }
    continue;
  }

  if (lines[i].includes('{activeTab === 3 && (')) {
    finalLines.push('      {/* ─── TAB 3: DETAILS ─── */}');
    finalLines.push('      {activeTab === 3 && (');
    finalLines.push('        <DetailsTab\n' + tab3Props + '\n        />');
    finalLines.push('      )}');
    while(i < lines.length && !lines[i].includes('{activeTab === 4 && (')) {
      i++;
    }
    continue;
  }

  if (lines[i].includes('{activeTab === 4 && (')) {
    finalLines.push('      {/* ─── TAB 4: SUMMARY ─── */}');
    finalLines.push('      {activeTab === 4 && (');
    finalLines.push('        <SummaryTab\n' + tab4Props + '\n        />');
    finalLines.push('      )}');
    while(i < lines.length && !lines[i].includes('{activeTab === 5 && (')) {
      i++;
    }
    continue;
  }

  if (lines[i].includes('{activeTab === 5 && (')) {
    finalLines.push('      {/* ─── TAB 5: SCAN PRODUCT ─── */}');
    finalLines.push('      {activeTab === 5 && (');
    finalLines.push('        <ScanProductTab\n' + tab5Props + '\n          scanVideoRef={scanVideoRef}\n        />');
    finalLines.push('      )}');
    while(i < lines.length && !lines[i].includes('{activeTab === 2 && (')) {
      i++;
    }
    continue; // next iteration handles activeTab === 2
  }

  // Not matching any skip, just push
  finalLines.push(lines[i]);
  i++;
}

fs.writeFileSync('client/src/components/NutritionTracker.jsx', finalLines.join('\n'));
console.log('Successfully completed script!');
