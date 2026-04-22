require('dotenv').config({ path: '../server/.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const IndbFood = require('../server/models/IndbFood');
const csvParse = require('csv-parse/sync');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const foods = await IndbFood.find({}, 'displayName');
    const indbNamesRaw = foods.map(f => f.displayName || '');
    const indbNamesLow = indbNamesRaw.map(n => n.toLowerCase().trim());

    const csvContent = fs.readFileSync('myfitnesspal_nutrition_data.csv', 'utf8');
    const records = csvParse.parse(csvContent, { columns: true, skip_empty_lines: true });
    
    // Some CSVs enclose the food name field or have extra spaces.
    const csvNames = records.map(r => (r['Search Term'] || '').toLowerCase().trim());

    const matchingIndbItems = indbNamesRaw.filter(n => csvNames.includes(n.toLowerCase().trim()));
    const remainingIndbItems = indbNamesRaw.filter(n => !csvNames.includes(n.toLowerCase().trim()));

    fs.writeFileSync('matching_indb_foods.txt', matchingIndbItems.join('\n'));
    fs.writeFileSync('remaining_indb_foods.txt', remainingIndbItems.join('\n'));

    console.log('--- DB & CSV OVERLAP ---');
    console.log(`Total INDB foods in DB: ${indbNamesRaw.length}`);
    console.log(`Total searched foods in CSV: ${csvNames.length}`);
    console.log('');
    console.log(`Matched perfectly: ${matchingIndbItems.length}`);
    console.log(`Remaining in INDB not scraped: ${remainingIndbItems.length}`);
    console.log('Saved to "matching_indb_foods.txt" and "remaining_indb_foods.txt".');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();