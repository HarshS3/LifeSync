#!/usr/bin/env python3
"""
MyFitnessPal Food Nutrition Scraper
Scrapes nutrition facts for a list of foods from MyFitnessPal.com
"""

import time
import pandas as pd
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import undetected_chromedriver as uc

# ======================== CONFIGURATION ========================
# EDIT THIS LIST - Add the foods you want to scrape
FOOD_LIST = [
    # "Toor dal", "Moong dal", "Chana dal", "Masoor dal", "Rajma",
    # "Chole", "Whole moong", "Urad dal", "White basmati rice", "Brown rice",
    # "Wheat roti", "Multigrain roti", "Plain paratha", "Aloo paratha", "Jowar roti",
    # "Bajra roti", "Poha", "Upma", "Idli", "Plain dosa",
    # "Masala dosa", "Uttapam", "Cooked oats", "White bread slice", "Brown bread slice",
    # "Thepla", "Aloo sabzi", "Palak", "Bhindi", "Baingan",
    # "Gobhi", "Gajar", "Matar", "Lauki", "Turai",
    # "Mixed sabzi", "Whole milk", "Curd", "Paneer", "Paneer curry",
    # "Buttermilk", "Ghee", "Boiled egg", "Egg omelette", "Egg bhurji",
    # "Chicken curry", "Grilled chicken breast", "Chicken tikka", "Mutton curry", "Fish curry",
    # "Fried fish", "Canned tuna", "Prawn curry", "Dal chawal", "Veg biryani",
    # "Chicken biryani", "Khichdi", "Curd rice", "Veg pulao", "Veg fried rice",
    # "Samosa", "Vada pav", "Pav bhaji", "Bhel puri", "Dhokla",
    # "Veg momos", "Pakora", "Marie biscuit", "Banana", "Apple",
    # "Mango", "Papaya", "Guava", "Watermelon", "Orange",
    # "Pomegranate", "Chai", "Black coffee", "Coffee with milk", "Sweet lassi",
    # "Coconut water", "Protein shake", "Nimbu pani", "Fruit juice", "Almonds",
    # "Walnuts", "Peanuts",     "Pumpkin seeds", "Flaxseeds", "Cashews",
    # "Whey protein", "Peanut butter", "Maggi noodles", "Soya chunks", "Paneer butter masala",
    # "Dal makhani", "Naan", "Raita", "Pickle", "Dark chocolate"

]

# Credentials for MyFitnessPal
# Replace these with your actual login details
MFP_EMAIL = "dharadshah111@gmail.com"
MFP_PASSWORD = "1234567890"

# You can also load from a file:
import re
FOOD_LIST = []
try:
    with open('food_cleaned.txt', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            quoted = re.findall(r'"([^"]+)"', line)
            if quoted:
                FOOD_LIST.extend([q.strip() for q in quoted])
            else:
                food_item = line.strip('", ')
                if food_item:
                    FOOD_LIST.append(food_item)

    # Deduplicate preserving order
    seen_foods = set()
    FOOD_LIST = [food for food in FOOD_LIST if food and not (food in seen_foods or seen_foods.add(food))]
except FileNotFoundError:
    print("food_cleaned.txt not found. Falling back to default FOOD_LIST.")



# ======================== LOGIN FUNCTION ========================
def login_to_myfitnesspal(driver):
    """
    Log into MyFitnessPal to bypass restricted access to the calorie chart.
    """
    print("\nNavigating to login page...")
    driver.get("https://www.myfitnesspal.com/account/login")
    wait = WebDriverWait(driver, 15)
    
    # Handle cookie consent banners if they appear
    try:
        print("Waiting for potential cookie banners...")
        time.sleep(3)
        
        # Check if the banner is in an iframe (like the SP Consent Message shown in the screenshot)
        iframes = driver.find_elements(By.XPATH, "//iframe[contains(@id, 'sp_message_iframe')] | //iframe[contains(@title, 'SP Consent')] | //iframe[contains(@src, 'privacy-mgmt.com')]")
        if iframes:
            print("  Found cookie consent iframe, switching context...")
            driver.switch_to.frame(iframes[0])
            
            # Try to find OK/Accept button inside iframe
            cookie_btn = driver.find_element(By.XPATH, "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'ok')] | //button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept')]")
            if cookie_btn:
                print("  Clicking cookie accept button in iframe...")
                cookie_btn.click()
                time.sleep(1)
            
            driver.switch_to.default_content()
            time.sleep(1)
        else:
            # Try multiple common cookie accept button texts/classes in main document
            cookie_btn = driver.find_element(By.XPATH, "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept')] | //button[contains(text(), 'AGREE')] | //button[contains(text(), 'Got it')] | //button[normalize-space(text())='OK'] | //button[@id='onetrust-accept-btn-handler']")
            if cookie_btn:
                print("  Clicking cookie accept button...")
                cookie_btn.click()
                time.sleep(1)
    except Exception as e:
        # No cookie banner found or could not click it, that's perfectly fine
        print("  Cookie banner handling skipped or not needed.")
        try:
            driver.switch_to.default_content()
        except:
            pass
        
    try:
        print(f"Logging in with email: {MFP_EMAIL}")
        # Wait for the email input field
        email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email'], input[type='email'], #email")))
        email_input.clear()
        email_input.send_keys(MFP_EMAIL)
        
        # Enter password
        pass_input = driver.find_element(By.CSS_SELECTOR, "input[name='password'], input[type='password'], #password")
        pass_input.clear()
        pass_input.send_keys(MFP_PASSWORD)
        
        # Click login button using explicitly simulated Javascript click
        # This completely ignores if a modal is in the way or covering the button
        login_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        driver.execute_script("arguments[0].click();", login_btn)
        
        # Wait for login to process and give time for CAPTCHA
        print("Waiting for login to complete (please solve any CAPTCHA if presented)...")
        wait_login = WebDriverWait(driver, 120) # Wait up to 180 seconds (3 minutes)
        try:
            wait_login.until(lambda d: "login" not in d.current_url.lower())
            print("  ✓ Login attempt finished successfully.")
            time.sleep(3) # Small buffer after URL changes
        except Exception:
            print("  ⚠️ Timeout waiting for login. The script will try to continue anyway.")
    except Exception as e:
        print(f"  ✗ Automated login failed: {e}")
        print("  ⚠️ Please log in manually in the browser window.")
        print("  Waiting 60 seconds before continuing...")
        time.sleep(60)

# ======================== SCRAPING FUNCTION ========================
def scrape_food_nutrition(driver, food_name: str) -> dict:
    """
    Search for a food on MyFitnessPal and return its nutrition data.
    """
    wait = WebDriverWait(driver, 15)
    
    # Go directly to the search results page for the given food
    search_url = f"https://www.myfitnesspal.com/food/calorie-chart-nutrition-facts/{food_name.replace(' ', '%20')}"
    print(f"  Navigating to search URL: {search_url}")
    driver.get(search_url)
    time.sleep(5) # Wait for "Matching Foods" list to populate
    
    try:
        print("  Looking for the first search result...")
        # Since clicking React items fails, we will grab the href link directly 
        # from the search results and navigate to it via driver.get() instead of clicking
        first_result_url = None
        
        try:
            # Make sure we wait for whatever items are populating
            time.sleep(2)
            # Try to grab all matching urls. Sometimes they change exactly where it sits.
            links = driver.find_elements(By.XPATH, "//a[contains(@href, '/food/calories/')]")
            if links:
                first_result_url = links[0].get_attribute("href")
        except Exception:
            pass

        if first_result_url:
            print(f"  Navigating directly to result URL: {first_result_url}")
            driver.get(first_result_url)
            time.sleep(5)
        else:
            # Revert to standard waiting click if explicit url scraping misses something
            print("  Falling back to explicit JS click...")
            try:
                # Find the wrapper that holds the first search result. We target the text "Matching Foods" and grab the first clickable div/link under it.
                first_result = wait.until(EC.presence_of_element_located((By.XPATH, "(//p[contains(text(), 'Matching Foods')] | //h2[contains(text(), 'Matching Foods')] | //div[contains(text(), 'Matching Foods')])/parent::div/following-sibling::div//a[contains(@href, '/food/calories/')] | (//*[@data-testid='qa-regression-food-description']/ancestor::a)[1] | (//*[@data-testid='qa-regression-food-description']/ancestor::div[@tabindex='0'])[1] | (//div[contains(text(), 'Matching Foods')]/following-sibling::div//*[@tabindex='0'])[1]")))
                
                # Check if it has an href!
                href = first_result.get_attribute("href")
                if href and "/food/calories/" in href:
                    print(f"  Found hidden href in fallback, directly navigating to: {href}")
                    driver.get(href)
                else:
                    print("  No href found on element. Attempting JavaScript generic click...")
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", first_result)
                    time.sleep(1)
                    
                    # Sometimes the click needs to be on a child element
                    try:
                        child_to_click = first_result.find_element(By.XPATH, ".//*[contains(@class, 'MuiTypography')] | .//p")
                        driver.execute_script("arguments[0].click();", child_to_click)
                    except:
                        driver.execute_script("arguments[0].click();", first_result)
                        
                time.sleep(5)
            except Exception as e:
                print(f"  Warning: Could not click on search results for {food_name}. Error: {e}")
                return {"Food name": food_name, "Error": "Could not find matching food layout"}
    except Exception as e:
        print(f"  Warning: Could not click on search results for {food_name}. Error: {e}")
        return {"Food name": food_name, "Error": "Could not find matching food"}
    
    # Extract nutrition facts
    nutrition_facts = {}
    
    try:
        print("  Extracting nutrition facts...")
        # Wait explicitly for the energy value to load on the new page
        try:
            wait.until(EC.presence_of_element_located((By.XPATH, "//*[@data-testid='qa-regression-energy-value']")))
        except Exception:
            time.sleep(3) # Fallback wait if it's lagging

        # Extract the matched food name from the page
        try:
            matched_name_element = driver.find_element(By.XPATH, "//*[contains(text(), 'Nutrition Facts')]/following-sibling::span | //span[contains(@class, 'MuiTypography-Body/Bold/MD')]")
            nutrition_facts["Matched Food Name"] = matched_name_element.text.strip()
        except:
            nutrition_facts["Matched Food Name"] = "N/A"

        # Extract Serving Quantity (e.g. "1")
        try:
            qty_input = driver.find_element(By.XPATH, "//*[@data-testid='qa-regression-servings-input-field']")
            nutrition_facts["Serving Qty"] = qty_input.get_attribute("value").strip()
        except:
            nutrition_facts["Serving Qty"] = "N/A"

        # Extract Serving Size (e.g. '1 medium (3" dia)')
        try:
            size_select = driver.find_element(By.XPATH, "//*[@role='combobox' and contains(@class, 'MuiSelect-select')]")
            nutrition_facts["Serving Size"] = size_select.text.strip()
        except:
            nutrition_facts["Serving Size"] = "N/A"

        # We will extract values directly using their specific data-testids
        nutrient_map = {
            "qa-regression-energy": "Calories",
            "qa-regression-total-fat": "Total Fat",
            "qa-regression-saturated": "Saturated",
            "qa-regression-polyunsaturated": "Polyunsaturated",
            "qa-regression-monounsaturated": "Monounsaturated",
            "qa-regression-trans": "Trans",
            "qa-regression-cholesterol": "Cholesterol",
            "qa-regression-sodium": "Sodium",
            "qa-regression-potassium": "Potassium",
            "qa-regression-total-carbs": "Total Carbs",
            "qa-regression-dietary-fiber": "Dietary Fiber",
            "qa-regression-sugars": "Sugars",
            "qa-regression-protein": "Protein",
            "qa-regression-vitamin-a": "Vitamin A",
            "qa-regression-vitamin-c": "Vitamin C",
            "qa-regression-calcium": "Calcium",
            "qa-regression-iron": "Iron"
        }
        
        for test_id, label in nutrient_map.items():
            try:
                # Look for the exact element containing the value
                value_element = driver.find_element(By.XPATH, f"//*[@data-testid='{test_id}-value']")
                if value_element:
                    nutrition_facts[label] = value_element.text.strip()
            except Exception:
                pass # Silently skip if a nutrient is not found

    except Exception as e:
        print(f"  Warning: {e}")
    
    # Save what we searched for vs what was found
    nutrition_facts["Search Term"] = food_name
    
    # Reorder keys to put Search Term and Matched Food Name first
    ordered_facts = {"Search Term": food_name}
    if "Matched Food Name" in nutrition_facts:
        ordered_facts["Matched Food Name"] = nutrition_facts.pop("Matched Food Name")
    # Add the rest
    for k, v in nutrition_facts.items():
        if k != "Search Term" and k != "Food name": # Remove old "Food name" key just in case
            ordered_facts[k] = v
            
    return ordered_facts

import os

# ======================== MAIN ========================
def main():
    print("=" * 60)
    print("MyFitnessPal Food Nutrition Scraper")
    print("=" * 60)
    
    csv_file = "myfitnesspal_nutrition_data.csv"
    existing_foods = set()
    if os.path.exists(csv_file):
        try:
            df_existing = pd.read_csv(csv_file)
            if 'Search Term' in df_existing.columns:
                existing_foods = set(df_existing['Search Term'].dropna().tolist())
                print(f"Found {len(existing_foods)} already scraped foods in CSV.")
        except Exception as e:
            print(f"Could not read existing CSV: {e}")
            
    remaining_foods = [f for f in FOOD_LIST if f not in existing_foods]
    
    print(f"\nRemaining foods to scrape: {len(remaining_foods)}")
    if not remaining_foods:
        print("All foods scraped!")
        return
        
    for i, food in enumerate(remaining_foods, 1):
        print(f"  {i}. {food}")
    
    print("\nStarting Chrome browser...")
    options = uc.ChromeOptions()
    # options.add_argument("--start-maximized")
    # Uncomment to run headless (no visible browser):
    # options.add_argument("--headless")
    
    driver = uc.Chrome(options=options)
    driver.maximize_window()
    
    login_to_myfitnesspal(driver)
    
    for idx, food in enumerate(remaining_foods, 1):
        print(f"\n[{idx}/{len(remaining_foods)}] Scraping: {food}")
        try:
            data = scrape_food_nutrition(driver, food)
            extracted_nutrient_count = len(data) - 1
            print(f"  ✓ Extracted {extracted_nutrient_count} nutrient values")
            
            # Save immediately to CSV
            df_single = pd.DataFrame([data])
            # If line is mostly empty (e.g., only Search Term and 2 missing entries), we might want to flag it or retry, 
            # but we save it here so it's not lost.
            write_header = not os.path.exists(csv_file)
            df_single.to_csv(csv_file, mode='a', header=write_header, index=False)
            
            if extracted_nutrient_count < 5:
                print("  ⚠️ Warning: Very few nutrients extracted. It likely missed the result.")
                
        except Exception as e:
            print(f"  ✗ Failed: {e}")
            err_msg = str(e).lower()
            if "invalid session" in err_msg or "window already closed" in err_msg or "not reachable" in err_msg:
                print("  🔄 Browser session lost. Restarting browser...")
                try: driver.quit()
                except: pass
                driver = uc.Chrome(options=options)
                driver.maximize_window()
                login_to_myfitnesspal(driver)
            # df_fail = pd.DataFrame([{"Search Term": food, "Error": str(e)}])
            # write_header = not os.path.exists(csv_file)
            # df_fail.to_csv(csv_file, mode='a', header=write_header, index=False)
            
    try: driver.quit()
    except: pass
    print("\n✅ Scraping session complete!")

if __name__ == "__main__":
    import sys
    import json
    if len(sys.argv) > 1:
        query = sys.argv[1]
        options = uc.ChromeOptions()
        options.add_argument("--headless")
        driver = uc.Chrome(options=options)
        try:
            login_to_myfitnesspal(driver)
            search_url = f"https://www.myfitnesspal.com/food/calorie-chart-nutrition-facts/{query.replace(' ', '%20')}"
            driver.get(search_url)
            time.sleep(5)
            links = driver.find_elements(By.XPATH, "//a[contains(@href, '/food/calories/')]")
            results = []
            seen = set()
            for link in links:
                href = link.get_attribute("href")
                text = link.text.strip()
                if href and href not in seen and len(results) < 5:
                    seen.add(href)
                    results.append({
                        "id": href.split('/')[-1],
                        "displayName": text,
                        "href": href,
                        "isLinkOnly": True
                    })
            print(json.dumps(results))
            sys.stdout.flush()
        finally:
            driver.quit()
    else:
        main()