import sys
import json
import time
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Use credentials from 1.py
MFP_EMAIL = "dharadshah111@gmail.com"
MFP_PASSWORD = "1234567890"

def get_mfp_results(query):
    print(f"DEBUG: Starting search for {query}", file=sys.stderr)
    options = uc.ChromeOptions()
    options.add_argument("--headless")
    driver = uc.Chrome(options=options)
    
    try:
        # Login
        print("DEBUG: Navigating to login", file=sys.stderr)
        driver.get("https://www.myfitnesspal.com/account/login")
        wait = WebDriverWait(driver, 15)
        
        # Simple login (skipping complex cookie handling for speed)
        print("DEBUG: Entering credentials", file=sys.stderr)
        email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']")))
        email_input.send_keys(MFP_EMAIL)
        pass_input = driver.find_element(By.CSS_SELECTOR, "input[name='password']")
        pass_input.send_keys(MFP_PASSWORD)
        
        login_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        driver.execute_script("arguments[0].click();", login_btn)
        
        # Wait for login
        print("DEBUG: Waiting for login completion", file=sys.stderr)
        time.sleep(10)
        
        # Search
        print(f"DEBUG: Navigating to search URL for {query}", file=sys.stderr)
        search_url = f"https://www.myfitnesspal.com/food/calorie-chart-nutrition-facts/{query.replace(' ', '%20')}"
        driver.get(search_url)
        time.sleep(5)
        
        print("DEBUG: Extracting links", file=sys.stderr)
        results = []
        links = driver.find_elements(By.XPATH, "//a[contains(@href, '/food/calories/')]")
        print(f"DEBUG: Found {len(links)} candidate links", file=sys.stderr)
        
        seen = set()
        for link in links:
            try:
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
            except:
                continue
        
        print(f"DEBUG: Returning {len(results)} results", file=sys.stderr)
        return results
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}", file=sys.stderr)
        raise e
    finally:
        driver.quit()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)
        
    query = sys.argv[1]
    try:
        res = get_mfp_results(query)
        print(json.dumps(res))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.stdout.flush()
