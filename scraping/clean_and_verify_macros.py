import pandas as pd
import re

csv_path = r"d:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\tarladalal_recipe_wide.csv"
df = pd.read_csv(csv_path)

def get_num(s):
    if pd.isna(s): return 0.0
    m = re.search(r'(\d+(\.\d+)?)', str(s))
    return float(m.group(1)) if m else 0.0

# 1. Identify and Remove the 9 flagged items
# We'll use the same logic that identified them
df['kcal_val'] = df['energy_value'].apply(get_num)
df['fat_val'] = df['fat_value'].apply(get_num)
df['carbs_val'] = df['carbohydrates_value'].apply(get_num)
df['protein_val'] = df['protein_value'].apply(get_num)

likely_error_mask = (df['fat_val'] > 500) | (df['carbs_val'] > 1000) | (df['kcal_val'] > 5000)
removed_items = df[likely_error_mask]
df_clean = df[~likely_error_mask].copy()

print(f"Removed {len(removed_items)} erroneous items.")

# 2. Macro Check
# Formula: (P*4) + (C*4) + (F*9)
df_clean['calc_kcal'] = (df_clean['protein_val'] * 4) + (df_clean['carbs_val'] * 4) + (df_clean['fat_val'] * 9)
df_clean['kcal_diff'] = (df_clean['calc_kcal'] - df_clean['kcal_val']).abs()
df_clean['kcal_pct_diff'] = (df_clean['kcal_diff'] / df_clean['kcal_val'].replace(0, 1)) * 100

# Significant macro mismatches (> 20% diff AND > 20 kcal diff)
# Note: Tarla Dalal sometimes rounds or includes fiber, but large gaps indicate errors.
mismatches = df_clean[(df_clean['kcal_pct_diff'] > 20) & (df_clean['kcal_diff'] > 20)].sort_values(by='kcal_diff', ascending=False)

print(f"\nMacro Verification:")
print(f"Total items checked: {len(df_clean)}")
print(f"Items with significant macro mismatch (>20%): {len(mismatches)}")

if not mismatches.empty:
    print("\nTop 15 Macro Mismatches (Calculated vs Reported):")
    print(mismatches[['food_name', 'energy_value', 'calc_kcal', 'kcal_diff', 'kcal_pct_diff', 'protein_value', 'carbohydrates_value', 'fat_value']].head(15).to_string(index=False))

# 3. Save the cleaned CSV (overwriting)
# Remove the helper columns before saving
cols_to_save = [c for c in df_clean.columns if c not in ['kcal_val', 'fat_val', 'carbs_val', 'protein_val', 'calc_kcal', 'kcal_diff', 'kcal_pct_diff', 'bin']]
df_clean[cols_to_save].to_csv(csv_path, index=False)
print(f"\nUpdated {csv_path} with 9 items removed.")
