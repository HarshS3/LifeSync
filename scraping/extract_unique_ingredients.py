import pandas as pd
import os

# Path to the long ingredients CSV
file_path = r'd:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\tarladalal_recipe_ingredients_long.csv'
output_path = r'd:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\unique_ingredients.txt'

def extract_unique_ingredients():
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        return

    print("Reading ingredients file...")
    # Read only the ingredient_name column to save memory
    df = pd.read_csv(file_path, usecols=['ingredient_name'])
    
    print("Extracting unique names...")
    # Drop NaNs, strip whitespace, and get unique values
    unique_ingredients = df['ingredient_name'].dropna().str.strip().unique()
    
    # Sort them alphabetically
    unique_ingredients = sorted([str(x) for x in unique_ingredients if str(x).strip()])
    
    print(f"Found {len(unique_ingredients)} unique ingredients.")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for ing in unique_ingredients:
            f.write(f"{ing}\n")
    
    print(f"Unique ingredients saved to {output_path}")

if __name__ == "__main__":
    extract_unique_ingredients()
