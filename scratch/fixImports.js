const fs = require('fs');
let c = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');

const tabs = ['DailyLogTab', 'LogMealTab', 'DetailsTab', 'SummaryTab', 'ScanProductTab'];
tabs.forEach(tab => {
  const re = new RegExp(`import ${tab} from '\\.\\/nutrition\\/${tab}'\\r?\\n`, 'g');
  const reD = new RegExp(`import ${tab} from '\\.\\/nutrition\\/${tab}'`, 'g');
  console.log('Replacing', tab);
  c = c.replace(re, '');
  c = c.replace(reD, '');
});

const imports = tabs.map(t => `import ${t} from './nutrition/${t}'`).join('\n') + '\n';
c = c.replace("import SupplementSection from './Nutrition/SupplementSection'", imports + "import SupplementSection from './Nutrition/SupplementSection'");

console.log('Adding back imports once');
fs.writeFileSync('client/src/components/NutritionTracker.jsx', c);