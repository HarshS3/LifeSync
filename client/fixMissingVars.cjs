const fs = require('fs');
let c = fs.readFileSync('client/src/components/NutritionTracker.jsx', 'utf8');

c = c.replace(/ *CustomFoodForm=\{CustomFoodForm\}\n/g, '');
c = c.replace(/ *MealBuilder=\{MealBuilder\}\n/g, '');
c = c.replace(/ *videoRef=\{videoRef\}\n/g, '');
c = c.replace(/ *barcodeResult=\{barcodeResult\}\n/g, '');
c = c.replace(/ *barcodeError=\{barcodeError\}\n/g, '');
c = c.replace(/ *addScannedProductToMeal=\{addScannedProductToMeal\}\n/g, '');

c = c.replace(/const \[barcodeLookupError, setBarcodeLookupError\] = useState\(''\)\n/g, '');
c = c.replace(/const \[barcodeProduct, setBarcodeProduct\] = useState\(null\)\n/g, '');

fs.writeFileSync('client/src/components/NutritionTracker.jsx', c);
