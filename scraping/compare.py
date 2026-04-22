import pandas as pd
import json

def run():
    # Read food.txt which represents the INDB extracts
    with open('food.txt', 'r', encoding='utf-8') as f:
        food_txt_lines = [l.strip() for l in f if l.strip()]
        
    # Clean the food txt items (remove commas, quotes)
    food_txt_clean = []
    for f in food_txt_lines:
        clean_name = f.strip('",').strip()
        if clean_name:
             food_txt_clean.append(clean_name)
             
    original_set = set()
    unique_food_txt = []
    for f in food_txt_clean:
        if f.lower() not in original_set:
            original_set.add(f.lower())
            unique_food_txt.append(f)

    # Read CSV
    df = pd.read_csv('myfitnesspal_nutrition_data.csv')
    searched = set(df['Search Term'].dropna().str.lower().str.strip())
    
    matches = [f for f in unique_food_txt if f.lower() in searched]
    remaining = [f for f in unique_food_txt if f.lower() not in searched]
    
    with open('remaining_foods.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(remaining))
        
    print(f"Total Unique Foods from original list: {len(unique_food_txt)}")
    print(f"Total Matches Found in CSV: {len(matches)}")
    print(f"Remaining Foods (Not in CSV): {len(remaining)}")
    print("Wrote remaining foods to scraping/remaining_foods.txt")

if __name__ == "__main__":
    run()