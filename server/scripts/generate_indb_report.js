const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const workbookPath = path.resolve(__dirname, '../../INDB.xlsx');
const docsDir = path.resolve(__dirname, '../../docs');
const reportPath = path.join(docsDir, 'INDB_SCHEMA_REPORT.md');
const unitsJsonPath = path.join(docsDir, 'INDB_SERVING_UNITS.json');

function toSafeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function parseLooseNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, '').replace(/[^0-9.+-]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function median(values) {
  const nums = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function inferServingWeightG(row) {
  const baseCalories = parseLooseNumber(row.energy_kcal);
  const baseProtein = parseLooseNumber(row.protein_g);
  const baseCarbs = parseLooseNumber(row.carb_g);
  const baseFat = parseLooseNumber(row.fat_g);
  const baseFiber = parseLooseNumber(row.fibre_g);
  const unitCalories = parseLooseNumber(row.unit_serving_energy_kcal);
  const unitProtein = parseLooseNumber(row.unit_serving_protein_g);
  const unitCarbs = parseLooseNumber(row.unit_serving_carb_g);
  const unitFat = parseLooseNumber(row.unit_serving_fat_g);
  const unitFiber = parseLooseNumber(row.unit_serving_fibre_g);

  if (!Number.isFinite(unitCalories) || unitCalories <= 0) return null;
  if (unitCalories > 1500) return null;
  if (Number.isFinite(unitFat) && unitFat > 150) return null;
  if (Number.isFinite(unitCarbs) && unitCarbs > 300) return null;
  if (Number.isFinite(unitProtein) && unitProtein > 120) return null;

  const ratios = [
    baseCalories > 0 && unitCalories > 0 ? unitCalories / baseCalories : null,
    baseProtein > 0 && unitProtein > 0 ? unitProtein / baseProtein : null,
    baseCarbs > 0 && unitCarbs > 0 ? unitCarbs / baseCarbs : null,
    baseFat > 0 && unitFat > 0 ? unitFat / baseFat : null,
    baseFiber > 0 && unitFiber > 0 ? unitFiber / baseFiber : null,
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (!ratios.length) return null;
  const medRatio = median(ratios);
  if (!Number.isFinite(medRatio) || medRatio <= 0) return null;

  const maxDeviation = Math.max(...ratios.map((value) => Math.abs(value - medRatio) / medRatio));
  if (maxDeviation > 0.25) return null;

  const inferredWeightG = Math.round(medRatio * 100);
  if (inferredWeightG <= 0 || inferredWeightG > 2000) return null;
  return inferredWeightG;
}

function classifyColumn(name) {
  if (['food_code', 'food_name', 'primarysource'].includes(name)) return 'identity';
  if (name === 'servings_unit') return 'serving_metadata';
  if (name.startsWith('unit_serving_')) return 'unit_serving_profile';
  if (name === 'energy_kj' || name === 'energy_kcal') return 'base_energy';
  if (['carb_g', 'protein_g', 'fat_g', 'freesugar_g', 'fibre_g'].includes(name)) return 'base_macros';
  if (['sfa_mg', 'mufa_mg', 'pufa_mg', 'cholesterol_mg'].includes(name)) return 'base_fat_breakdown';
  if (['calcium_mg', 'phosphorus_mg', 'magnesium_mg', 'sodium_mg', 'potassium_mg', 'iron_mg', 'copper_mg', 'selenium_ug', 'chromium_mg', 'manganese_mg', 'molybdenum_mg', 'zinc_mg'].includes(name)) return 'base_minerals';
  return 'base_vitamins';
}

function describeColumn(name) {
  const descriptions = {
    food_code: 'Unique food identifier in the INDB workbook.',
    food_name: 'Human-readable food name.',
    primarysource: 'Source tag or source collection for the row.',
    energy_kj: 'Base energy in kilojoules.',
    energy_kcal: 'Base energy in kilocalories.',
    carb_g: 'Base carbohydrate amount in grams.',
    protein_g: 'Base protein amount in grams.',
    fat_g: 'Base fat amount in grams.',
    freesugar_g: 'Base free sugar amount in grams.',
    fibre_g: 'Base fibre amount in grams.',
    sfa_mg: 'Base saturated fat in milligrams.',
    mufa_mg: 'Base monounsaturated fat in milligrams.',
    pufa_mg: 'Base polyunsaturated fat in milligrams.',
    cholesterol_mg: 'Base cholesterol in milligrams.',
    calcium_mg: 'Base calcium in milligrams.',
    phosphorus_mg: 'Base phosphorus in milligrams.',
    magnesium_mg: 'Base magnesium in milligrams.',
    sodium_mg: 'Base sodium in milligrams.',
    potassium_mg: 'Base potassium in milligrams.',
    iron_mg: 'Base iron in milligrams.',
    copper_mg: 'Base copper in milligrams.',
    selenium_ug: 'Base selenium in micrograms.',
    chromium_mg: 'Base chromium in milligrams.',
    manganese_mg: 'Base manganese in milligrams.',
    molybdenum_mg: 'Base molybdenum in milligrams.',
    zinc_mg: 'Base zinc in milligrams.',
    vita_ug: 'Base vitamin A in micrograms.',
    vite_mg: 'Base vitamin E in milligrams.',
    vitd2_ug: 'Base vitamin D2 in micrograms.',
    vitd3_ug: 'Base vitamin D3 in micrograms.',
    vitk1_ug: 'Base vitamin K1 in micrograms.',
    vitk2_ug: 'Base vitamin K2 in micrograms.',
    folate_ug: 'Base folate in micrograms.',
    vitb1_mg: 'Base vitamin B1 in milligrams.',
    vitb2_mg: 'Base vitamin B2 in milligrams.',
    vitb3_mg: 'Base vitamin B3 in milligrams.',
    vitb5_mg: 'Base vitamin B5 in milligrams.',
    vitb6_mg: 'Base vitamin B6 in milligrams.',
    vitb7_ug: 'Base vitamin B7 in micrograms.',
    vitb9_ug: 'Base vitamin B9 in micrograms.',
    vitc_mg: 'Base vitamin C in milligrams.',
    carotenoids_ug: 'Base carotenoids in micrograms.',
    servings_unit: 'Named household serving unit such as tea cup, bowl, plate, or glass.',
  };
  if (descriptions[name]) return descriptions[name];
  if (name.startsWith('unit_serving_')) {
    return `Per-serving value for ${name.replace('unit_serving_', '').replaceAll('_', ' ')}.`;
  }
  return 'Undocumented column.';
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(digits));
}

function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found at ${workbookPath}`);
  }

  fs.mkdirSync(docsDir, { recursive: true });

  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false, blankrows: false });
  const headers = rows.length ? Object.keys(rows[0]) : [];

  const nonEmptyCounts = Object.fromEntries(headers.map((header) => [header, 0]));
  for (const row of rows) {
    for (const header of headers) {
      if (row[header] !== null && row[header] !== '') nonEmptyCounts[header] += 1;
    }
  }

  const servingRows = [];
  for (const row of rows) {
    const unit = toSafeString(row.servings_unit).toLowerCase();
    if (!unit) continue;
    const inferredWeightG = inferServingWeightG(row);
    if (!Number.isFinite(inferredWeightG)) continue;
    servingRows.push({
      food_code: row.food_code,
      food_name: row.food_name,
      servings_unit: unit,
      inferredWeightG,
      unitCalories: parseLooseNumber(row.unit_serving_energy_kcal),
      baseCalories: parseLooseNumber(row.energy_kcal),
    });
  }

  const servingUnitSummary = {};
  for (const row of servingRows) {
    if (!servingUnitSummary[row.servings_unit]) servingUnitSummary[row.servings_unit] = [];
    servingUnitSummary[row.servings_unit].push(row);
  }

  const summarizedUnits = Object.entries(servingUnitSummary)
    .map(([unit, entries]) => {
      const weights = entries.map((entry) => entry.inferredWeightG).filter(Number.isFinite);
      const sampleFoods = entries
        .slice()
        .sort((a, b) => a.food_name.localeCompare(b.food_name))
        .slice(0, 5)
        .map((entry) => ({
          food_code: entry.food_code,
          food_name: entry.food_name,
          inferredWeightG: entry.inferredWeightG,
          unitCalories: entry.unitCalories,
        }));

      return {
        unit,
        foodCount: entries.length,
        inferredWeightMedianG: formatNumber(median(weights), 0),
        inferredWeightMinG: Math.min(...weights),
        inferredWeightMaxG: Math.max(...weights),
        sampleFoods,
      };
    })
    .sort((a, b) => b.foodCount - a.foodCount || a.unit.localeCompare(b.unit));

  fs.writeFileSync(unitsJsonPath, JSON.stringify(summarizedUnits, null, 2));

  const topUnits = summarizedUnits.slice(0, 20);
  const identityColumns = headers.filter((header) => classifyColumn(header) === 'identity');
  const baseEnergyColumns = headers.filter((header) => classifyColumn(header) === 'base_energy');
  const baseMacroColumns = headers.filter((header) => classifyColumn(header) === 'base_macros');
  const baseFatColumns = headers.filter((header) => classifyColumn(header) === 'base_fat_breakdown');
  const baseMineralColumns = headers.filter((header) => classifyColumn(header) === 'base_minerals');
  const baseVitaminColumns = headers.filter((header) => classifyColumn(header) === 'base_vitamins');
  const servingColumns = headers.filter((header) => classifyColumn(header) === 'serving_metadata');
  const unitServingColumns = headers.filter((header) => classifyColumn(header) === 'unit_serving_profile');

  const lines = [];
  lines.push('# INDB Schema Report');
  lines.push('');
  lines.push(`Workbook: [INDB.xlsx](../INDB.xlsx)`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push(`- Sheet count: ${workbook.SheetNames.length}`);
  lines.push(`- Main sheet inspected: \`${sheetName}\``);
  lines.push(`- Food rows: ${rows.length}`);
  lines.push(`- Column count: ${headers.length}`);
  lines.push(`- Rows with \`servings_unit\`: ${nonEmptyCounts.servings_unit || 0}`);
  lines.push(`- Rows with complete \`unit_serving_*\` style data: ${nonEmptyCounts.unit_serving_energy_kcal || 0}`);
  lines.push('');
  lines.push('## Column Groups');
  lines.push('');
  lines.push(`- Identity: ${identityColumns.join(', ')}`);
  lines.push(`- Base energy: ${baseEnergyColumns.join(', ')}`);
  lines.push(`- Base macros: ${baseMacroColumns.join(', ')}`);
  lines.push(`- Base fat breakdown: ${baseFatColumns.join(', ')}`);
  lines.push(`- Base minerals: ${baseMineralColumns.join(', ')}`);
  lines.push(`- Base vitamins and related: ${baseVitaminColumns.join(', ')}`);
  lines.push(`- Serving metadata: ${servingColumns.join(', ')}`);
  lines.push(`- Unit-serving nutrient profile: ${unitServingColumns.length} columns prefixed with \`unit_serving_\``);
  lines.push('');
  lines.push('## Important Interpretation');
  lines.push('');
  lines.push('- The workbook stores a complete base nutrient profile for every row.');
  lines.push('- For many foods it also stores a household-serving nutrient profile through `servings_unit` plus `unit_serving_*` columns.');
  lines.push('- The workbook does **not** include an explicit serving weight column like `serving_weight_g` or `serving_size_g`.');
  lines.push('- Household weights such as cup, plate, bowl, or glass therefore need to be inferred from the ratio between base nutrients and `unit_serving_*` nutrients.');
  lines.push('- Some `unit_serving_*` rows are clearly corrupted or implausible, so application code should validate them before use.');
  lines.push('');
  lines.push('## Column Dictionary');
  lines.push('');
  lines.push('| Column | Group | Non-empty rows | Description |');
  lines.push('| --- | --- | ---: | --- |');
  for (const header of headers) {
    lines.push(`| \`${header}\` | ${classifyColumn(header)} | ${nonEmptyCounts[header] || 0} | ${describeColumn(header)} |`);
  }
  lines.push('');
  lines.push('## Inferred Serving Units');
  lines.push('');
  lines.push('These are inferred from nutrient ratios, not explicitly stored gram weights. They are useful for UI hints and QA, but should still be treated as estimates.');
  lines.push('');
  lines.push('| Serving unit | Foods with valid inference | Median inferred weight (g) | Min (g) | Max (g) |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const row of topUnits) {
    lines.push(`| \`${row.unit}\` | ${row.foodCount} | ${row.inferredWeightMedianG} | ${row.inferredWeightMinG} | ${row.inferredWeightMaxG} |`);
  }
  lines.push('');
  lines.push('## Serving Unit Samples');
  lines.push('');
  for (const row of topUnits.slice(0, 10)) {
    lines.push(`### ${row.unit}`);
    lines.push('');
    for (const sample of row.sampleFoods) {
      lines.push(`- ${sample.food_name} (\`${sample.food_code}\`): ~${sample.inferredWeightG} g, ${sample.unitCalories ?? 'n/a'} kcal per serving`);
    }
    lines.push('');
  }
  lines.push('## Data Quality Notes');
  lines.push('');
  lines.push('- `unit_serving_*` blocks are present for most rows, but not all.');
  lines.push('- Some rows have implausible unit-serving calories or fats and should be rejected in app logic.');
  lines.push('- The serving unit strings are free-text labels like `tea cup`, `tall glass`, `plate`, `bowl`, and `piece`, so normalization may be helpful for analytics.');
  lines.push('');
  lines.push('## Recommended App Mapping');
  lines.push('');
  lines.push('- Use `food_code`, `food_name`, and `primarysource` as the stable identity layer.');
  lines.push('- Use the base nutrient fields as the fallback profile.');
  lines.push('- Use `servings_unit` plus `unit_serving_*` only after plausibility checks.');
  lines.push('- Surface inferred serving weights to the user as estimates, for example `1 tea cup (~210 g)`.');

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);

  console.log(JSON.stringify({
    ok: true,
    workbookPath,
    reportPath,
    unitsJsonPath,
    rowCount: rows.length,
    columnCount: headers.length,
    topUnits: topUnits.slice(0, 10),
  }, null, 2));
}

main();
