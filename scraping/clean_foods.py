import re

# Read the file
with open('food.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the first 100 foods (quoted, comma separated)
first_block = []
first_block_set = set()

for line in lines:
    if '"' in line:
        foods = re.findall(r'"([^"]+)"', line)
        for food in foods:
            norm = food.strip().lower()
            if norm not in first_block_set:
                first_block.append(food)
                first_block_set.add(norm)
        if len(first_block) >= 100:
            break

# Now, process the rest of the file, skipping foods already in first_block_set
seen = set(first_block_set)
out_lines = []

# Write the first block as is
in_first_block = True
for line in lines:
    if in_first_block and '"' in line:
        out_lines.append(line)
        if len(re.findall(r'"([^"]+)"', line)) > 0:
            # Check if this is the last line of the first block
            foods = re.findall(r'"([^"]+)"', line)
            if len(seen) >= 100:
                in_first_block = False
        continue
    if in_first_block and not line.strip():
        out_lines.append(line)
        continue
    # After first block, process each food line
    if not line.strip():
        out_lines.append(line)
        continue
    food = line.strip().lower()
    if not food:
        out_lines.append(line)
        continue
    if food.startswith('"'):
        # skip quoted lines after first block
        continue
    if food in seen:
        continue
    seen.add(food)
    out_lines.append(line)

with open('food_cleaned.txt', 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print('Done. Cleaned file written to food_cleaned.txt')
