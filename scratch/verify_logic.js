const { evaluateMealInteractions } = require('../server/services/nutritionPipeline/nutrientInteractions');

const foods = [
  { name: 'Dal', iron: 5 },
  { name: 'Chai' }
];

console.log('--- TEST 1: Iron (5mg) + Chai ---');
const res1 = evaluateMealInteractions(foods);
console.log('Synergies:', res1.synergies.length);
console.log('Antagonisms:', res1.antagonisms.length);
if (res1.antagonisms.length > 0) console.log('Antagonism Title:', res1.antagonisms[0].title);

const foods2 = [
  { name: 'Dal', iron: 5 },
  { name: 'Milk', calcium: 300 }
];

console.log('\n--- TEST 2: Iron (5mg) + Calcium (300mg) ---');
const res2 = evaluateMealInteractions(foods2);
console.log('Antagonisms:', res2.antagonisms.length);
if (res2.antagonisms.length > 0) console.log('Antagonism Title:', res2.antagonisms[0].title);

const foods3 = [
  { name: 'Carrots', vitaminA: 500, fat: 0.2 }
];

console.log('\n--- TEST 3: Carrots (500ug A, 0.2g fat) ---');
const res3 = evaluateMealInteractions(foods3);
console.log('Antagonisms:', res3.antagonisms.length);
if (res3.antagonisms.length > 0) console.log('Antagonism Title:', res3.antagonisms[0].title);
