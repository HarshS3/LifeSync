import re
import os

input_path = r'd:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\unique_ingredients.txt'
output_path = r'd:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\normalized_ingredients.txt'

# Regex for quantities and units at the start
QTY_PATTERN = re.compile(r'^[\d\s\.\-/¼½¾]+(cups?|tbsp|tsp|grams?|g|ml|litres?|scoops?|slices?|segments?|diameter|mm|inch|portion|portions|lb|oz|cm)?[\s\.]*', re.IGNORECASE)

REMOVE_KEYWORDS = [
    'chopped', 'sliced', 'blanched', 'boiled', 'mashed', 'crushed', 'peeled', 
    'grated', 'parboiled', 'pureed', 'cooked', 'leftover', 'whisked', 'beaten', 
    'whipped', 'melted', 'toasted', 'fried', 'roasted', 'soaked', 'drained', 
    'cleaned', 'washed', 'cubes', 'juliennes', 'roundels', 'wedges', 'strips', 
    'halves', 'quarters', 'florets', 'stalks', 'peels', 'skins', 'sticks', 
    'rings', 'chunks', 'pieces', 'mixture', 'refer', 'handy', 'tip', 'recipe', 
    'below', 'above', 'diagonally', 'cut', 'thinly', 'thickly', 'finely', 
    'roughly', 'fresh', 'freshly', 'dried', 'dry', 'whole', 'half', 'full', 'large', 
    'small', 'medium', 'and', 'with', 'for', 'serving', 'to serve', 'approx', 
    'about', 'approx.', 'diameter', 'roughly', 'finely', 'whisked', 'approx'
]

def remove_parenthesis(text):
    # Handle nested parenthesis by repeating the removal or using a simple balance check
    # For this dataset, usually 1 or 2 levels.
    for _ in range(3):
        text = re.sub(r'\([^()]*\)', ' ', text)
    return text

def singularize(word):
    if word == 'potatoes': return 'potato'
    if word == 'tomatoes': return 'tomato'
    if word == 'chillies': return 'chilli'
    if word == 'onions': return 'onion'
    if word == 'apples': return 'apple'
    if word == 'bananas': return 'banana'
    if word == 'carrots': return 'carrot'
    if word == 'eggs': return 'egg'
    if word == 'walnuts': return 'walnut'
    if word == 'almonds': return 'almond'
    if word == 'grapes': return 'grape'
    if word == 'cherries': return 'cherry'
    if word == 'dates': return 'date'
    if word == 'biscuits': return 'biscuit'
    if word == 'cookies': return 'cookie'
    if word == 'apricots': return 'apricot'
    return word

def normalize(name):
    name = name.lower().strip()
    
    # 1. Remove all content in parenthesis
    name = remove_parenthesis(name)
    
    # 2. Remove leading quantities and units
    # We do it after parenthesis because some quantities are inside them
    name = QTY_PATTERN.sub('', name.strip())
    
    # 3. Remove keywords
    for kw in REMOVE_KEYWORDS:
        name = re.sub(r'\b' + re.escape(kw) + r'\b', ' ', name)
    
    # 4. Cleanup
    name = name.replace(',', ' ').replace('"', '').replace("'", "")
    name = ' '.join(name.split())
    name = name.strip(' .-')
    
    # 5. Singularize
    words = name.split()
    words = [singularize(w) for w in words]
    name = ' '.join(words)
    
    return name

def process():
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    normalized_set = set()
    for line in lines:
        clean = normalize(line.strip())
        if clean and len(clean) > 1:
            normalized_set.add(clean)

    sorted_list = sorted(list(normalized_set))
    
    print(f"Original: {len(lines)} items")
    print(f"Normalized: {len(sorted_list)} items")

    with open(output_path, 'w', encoding='utf-8') as f:
        for item in sorted_list:
            f.write(f"{item}\n")

    print(f"Saved to {output_path}")

if __name__ == "__main__":
    process()
