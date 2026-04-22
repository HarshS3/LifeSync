# INDB Schema Report

Workbook: [INDB.xlsx](../INDB.xlsx)

## Overview

- Sheet count: 1
- Main sheet inspected: `Nutrient Data`
- Food rows: 1014
- Column count: 82
- Rows with `servings_unit`: 917
- Rows with complete `unit_serving_*` style data: 932

## Column Groups

- Identity: food_code, food_name, primarysource
- Base energy: energy_kj, energy_kcal
- Base macros: carb_g, protein_g, fat_g, freesugar_g, fibre_g
- Base fat breakdown: sfa_mg, mufa_mg, pufa_mg, cholesterol_mg
- Base minerals: calcium_mg, phosphorus_mg, magnesium_mg, sodium_mg, potassium_mg, iron_mg, copper_mg, selenium_ug, chromium_mg, manganese_mg, molybdenum_mg, zinc_mg
- Base vitamins and related: vita_ug, vite_mg, vitd2_ug, vitd3_ug, vitk1_ug, vitk2_ug, folate_ug, vitb1_mg, vitb2_mg, vitb3_mg, vitb5_mg, vitb6_mg, vitb7_ug, vitb9_ug, vitc_mg, carotenoids_ug
- Serving metadata: servings_unit
- Unit-serving nutrient profile: 39 columns prefixed with `unit_serving_`

## Important Interpretation

- The workbook stores a complete base nutrient profile for every row.
- For many foods it also stores a household-serving nutrient profile through `servings_unit` plus `unit_serving_*` columns.
- The workbook does **not** include an explicit serving weight column like `serving_weight_g` or `serving_size_g`.
- Household weights such as cup, plate, bowl, or glass therefore need to be inferred from the ratio between base nutrients and `unit_serving_*` nutrients.
- Some `unit_serving_*` rows are clearly corrupted or implausible, so application code should validate them before use.

## Column Dictionary

| Column | Group | Non-empty rows | Description |
| --- | --- | ---: | --- |
| `food_code` | identity | 1014 | Unique food identifier in the INDB workbook. |
| `food_name` | identity | 1014 | Human-readable food name. |
| `primarysource` | identity | 1014 | Source tag or source collection for the row. |
| `energy_kj` | base_energy | 1014 | Base energy in kilojoules. |
| `energy_kcal` | base_energy | 1014 | Base energy in kilocalories. |
| `carb_g` | base_macros | 1014 | Base carbohydrate amount in grams. |
| `protein_g` | base_macros | 1014 | Base protein amount in grams. |
| `fat_g` | base_macros | 1014 | Base fat amount in grams. |
| `freesugar_g` | base_macros | 1014 | Base free sugar amount in grams. |
| `fibre_g` | base_macros | 1014 | Base fibre amount in grams. |
| `sfa_mg` | base_fat_breakdown | 1014 | Base saturated fat in milligrams. |
| `mufa_mg` | base_fat_breakdown | 1014 | Base monounsaturated fat in milligrams. |
| `pufa_mg` | base_fat_breakdown | 1014 | Base polyunsaturated fat in milligrams. |
| `cholesterol_mg` | base_fat_breakdown | 1014 | Base cholesterol in milligrams. |
| `calcium_mg` | base_minerals | 1014 | Base calcium in milligrams. |
| `phosphorus_mg` | base_minerals | 1014 | Base phosphorus in milligrams. |
| `magnesium_mg` | base_minerals | 1014 | Base magnesium in milligrams. |
| `sodium_mg` | base_minerals | 1014 | Base sodium in milligrams. |
| `potassium_mg` | base_minerals | 1014 | Base potassium in milligrams. |
| `iron_mg` | base_minerals | 1014 | Base iron in milligrams. |
| `copper_mg` | base_minerals | 1014 | Base copper in milligrams. |
| `selenium_ug` | base_minerals | 1014 | Base selenium in micrograms. |
| `chromium_mg` | base_minerals | 1014 | Base chromium in milligrams. |
| `manganese_mg` | base_minerals | 1014 | Base manganese in milligrams. |
| `molybdenum_mg` | base_minerals | 1014 | Base molybdenum in milligrams. |
| `zinc_mg` | base_minerals | 1014 | Base zinc in milligrams. |
| `vita_ug` | base_vitamins | 1014 | Base vitamin A in micrograms. |
| `vite_mg` | base_vitamins | 1014 | Base vitamin E in milligrams. |
| `vitd2_ug` | base_vitamins | 1014 | Base vitamin D2 in micrograms. |
| `vitd3_ug` | base_vitamins | 1014 | Base vitamin D3 in micrograms. |
| `vitk1_ug` | base_vitamins | 1014 | Base vitamin K1 in micrograms. |
| `vitk2_ug` | base_vitamins | 1014 | Base vitamin K2 in micrograms. |
| `folate_ug` | base_vitamins | 1014 | Base folate in micrograms. |
| `vitb1_mg` | base_vitamins | 1014 | Base vitamin B1 in milligrams. |
| `vitb2_mg` | base_vitamins | 1014 | Base vitamin B2 in milligrams. |
| `vitb3_mg` | base_vitamins | 1014 | Base vitamin B3 in milligrams. |
| `vitb5_mg` | base_vitamins | 1014 | Base vitamin B5 in milligrams. |
| `vitb6_mg` | base_vitamins | 1014 | Base vitamin B6 in milligrams. |
| `vitb7_ug` | base_vitamins | 1014 | Base vitamin B7 in micrograms. |
| `vitb9_ug` | base_vitamins | 1014 | Base vitamin B9 in micrograms. |
| `vitc_mg` | base_vitamins | 1014 | Base vitamin C in milligrams. |
| `carotenoids_ug` | base_vitamins | 1014 | Base carotenoids in micrograms. |
| `servings_unit` | serving_metadata | 917 | Named household serving unit such as tea cup, bowl, plate, or glass. |
| `unit_serving_energy_kj` | unit_serving_profile | 932 | Per-serving value for energy kj. |
| `unit_serving_energy_kcal` | unit_serving_profile | 932 | Per-serving value for energy kcal. |
| `unit_serving_carb_g` | unit_serving_profile | 932 | Per-serving value for carb g. |
| `unit_serving_protein_g` | unit_serving_profile | 932 | Per-serving value for protein g. |
| `unit_serving_fat_g` | unit_serving_profile | 932 | Per-serving value for fat g. |
| `unit_serving_freesugar_g` | unit_serving_profile | 932 | Per-serving value for freesugar g. |
| `unit_serving_fibre_g` | unit_serving_profile | 932 | Per-serving value for fibre g. |
| `unit_serving_sfa_mg` | unit_serving_profile | 932 | Per-serving value for sfa mg. |
| `unit_serving_mufa_mg` | unit_serving_profile | 932 | Per-serving value for mufa mg. |
| `unit_serving_pufa_mg` | unit_serving_profile | 932 | Per-serving value for pufa mg. |
| `unit_serving_cholesterol_mg` | unit_serving_profile | 932 | Per-serving value for cholesterol mg. |
| `unit_serving_calcium_mg` | unit_serving_profile | 932 | Per-serving value for calcium mg. |
| `unit_serving_phosphorus_mg` | unit_serving_profile | 932 | Per-serving value for phosphorus mg. |
| `unit_serving_magnesium_mg` | unit_serving_profile | 932 | Per-serving value for magnesium mg. |
| `unit_serving_sodium_mg` | unit_serving_profile | 932 | Per-serving value for sodium mg. |
| `unit_serving_potassium_mg` | unit_serving_profile | 932 | Per-serving value for potassium mg. |
| `unit_serving_iron_mg` | unit_serving_profile | 932 | Per-serving value for iron mg. |
| `unit_serving_copper_mg` | unit_serving_profile | 932 | Per-serving value for copper mg. |
| `unit_serving_selenium_ug` | unit_serving_profile | 932 | Per-serving value for selenium ug. |
| `unit_serving_chromium_mg` | unit_serving_profile | 932 | Per-serving value for chromium mg. |
| `unit_serving_manganese_mg` | unit_serving_profile | 932 | Per-serving value for manganese mg. |
| `unit_serving_molybdenum_mg` | unit_serving_profile | 932 | Per-serving value for molybdenum mg. |
| `unit_serving_zinc_mg` | unit_serving_profile | 932 | Per-serving value for zinc mg. |
| `unit_serving_vita_ug` | unit_serving_profile | 932 | Per-serving value for vita ug. |
| `unit_serving_vite_mg` | unit_serving_profile | 932 | Per-serving value for vite mg. |
| `unit_serving_vitd2_ug` | unit_serving_profile | 932 | Per-serving value for vitd2 ug. |
| `unit_serving_vitd3_ug` | unit_serving_profile | 932 | Per-serving value for vitd3 ug. |
| `unit_serving_vitk1_ug` | unit_serving_profile | 932 | Per-serving value for vitk1 ug. |
| `unit_serving_vitk2_ug` | unit_serving_profile | 932 | Per-serving value for vitk2 ug. |
| `unit_serving_folate_ug` | unit_serving_profile | 932 | Per-serving value for folate ug. |
| `unit_serving_vitb1_mg` | unit_serving_profile | 932 | Per-serving value for vitb1 mg. |
| `unit_serving_vitb2_mg` | unit_serving_profile | 932 | Per-serving value for vitb2 mg. |
| `unit_serving_vitb3_mg` | unit_serving_profile | 932 | Per-serving value for vitb3 mg. |
| `unit_serving_vitb5_mg` | unit_serving_profile | 932 | Per-serving value for vitb5 mg. |
| `unit_serving_vitb6_mg` | unit_serving_profile | 932 | Per-serving value for vitb6 mg. |
| `unit_serving_vitb7_ug` | unit_serving_profile | 932 | Per-serving value for vitb7 ug. |
| `unit_serving_vitb9_ug` | unit_serving_profile | 932 | Per-serving value for vitb9 ug. |
| `unit_serving_vitc_mg` | unit_serving_profile | 932 | Per-serving value for vitc mg. |
| `unit_serving_carotenoids_ug` | unit_serving_profile | 932 | Per-serving value for carotenoids ug. |

## Inferred Serving Units

These are inferred from nutrient ratios, not explicitly stored gram weights. They are useful for UI hints and QA, but should still be treated as estimates.

| Serving unit | Foods with valid inference | Median inferred weight (g) | Min (g) | Max (g) |
| --- | ---: | ---: | ---: | ---: |
| `bowl` | 240 | 239 | 47 | 770 |
| `plate` | 55 | 302 | 95 | 831 |
| `piece` | 53 | 66 | 13 | 393 |
| `biscuit` | 29 | 19 | 11 | 151 |
| `tablespoon` | 21 | 19 | 11 | 43 |
| `triangle` | 21 | 61 | 28 | 240 |
| `tall glass` | 20 | 340 | 251 | 544 |
| `slice` | 19 | 116 | 56 | 513 |
| `cup` | 18 | 314 | 52 | 1115 |
| `soup bowl` | 17 | 362 | 188 | 463 |
| `glass` | 15 | 339 | 170 | 629 |
| `sandwich` | 14 | 78 | 22 | 261 |
| `small bowl` | 14 | 225 | 79 | 573 |
| `parantha` | 13 | 85 | 56 | 108 |
| `cookie` | 12 | 86 | 14 | 219 |
| `egg` | 12 | 89 | 56 | 582 |
| `dish` | 10 | 288 | 188 | 1776 |
| `jar` | 10 | 149 | 23 | 1175 |
| `poori` | 10 | 119 | 75 | 153 |
| `pancake` | 9 | 110 | 42 | 134 |

## Serving Unit Samples

### bowl

- Al yakhani (`ASC220`): ~232 g, 342.3 kcal per serving
- Almond soup (Badam ka soup) (`BFP087`): ~477 g, 375.16 kcal per serving
- Apple kheer (Seb ki kheer) (`BFP338`): ~333 g, 270.47 kcal per serving
- Apple mousse (`ASC314`): ~365 g, 390.28 kcal per serving
- Apple sago payasam (Seb aur sabudana ki kheer) (`OSR013`): ~331 g, 451.91 kcal per serving

### plate

- Afghani chicken (`OSR062`): ~190 g, 287.5 kcal per serving
- Baked eggs in tomato sauce (`OSR069`): ~498 g, 398.25 kcal per serving
- Beans and macaroni (`BFP154`): ~254 g, 345.99 kcal per serving
- Black channa pulao/ Bengal gram pulao (Kale chane ka pulao) (`BFP138`): ~397 g, 498.16 kcal per serving
- Boiled rice (Uble chawal) (`ASC113`): ~300 g, 351.57 kcal per serving

### piece

- Apple cake (Seb ka cake) (`ASC418`): ~68 g, 197.25 kcal per serving
- Apple snowballs (`ASC331`): ~260 g, 263.42 kcal per serving
- Atta dal burfi  (`BFP574`): ~39 g, 115.78 kcal per serving
- Black forest gateau (`BFP485`): ~66 g, 142.76 kcal per serving
- Cheese balls (`ASC409`): ~59 g, 402.95 kcal per serving

### biscuit

- Almond biscuit (Badam ke biscuit) (`BFP502`): ~19 g, 75.74 kcal per serving
- Butterfly biscuit (`BFP519`): ~12 g, 41.48 kcal per serving
- Buttermilk biscuit (`OSR032`): ~128 g, 414.46 kcal per serving
- Chocolate biscuit (`ASC442`): ~15 g, 57.49 kcal per serving
- Christmas bell biscuit (`BFP510`): ~21 g, 84.11 kcal per serving

### tablespoon

- Butter icing (`BFP499`): ~16 g, 81.12 kcal per serving
- Chocolate butter icing (`BFP500`): ~19 g, 91.1 kcal per serving
- Chocolate glace icing (`BFP498`): ~24 g, 104.44 kcal per serving
- Chocolate sauce (`BFP353`): ~17 g, 43.87 kcal per serving
- Coconut chutney (Nariyal ki chutney) (`ASC386`): ~25 g, 67.37 kcal per serving

### triangle

- Carrot apple sandwich (Gajar aur seb ka sandwich) (`ASC034`): ~97 g, 208.22 kcal per serving
- Cheese and chilli sandwich  (`ASC023`): ~56 g, 121.6 kcal per serving
- Cheese and pineapple sandwich (Cheese aur ananas ka sandwich) (`ASC026`): ~56 g, 143.68 kcal per serving
- Cheese and tomato sandwich (Cheese aur tamatar ke sandwich) (`ASC027`): ~58 g, 141.73 kcal per serving
- Cheese and tomato sandwich (toasted) (Cheese aur tamatar ke sandwich (toasted)) (`ASC040`): ~76 g, 170.12 kcal per serving

### tall glass

- Banana milkshake (Kele milkshake) (`ASC016`): ~345 g, 225.63 kcal per serving
- Banana milkshake with ice cream (Kele ka milkshake ice cream ke saath) (`BFP015`): ~340 g, 259.92 kcal per serving
- Coco pine cooler (`ASC011`): ~432 g, 141.54 kcal per serving
- Cold coffee (with cream) (`BFP013`): ~251 g, 207.32 kcal per serving
- Egg nog (`ASC020`): ~303 g, 294.82 kcal per serving

### slice

- Almond cardamom cake (Badam elaichi cake) (`OSR126`): ~68 g, 242.84 kcal per serving
- Apple cinnamon pie (`ASC403`): ~177 g, 458.28 kcal per serving
- Banana cake (Kele ka cake) (`ASC423`): ~66 g, 258.3 kcal per serving
- Carrot cake (Gajar ka cake) (`OSR122`): ~100 g, 255.46 kcal per serving
- Chhena poda (`OSR022`): ~74 g, 255.84 kcal per serving

### cup

- Apple and honey sorbet (Seb aur shehad ka sharbat) (`OSR004`): ~162 g, 196.96 kcal per serving
- Brown stock (`ASC068`): ~488 g, 103.65 kcal per serving
- Chicken stock (`ASC070`): ~376 g, 112.33 kcal per serving
- Crunchy butterscotch (`BFP356`): ~187 g, 519.63 kcal per serving
- Curd dressing  (`BFP313`): ~209 g, 164.82 kcal per serving

### soup bowl

- Chicken consomme (Clear chicken soup) (`ASC081`): ~226 g, 108.31 kcal per serving
- Chicken sweet corn soup (`ASC087`): ~242 g, 68.46 kcal per serving
- Clear tomato soup (Tamatar ka soup) (`ASC079`): ~398 g, 318.41 kcal per serving
- Cold cucumber soup (Thanda kheere ka soup) (`ASC094`): ~188 g, 90.13 kcal per serving
- Cold summer garden soup (`ASC095`): ~307 g, 151 kcal per serving

## Data Quality Notes

- `unit_serving_*` blocks are present for most rows, but not all.
- Some rows have implausible unit-serving calories or fats and should be rejected in app logic.
- The serving unit strings are free-text labels like `tea cup`, `tall glass`, `plate`, `bowl`, and `piece`, so normalization may be helpful for analytics.

## Recommended App Mapping

- Use `food_code`, `food_name`, and `primarysource` as the stable identity layer.
- Use the base nutrient fields as the fallback profile.
- Use `servings_unit` plus `unit_serving_*` only after plausibility checks.
- Surface inferred serving weights to the user as estimates, for example `1 tea cup (~210 g)`.
