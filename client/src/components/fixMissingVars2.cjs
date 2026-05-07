const fs = require('fs');
let c = fs.readFileSync('src/components/NutritionTracker.jsx', 'utf8');

c = c.replace(/\s*CustomFoodForm=\{CustomFoodForm\}/g, '');
c = c.replace(/\s*MealBuilder=\{MealBuilder\}/g, '');
c = c.replace(/\s*videoRef=\{videoRef\}/g, '');
c = c.replace(/\s*barcodeResult=\{barcodeResult\}/g, '');
c = c.replace(/\s*barcodeError=\{barcodeError\}/g, '');
c = c.replace(/\s*addScannedProductToMeal=\{addScannedProductToMeal\}/g, '');

fs.writeFileSync('src/components/NutritionTracker.jsx', c);
