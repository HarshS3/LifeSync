import re
import os

input_path = r'd:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\unique_ingredients.txt'
output_path = r'd:\Projects\LifeSync\scraping\output\tarladalal_recipe_full\base_ingredients.txt'

# Regex for quantities and units at the start
QTY_PATTERN = re.compile(r'^[\d\s\.\-/¼½¾]+(cups?|tbsp|tsp|grams?|g|ml|litres?|scoops?|slices?|segments?|diameter|mm|inch|portion|portions|lb|oz|cm)?[\s\.]*', re.IGNORECASE)

# Keywords to remove (state, preparation, meta-info, descriptors)
PREP_KEYWORDS = [
    'chopped', 'sliced', 'slices', 'slice', 'blanched', 'boiled', 'mashed', 'crushed', 'peeled', 
    'grated', 'parboiled', 'pureed', 'cooked', 'leftover', 'whisked', 'beaten', 
    'whipped', 'melted', 'toasted', 'fried', 'roasted', 'soaked', 'drained', 
    'cleaned', 'washed', 'cubes', 'cube', 'juliennes', 'roundels', 'wedges', 'wedge', 'strips', 'strip',
    'halves', 'quarters', 'florets', 'floret', 'stalks', 'stalk', 'peels', 'skins', 'sticks', 'stick',
    'rings', 'ring', 'chunks', 'chunk', 'pieces', 'piece', 'mixture', 'refer', 'handy', 'tip', 'recipe', 
    'below', 'above', 'diagonally', 'cut', 'thinly', 'thickly', 'finely', 
    'roughly', 'fresh', 'freshly', 'dried', 'dry', 'whole', 'half', 'full', 'large', 
    'small', 'medium', 'and', 'with', 'for', 'serving', 'to serve', 'approx', 
    'about', 'approx.', 'diameter', 'swirls', 'strip', 'swirl', 'size',
    'big', 'long', 'short', 'round', 'square', 'packed', 'loose', 'tightly',
    'grating', 'shredded', 'slivered', 'slivers', 'sliver', 'pounded', 'broken', 'deseeded', 'seeded',
    'green', 'red', 'yellow', 'white', 'black', 'brown', 'purple', 'dessert', 'cooking',
    'into', 'given', 'see', 'refer', 'above', 'below', 'plus', 'extra', 'optional',
    'basic', 'healthy', 'homemade', 'low', 'fat', 'calorie', 'style', 'type', 'quality',
    'badam', 'hing', 'rajgira', 'kele', 'patta', 'jau', 'saunf', 'vilayati', 'dahi', 'curds',
    'karela', 'suran', 'shakarkand', 'bhopla', 'kaddu', 'makai', 'kaju', 'adrak', 'lehsun',
    'chilled', 'unsweetened', 'sweetened', 'salted', 'unsalted', 'organic', 'canned', 'frozen', 'tinned'
]

# Keywords that define a PRODUCT form - removing these gets you the "base" ingredient
FORM_KEYWORDS = [
    'juice', 'vinegar', 'oil', 'butter', 'milk', 'paste', 'powder', 'powdered', 'syrup', 
    'essence', 'extract', 'sauce', 'jam', 'chutney', 'pickle', 'seeds', 'seed', 'leaves', 'leaf',
    'flour', 'sprouts', 'sprout', 'gravy', 'stock', 'dip', 'batter', 'dough', 'chips', 'chip',
    'noodles', 'noodle', 'pasta', 'biscuits', 'biscuit', 'cookies', 'cookie', 'cake', 'icing', 'glaze', 
    'praline', 'barfi', 'pulp', 'liquid', 'water', 'concentrate',
    'cream', 'curd', 'curds', 'dahi', 'batter', 'bhajia', 'subzi', 
    'curry', 'masala', 'truffle', 'dressing', 'spread', 'rolls', 'buns', 
    'bread', 'loaf', 'toast', 'croutons', 'crumbs', 'base', 'jelly', 
    'crystals', 'tastemaker', 'beater', 'flakes', 'cider', 'zest', 'puree',
    'rind', 'sprinkles', 'topping', 'filling', 'glaze', 'syrup', 'reduction',
    'wedges', 'wedge', 'slivers', 'sliver', 'florets', 'floret', 'spears', 'spear',
    'rotis', 'roti', 'muthias', 'muthia', 'bhakris', 'bhakri', 'chapatis', 'chapati',
    'puris', 'puri', 'papadis', 'papadi', 'papdi', 'papdis', 'sev', 'bhujia', 'bhujiya', 'crush'
]

def remove_parenthesis(text):
    # First remove content inside balanced brackets/parens
    for _ in range(3):
        text = re.sub(r'\[[^\]]*\]', ' ', text)
        text = re.sub(r'\{[^\}]*\}', ' ', text)
        text = re.sub(r'\([^()]*\)', ' ', text)
    # THEN clean up any stray brackets
    text = text.replace('(', ' ').replace(')', ' ').replace('[', ' ').replace(']', ' ').replace('{', ' ').replace('}', ' ')
    return text

def singularize(word):
    # Standard common cases
    mapping = {
        'potatoes': 'potato', 'tomatoes': 'tomato', 'chillies': 'chilli', 
        'onions': 'onion', 'apples': 'apple', 'bananas': 'banana', 
        'carrots': 'carrot', 'eggs': 'egg', 'walnuts': 'walnut', 
        'almonds': 'almond', 'grapes': 'grape', 'cherries': 'cherry', 
        'dates': 'date', 'biscuits': 'biscuit', 'cookies': 'cookie', 
        'apricots': 'apricot', 'peaches': 'peach', 'pears': 'pear',
        'strawberries': 'strawberry', 'blueberries': 'blueberry',
        'olives': 'olive', 'peanuts': 'peanut', 'cashews': 'cashew',
        'seeds': 'seed', 'leaves': 'leaf', 'sprouts': 'sprout', 'lentils': 'lentil',
        'beans': 'bean', 'peas': 'pea', 'noodles': 'noodle', 'chips': 'chip'
    }
    return mapping.get(word, word)

def normalize_to_base(name):
    name = name.lower().strip()
    
    # 1. Remove all content in parenthesis
    name = remove_parenthesis(name)
    
    # 2. Remove leading quantities and units
    name = QTY_PATTERN.sub('', name.strip())
    
    # 3. Remove any remaining numbers and units anywhere (e.g., "100g", "50ml")
    name = re.sub(r'\b\d+[\s\d\.\-/¼½¾]*\s*(grams?|g|ml|litres?|kg|lb|oz|cm|inch|mm|cups?|tbsp|tsp|scoops?|slices?|portions?|packets?|nos?)\b', ' ', name)
    name = re.sub(r'\b\d+[\d\s\.\-/¼½¾]*\b', ' ', name)
    
    # 4. Remove prep keywords
    for kw in PREP_KEYWORDS:
        name = re.sub(r'\b' + re.escape(kw) + r'\b', ' ', name)
    
    # 5. Remove form keywords (Aggressive "Base" extraction)
    # We do this twice to catch things like "apple juice concentrate"
    for _ in range(2):
        for kw in FORM_KEYWORDS:
            name = re.sub(r'\b' + re.escape(kw) + r'\b', ' ', name)
    
    # 6. Cleanup punctuation
    name = name.replace(',', ' ').replace('"', '').replace("'", "").replace('/', ' ')
    name = ' '.join(name.split())
    name = name.strip(' .-')
    
    # 7. Singularize and filter
    words = name.split()
    words = [singularize(w) for w in words]
    
    # Remove common filler words
    fillers = ['or', 'of', 'in', 'ka', 'ki', 'ni', 'ke', 'the', 'approx', 'a', 'an', 'some', 'any']
    words = [w for w in words if w not in fillers]
    
    name = ' '.join(words)
    
    # Special overrides for "Base" logic
    # If it contains "apple", and it's not just "apple", we might want to keep it simple
    # but for now, the keyword removal handles "juice", "cider", "swirls".
    
    return name

def process():
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    base_set = set()
    for line in lines:
        clean = normalize_to_base(line.strip())
        if clean and len(clean) > 2: # Ignore very short strings
            base_set.add(clean)

    sorted_list = sorted(list(base_set))
    
    print(f"Original items: {len(lines)}")
    print(f"Base Ingredients found: {len(sorted_list)}")

    with open(output_path, 'w', encoding='utf-8') as f:
        for item in sorted_list:
            f.write(f"{item}\n")

    print(f"Saved to {output_path}")

if __name__ == "__main__":
    process()
