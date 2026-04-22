import pandas as pd
import numpy as np
import sys

def main():
    print("--- EDA for myfitnesspal_nutrition_data.csv ---")
    try:
        df = pd.read_csv('myfitnesspal_nutrition_data.csv', on_bad_lines='skip')
        print(f"Total rows: {len(df)}")
        print(f"Total columns: {len(df.columns)}\n")
        
        # 1. Check for literal "Message:" / "Error:" text incorrectly scraped as data
        mask = df.astype(str).apply(lambda col: col.str.contains(r'Message:|Stacktrace:', case=False, na=False)).any(axis=1)
        if mask.sum() > 0:
            print(f"⚠️ Found {mask.sum()} rows containing corrupted stacktrace text.")
            print(df[mask][['Search Term', 'Matched Food Name']].head())
        else:
            print("✅ No stack trace / error messages found in data rows.")
            
        # 2. Check for missing values encoded as "--", "NaN"
        dash_counts = (df == '--').sum()
        na_counts = df.isna().sum()
        
        print("\n--- Missing Values (NaN or '--') ---")
        for col in df.columns:
            total_missing = dash_counts.get(col, 0) + na_counts.get(col, 0)
            if total_missing > 0:
                print(f"  - {col}: {total_missing} missing ({round((total_missing/len(df))*100, 1)}%)")
                
        # 3. Check for very sparse/poor quality rows
        nutrient_cols = [c for c in df.columns if c not in ['Search Term', 'Matched Food Name', 'Serving Qty', 'Serving Size']]
        
        df['missing_nutrient_count'] = df[nutrient_cols].apply(lambda row: sum(1 for val in row if pd.isna(val) or val == '--'), axis=1)
        poor_quality = df[df['missing_nutrient_count'] > 10]
        
        print(f"\n--- Poor Quality Scrapes ({len(poor_quality)} foods) ---")
        if len(poor_quality) > 0:
            print("Found foods with more than 10 missing nutrient columns (likely an incomplete MFP entry or failed scrape):")
            for idx, row in poor_quality.iterrows():
                print(f"  ❌ {row['Search Term']} (Match: {row['Matched Food Name']}) - {row['missing_nutrient_count']} nutrients missing")
        else:
            print("✅ All items have decently populated nutrient fields.")
            
        # 4. Check for anomalous 'Calories' formats (we expect a number)
        if 'Calories' in df.columns:
            cals = df['Calories'].replace('--', np.nan).dropna()
            # Remove commas like "1,000" just in case
            cals_stripped = cals.astype(str).str.replace(',', '')
            non_numeric = cals_stripped[~cals_stripped.str.match(r'^-?\d+(?:\.\d+)?$')]
            
            print("\n--- Value Type Formatting Anomalies ---")
            if len(non_numeric) > 0:
                print(f"⚠️ Found {len(non_numeric)} anomalous 'Calories' formats (not a simple number):")
                for idx, val in non_numeric.head(10).items():
                    print(f"  Row {idx}: {val}")
            else:
                print("✅ 'Calories' column formatting looks numeric and valid.")

        # Let's save a completely clean slice for safe keeping if they want it
        if mask.sum() > 0:
            df_clean = df[~mask]
            df_clean.to_csv('myfitnesspal_nutrition_data_cleaned.csv', index=False)
            print("\nSaved a copy without any corrupted rows to 'myfitnesspal_nutrition_data_cleaned.csv'")

    except Exception as e:
        print(f"Error accessing or parsing CSV: {e}")

if __name__ == '__main__':
    main()
