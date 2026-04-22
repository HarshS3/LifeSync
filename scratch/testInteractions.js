const { evaluateMealInteractions } = require('./server/services/nutritionPipeline/nutrientInteractions');

const foods = [
  { name: 'Rajma', iron: 5, nutrients: { iron: 5 } },
  { name: 'Lemon juice', vitaminC: 20, nutrients: { vitaminC: 20 } }
];

const result = evaluateMealInteractions(foods);
console.log(JSON.stringify(result, null, 2));

const foods2 = [
  { name: 'Rajma', iron: 5 },
  { name: 'Chai' }
];

const result2 = evaluateMealInteractions(foods2);
console.log(JSON.stringify(result2, null, 2));
