import pandas as pd
import re

csv_path = r"d:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\tarladalal_recipe_wide.csv"
df = pd.read_csv(csv_path)

def get_num(s):
    if pd.isna(s): return 0.0
    m = re.search(r'(\d+(\.\d+)?)', str(s))
    return float(m.group(1)) if m else 0.0

df['kcal_val'] = df['energy_value'].apply(get_num)
df['fat_val'] = df['fat_value'].apply(get_num)
df['carbs_val'] = df['carbohydrates_value'].apply(get_num)
df['protein_val'] = df['protein_value'].apply(get_num)

# Formula
df['calc_kcal'] = (df['protein_val'] * 4) + (df['carbs_val'] * 4) + (df['fat_val'] * 9)
df['pct_diff'] = (abs(df['calc_kcal'] - df['kcal_val']) / df['kcal_val'].replace(0, 1)) * 100
df['abs_diff'] = (df['calc_kcal'] - df['kcal_val']).abs()

# Categorize the 112 mismatches (> 20%)
mismatch_mask = df['pct_diff'] > 20

# Decision Logic:
# 1. DELETE if mismatch is extreme (> 60%) or massive gap (> 200 kcal) or missing macros (< 10 kcal)
delete_mask = mismatch_mask & (
    (df['pct_diff'] > 60) | 
    (df['abs_diff'] > 200) | 
    (df['calc_kcal'] < 10)
)

# 2. AUTO-FIX if mismatch is moderate (20-60%) and plausible
fix_mask = mismatch_mask & (~delete_mask)

items_to_delete = df[delete_mask]
items_to_fix = df[fix_mask]

print(f"Total Mismatches (>20%): {mismatch_mask.sum()}")
print(f"Items to DELETE (Extreme errors): {len(items_to_delete)}")
print(f"Items to AUTO-FIX (Plausible macros): {len(items_to_fix)}")

# Perform deletion
df_final = df[~delete_mask].copy()

# Perform auto-fix (update the energy_value string)
def update_energy(row):
    if fix_mask.loc[row.name]:
        return f"{int(row['calc_kcal'])} Calories"
    return row['energy_value']

df_final['energy_value'] = df_final.apply(update_energy, axis=1)

# Cleanup helper columns
cols_to_keep = [c for c in df_final.columns if c not in ['kcal_val', 'fat_val', 'carbs_val', 'protein_val', 'calc_kcal', 'pct_diff', 'abs_diff']]
df_final = df_final[cols_to_keep]

# Save
df_final.to_csv(csv_path, index=False)

print("\nExamples of Fixed Items:")
for _, row in items_to_fix.head(10).iterrows():
    print(f"  {row['food_name']}: {row['energy_value']} -> {int(row['calc_kcal'])} Calories")

print("\nExamples of Deleted Items:")
for _, row in items_to_delete.head(10).iterrows():
    print(f"  {row['food_name']} ({row['energy_value']} vs {int(row['calc_kcal'])} calc)")

print(f"\nFinal dataset size: {len(df_final)} rows.")
