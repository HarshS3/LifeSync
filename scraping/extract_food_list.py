#!/usr/bin/env python3
"""
Helper script to extract all food names from food_cleaned.txt and update 1.py FOOD_LIST.
"""
import re

with open('food_cleaned.txt', 'r', encoding='utf-8') as f:
    foods = []
    for line in f:
        line = line.strip()
        if not line:
            continue
        # Extract quoted foods
        quoted = re.findall(r'"([^"]+)"', line)
        if quoted:
            foods.extend([q.strip() for q in quoted])
        else:
            foods.append(line)

# Remove empty and deduplicate while preserving order
seen = set()
cleaned = []
for food in foods:
    if food and food not in seen:
        cleaned.append(food)
        seen.add(food)

# Print as Python list for 1.py
print('FOOD_LIST = [')
for food in cleaned:
    print(f'    "{food}",')
print(']')
