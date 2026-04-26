import pandas as pd
import re
import json

def get_num(s):
    if pd.isna(s): return 0.0
    m = re.search(r'(\d+(\.\d+)?)', str(s))
    return float(m.group(1)) if m else 0.0

# Load the original recipe wide CSV (before my final cleaning if possible, or just re-detect)
# Actually I'll use the comparison_analysis.csv if it exists
csv_path = r"d:\Projects\LifeSync\scraping\output\comparison_analysis.csv"
if pd.io.common.file_exists(csv_path):
    df = pd.read_csv(csv_path)
    # The 9 major errors and the 112 mismatches
    bad_mask = (df['energy_pct_diff'] > 20) | (df['cal_energy'] > 5000)
    deleted_urls = df[bad_mask]['calories_url_rec'].unique().tolist()
else:
    # Fallback to current recipe wide
    df = pd.read_csv(r"d:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\tarladalal_recipe_wide.csv")
    bad_mask = (df['energy_value'].apply(get_num) > 5000)
    deleted_urls = df[bad_mask]['calories_url'].unique().tolist()

with open(r"d:\Projects\LifeSync\scraping\output\deleted_urls.json", "w") as f:
    json.dump(deleted_urls, f)

print(f"Exported {len(deleted_urls)} bad URLs to JSON.")
