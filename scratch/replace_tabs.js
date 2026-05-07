const fs = require('fs');
let code = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');
const lines = code.split('\n');

const tab0Props = [
  'log', 'totals', 'fmt', 'formatTime', 'editMealFromDay', 'removeMealFromDay',
  'percent', 'calorieTarget', 'proteinTarget', 'clinicalTargets', 'timingAlerts',
  'generateCGMData', 'insightMatchesSelectedDay', 'nutritionInsight',
  'generateNutritionInsight', 'nutritionInsightGenerating', 'mealSuggestions',
  'generateMealSuggestions', 'mealSuggestionsGenerating', 'handleWaterChange',
  'setActiveTab', 'SupplementSection', 'autoSaveLog', 'InsulinIntelligencePanel'
].map(p => \  \={\}\).join('\n');

const tab1Props = [
  'newMeal', 'setNewMeal', 'foodSearchQuery', 'setFoodSearchQuery',
  'foodResults', 'foodSearchError', 'searchFood', 'foodSearchLoading', 'foodSearchAttempted',
  'handleSearchResultSelect', 'selectedFoodForAnalysis', 'setSelectedFoodForAnalysis',
  'analyzeSelectedFood', 'foodAnalysisLoading', 'foodAnalysis', 'foodAnalysisError',
  'savedTemplates', 'savedTemplatesLoading', 'useTemplate', 'deleteTemplate',
  'frequentMeals', 'frequentMealsLoading', 'MEAL_TYPES', 'addFoodToNewMeal',
  'removeFoodFromMeal', 'handleFoodQtyChange', 'saveMealToDay', 'mealSaving',
  'clearNewMeal', 'searchDBForFood', 'CustomFoodForm', 'MealBuilder', 'log'
].map(p => \  \={\}\).join('\n');

const newLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes('{activeTab === 0 && (')) {
    newLines.push('      {activeTab === 0 && (');
    newLines.push('        <DailyLogTab');
    newLines.push(tab0Props);
    newLines.push('        />');
    newLines.push('      )}');
    while (!lines[i].includes('      )}') || !lines[i+2]?.includes('{activeTab === 1')) i++;
  } else if (lines[i].includes('{activeTab === 1 && (')) {
    newLines.push('      {activeTab === 1 && (');
    newLines.push('        <LogMealTab');
    newLines.push(tab1Props);
    newLines.push('        />');
    newLines.push('      )}');
    while (!lines[i].includes('      )}') || !lines[i+2]?.includes('{activeTab === 3')) i++;
  } else {
    newLines.push(lines[i]);
  }
  i++;
}

fs.writeFileSync('client/src/components/NutritionTracker.jsx', newLines.join('\n'));
console.log('Tabs 0 and 1 wrapped in component calls!');
