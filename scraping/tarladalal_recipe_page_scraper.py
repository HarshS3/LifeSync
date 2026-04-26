#!/usr/bin/env python3
"""
Scrape Tarla Dalal recipe pages using the already collected calorie-page links.

This scraper does not modify the existing calorie scrape outputs. It reads the
calorie links CSV as input, derives the corresponding recipe URL, and writes
its own recipe-page outputs.

Outputs:
- tarladalal_recipe_links.csv
- tarladalal_recipe_raw.jsonl
- tarladalal_recipe_wide.csv
- tarladalal_recipe_ingredients_long.csv
- tarladalal_recipe_errors.csv
"""

from __future__ import annotations

import argparse
import csv
import gc
import json
import os
import re
import subprocess
import sys
import time
from contextlib import suppress
from pathlib import Path
from typing import Any

import undetected_chromedriver as uc
from selenium.common.exceptions import (
    InvalidSessionIdException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

DEFAULT_LINKS_CSV = (
    Path(__file__).resolve().parent / "output" / "tarladalal_full" / "tarladalal_calories_links.csv"
)
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "output" / "tarladalal_recipe_pages"


def _patch_uc_del() -> None:
    original_del = getattr(uc.Chrome, "__del__", None)
    if original_del is None or getattr(uc.Chrome, "_lifesync_del_patched", False):
        return

    def _safe_del(self: uc.Chrome) -> None:
        with suppress(Exception):
            original_del(self)

    uc.Chrome.__del__ = _safe_del  # type: ignore[method-assign]
    uc.Chrome._lifesync_del_patched = True  # type: ignore[attr-defined]


_patch_uc_del()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Tarla Dalal recipe pages using the existing calories links CSV."
    )
    parser.add_argument(
        "--links-csv",
        type=Path,
        default=DEFAULT_LINKS_CSV,
        help=f"Input calorie links CSV. Default: {DEFAULT_LINKS_CSV}",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Folder for output files. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.5,
        help="Delay in seconds between requests.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=45,
        help="Page wait timeout in seconds.",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=None,
        help="Optional cap on number of recipe pages to scrape.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run headless. Note: the site is more likely to block headless sessions.",
    )
    parser.add_argument(
        "--restart-every",
        type=int,
        default=75,
        help="Restart the browser after this many newly scraped recipes. Use 0 to disable.",
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        help="Start fresh instead of reusing prior raw/error files.",
    )
    return parser.parse_args()


def normalize_space(text: str | None) -> str:
    if not text:
        return ""
    value = text.replace("\xa0", " ")
    if any(token in value for token in ("Ã¢â‚¬â„¢", "Ã¢â‚¬â€œ", "Ã¢â‚¬Å“", "Ã¢â‚¬", "Ãƒ", "Ã¢â€žÂ¢")):
        with suppress(UnicodeEncodeError, UnicodeDecodeError):
            value = value.encode("latin-1").decode("utf-8")
    return re.sub(r"\s+", " ", value).strip()


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", normalize_space(text).lower())
    return slug.strip("_")


def get_local_chrome_path() -> Path | None:
    candidates = [
        Path(os.environ.get("PROGRAMFILES", "")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)", "")) / "Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Google/Chrome/Application/chrome.exe",
    ]
    for chrome_path in candidates:
        if chrome_path.exists():
            return chrome_path
    return None


def detect_local_chrome_major_version() -> int | None:
    chrome_path = get_local_chrome_path()
    if chrome_path is None:
        return None
    try:
        completed = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"(Get-Item '{chrome_path}').VersionInfo.ProductVersion",
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        version_text = normalize_space(completed.stdout or completed.stderr)
        match = re.search(r"(\d+)\.\d+\.\d+\.\d+", version_text)
        if match:
            return int(match.group(1))
    except Exception:
        pass
    return None


def init_driver(headless: bool) -> uc.Chrome:
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1600,1200")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--disable-blink-features=AutomationControlled")
    if headless:
        options.add_argument("--headless=new")
    chrome_path = get_local_chrome_path()
    version_main = detect_local_chrome_major_version()
    if chrome_path:
        print(f"[info] Using Chrome executable: {chrome_path}")
    if version_main:
        print(f"[info] Using local Chrome major version for driver: {version_main}")
    driver = uc.Chrome(
        options=options,
        use_subprocess=True,
        version_main=version_main,
        browser_executable_path=str(chrome_path) if chrome_path else None,
        patcher_force_close=True,
    )
    driver.set_page_load_timeout(120)
    return driver


def shutdown_driver(driver: uc.Chrome | None) -> None:
    if driver is None:
        return
    with suppress(Exception):
        driver.quit()
    try:
        del driver
    except Exception:
        pass
    gc.collect()


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def remove_if_exists(path: Path) -> None:
    with suppress(FileNotFoundError):
        path.unlink()


def is_cloudflare_page(driver: uc.Chrome) -> bool:
    title = normalize_space(driver.title).lower()
    page_source = driver.page_source.lower()
    return "cloudflare" in title or "attention required" in title or "cf-error" in page_source


def is_dead_session_error(exc: Exception) -> bool:
    message = normalize_space(str(exc)).lower()
    return (
        isinstance(exc, InvalidSessionIdException)
        or "invalid session id" in message
        or "not connected to devtools" in message
        or "disconnected" in message
    )


def safe_get(
    driver: uc.Chrome,
    url: str,
    wait_css: str,
    timeout: int,
    pause_after: float,
    retries: int = 3,
) -> None:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            driver.get(url)
            WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, wait_css))
            )
            if is_cloudflare_page(driver):
                raise RuntimeError("Cloudflare challenge page detected.")
            if pause_after > 0:
                time.sleep(pause_after)
            return
        except Exception as exc:  # noqa: BLE001
            if is_dead_session_error(exc):
                raise
            last_error = exc
            backoff = min(10, attempt * 3)
            print(
                f"[warn] Attempt {attempt}/{retries} failed for {url}: {exc}. "
                f"Retrying in {backoff}s..."
            )
            time.sleep(backoff)
    if last_error is None:
        raise RuntimeError(f"Could not load {url}")
    raise last_error


def derive_recipe_url(calories_url: str) -> str:
    clean = calories_url.split("#", 1)[0].rstrip("/")
    return clean.replace("/calories-for-", "/") + "r"


def load_calorie_links(path: Path, max_items: int | None = None) -> list[dict[str, Any]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, Any]] = []
        for row in reader:
            calories_url = normalize_space(row.get("recipe_url", ""))
            if not calories_url:
                continue
            source_page_number = row.get("source_page_number", "")
            with suppress(TypeError, ValueError):
                source_page_number = int(source_page_number)
            rows.append(
                {
                    "source_page_number": source_page_number,
                    "calories_url": calories_url,
                    "recipe_url": derive_recipe_url(calories_url),
                    "list_title": normalize_space(row.get("list_title", "")),
                }
            )
            if max_items is not None and len(rows) >= max_items:
                break
    return rows


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_recipe_links_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = ["source_page_number", "calories_url", "recipe_url", "list_title"]
    write_csv(path, rows, fieldnames)


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def load_jsonl_records(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if not path.exists():
        return records
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            with suppress(json.JSONDecodeError):
                records.append(json.loads(line))
    return records


def load_processed_calories_urls(raw_jsonl_path: Path) -> set[str]:
    return {
        normalize_space(record.get("calories_url", "")).lower()
        for record in load_jsonl_records(raw_jsonl_path)
        if normalize_space(record.get("calories_url", ""))
    }


def flatten_ingredient_rows(record: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in record.get("ingredients", []):
        rows.append(
            {
                "food_name": record.get("food_name", ""),
                "recipe_title": record.get("recipe_title", ""),
                "recipe_url": record.get("recipe_url", ""),
                "calories_url": record.get("calories_url", ""),
                "section": item.get("section", ""),
                "ingredient_text": item.get("ingredient_text", ""),
                "ingredient_name": item.get("ingredient_name", ""),
                "amount_text": item.get("amount_text", ""),
                "ingredient_glossary_url": item.get("ingredient_glossary_url", ""),
            }
        )
    return rows


def append_ingredients_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    fieldnames = [
        "food_name",
        "recipe_title",
        "recipe_url",
        "calories_url",
        "section",
        "ingredient_text",
        "ingredient_name",
        "amount_text",
        "ingredient_glossary_url",
    ]
    write_header = not path.exists()
    with path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerows(rows)


def rebuild_ingredients_csv(path: Path, records: list[dict[str, Any]]) -> None:
    rows: list[dict[str, Any]] = []
    for record in records:
        rows.extend(flatten_ingredient_rows(record))
    fieldnames = [
        "food_name",
        "recipe_title",
        "recipe_url",
        "calories_url",
        "section",
        "ingredient_text",
        "ingredient_name",
        "amount_text",
        "ingredient_glossary_url",
    ]
    write_csv(path, rows, fieldnames)


def write_wide_csv(path: Path, records: list[dict[str, Any]]) -> None:
    base_columns = [
        "food_name",
        "recipe_title",
        "recipe_url",
        "calories_url",
        "source_page_number",
        "ingredient_count",
        "ingredient_sections",
        "serving_label",
        "nutrient_heading",
    ]
    excluded_columns = {"ingredients", "nutrients"}
    dynamic_columns = sorted(
        {
            key
            for record in records
            for key in record
            if key not in set(base_columns) | excluded_columns
        }
    )
    fieldnames = base_columns + dynamic_columns
    rows = [{key: record.get(key, "") for key in fieldnames} for record in records]
    write_csv(path, rows, fieldnames)


def write_errors_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    fieldnames = ["source_page_number", "calories_url", "recipe_url", "error"]
    write_csv(path, rows, fieldnames)


def parse_nutrient_rows(rows: list[list[str]]) -> tuple[str, dict[str, str]]:
    nutrient_heading = ""
    nutrient_values: dict[str, str] = {}
    for cells in rows:
        cleaned = [normalize_space(cell) for cell in cells if normalize_space(cell)]
        if not cleaned:
            continue
        if len(cleaned) == 1 and "nutrient values" in cleaned[0].lower():
            nutrient_heading = cleaned[0]
            continue
        if len(cleaned) == 2:
            nutrient_values[f"{slugify(cleaned[0])}_value"] = cleaned[1]
    return nutrient_heading, nutrient_values


def extract_recipe_payload(
    driver: uc.Chrome,
    item: dict[str, Any],
    timeout: int,
    delay: float,
) -> dict[str, Any]:
    safe_get(
        driver=driver,
        url=item["recipe_url"],
        wait_css="h1",
        timeout=timeout,
        pause_after=delay,
    )
    payload = driver.execute_script(
        """
        const title =
          document.querySelector('h1')?.innerText?.trim() || '';
        const ingredientsRoot = document.querySelector('#ingredients');
        const ingredients = [];
        if (ingredientsRoot) {
          let currentSection = '';
          for (const child of Array.from(ingredientsRoot.children)) {
            if (child.tagName === 'H4') {
              currentSection = (child.innerText || '').trim();
              continue;
            }
            if (child.tagName === 'UL') {
              for (const li of Array.from(child.querySelectorAll(':scope > li'))) {
                const text = (li.innerText || '').replace(/\\u00a0/g, ' ').trim();
                if (!text) continue;
                const link = li.querySelector('a');
                const ingredientName = (link?.innerText || '').replace(/\\u00a0/g, ' ').trim();
                let amountText = text;
                if (ingredientName) {
                  amountText = amountText.replace(ingredientName, '').trim();
                }
                ingredients.push({
                  section: currentSection,
                  ingredient_text: text,
                  ingredient_name: ingredientName,
                  amount_text: amountText,
                  ingredient_glossary_url: link ? link.href : ''
                });
              }
            }
          }
        }

        const nutrientHeadingEl = Array.from(document.querySelectorAll('h5, h4, h6'))
          .find(el => (el.innerText || '').toLowerCase().includes('nutrient values'));
        const nutrientHeading = nutrientHeadingEl ? (nutrientHeadingEl.innerText || '').trim() : '';
        let nutrientRows = [];
        const expectedLabels = new Set([
          'energy', 'protein', 'carbohydrates', 'fiber', 'fat', 'cholesterol', 'sodium'
        ]);
        let bestTable = null;
        let bestScore = -1;
        for (const table of Array.from(document.querySelectorAll('table'))) {
          const rows = Array.from(table.querySelectorAll('tr'))
            .map(tr => Array.from(tr.querySelectorAll('td'))
              .map(td => (td.innerText || '').replace(/\\u00a0/g, ' ').trim()))
            .filter(r => r.length >= 2);
          let score = 0;
          for (const row of rows) {
            const label = (row[0] || '').toLowerCase();
            if (expectedLabels.has(label)) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            bestTable = table;
          }
        }
        if (bestTable && bestScore > 0) {
          nutrientRows = Array.from(bestTable.querySelectorAll('tr'))
            .map(tr => Array.from(tr.querySelectorAll('td'))
              .map(td => (td.innerText || '').replace(/\\u00a0/g, ' ').trim()));
        }
        return {
          recipe_title: title,
          recipe_url: window.location.href,
          ingredients,
          nutrientHeading,
          nutrientRows
        };
        """
    )
    ingredients = payload.get("ingredients", [])
    nutrient_heading, nutrient_values = parse_nutrient_rows(
        payload.get("nutrientRows", [])
    )
    ingredient_sections = sorted(
        {normalize_space(item.get("section", "")) for item in ingredients if normalize_space(item.get("section", ""))}
    )

    recipe_title = normalize_space(payload.get("recipe_title", ""))
    food_name = re.sub(r"\s+Recipe\b.*$", "", recipe_title, flags=re.I).strip() or recipe_title

    return {
        "food_name": food_name,
        "recipe_title": recipe_title,
        "recipe_url": normalize_space(payload.get("recipe_url", item["recipe_url"])),
        "calories_url": item["calories_url"],
        "source_page_number": item["source_page_number"],
        "ingredient_count": len(ingredients),
        "ingredient_sections": " | ".join(ingredient_sections),
        "serving_label": re.sub(
            r"^Nutrient values(?:\s*\(Abbrv\))?\s*per\s*",
            "",
            normalize_space(payload.get("nutrientHeading", "")),
            flags=re.I,
        ),
        "nutrient_heading": nutrient_heading or normalize_space(payload.get("nutrientHeading", "")),
        "ingredients": ingredients,
        "nutrients": nutrient_values,
        **nutrient_values,
    }


def main() -> int:
    args = parse_args()
    ensure_output_dir(args.output_dir)

    if not args.links_csv.exists():
        raise FileNotFoundError(f"Links CSV not found: {args.links_csv}")

    recipe_links_csv_path = args.output_dir / "tarladalal_recipe_links.csv"
    raw_jsonl_path = args.output_dir / "tarladalal_recipe_raw.jsonl"
    wide_csv_path = args.output_dir / "tarladalal_recipe_wide.csv"
    ingredients_csv_path = args.output_dir / "tarladalal_recipe_ingredients_long.csv"
    errors_csv_path = args.output_dir / "tarladalal_recipe_errors.csv"

    if args.no_resume:
        for path in [
            recipe_links_csv_path,
            raw_jsonl_path,
            wide_csv_path,
            ingredients_csv_path,
            errors_csv_path,
        ]:
            remove_if_exists(path)

    recipe_links = load_calorie_links(args.links_csv, max_items=args.max_items)
    write_recipe_links_csv(recipe_links_csv_path, recipe_links)
    print(f"[info] Loaded {len(recipe_links)} recipe targets from {args.links_csv}")

    processed_calories_urls = set() if args.no_resume else load_processed_calories_urls(raw_jsonl_path)
    records = [] if args.no_resume else load_jsonl_records(raw_jsonl_path)
    if records:
        write_wide_csv(wide_csv_path, records)
        if not ingredients_csv_path.exists():
            rebuild_ingredients_csv(ingredients_csv_path, records)

    driver: uc.Chrome | None = None
    errors: list[dict[str, Any]] = []
    new_scrapes_this_run = 0

    try:
        driver = init_driver(headless=args.headless)
        for index, item in enumerate(recipe_links, start=1):
            calories_url = item["calories_url"]
            recipe_url = item["recipe_url"]
            if calories_url.lower() in processed_calories_urls:
                print(f"[skip] {index}/{len(recipe_links)} already processed: {calories_url}")
                continue

            if (
                args.restart_every > 0
                and new_scrapes_this_run > 0
                and new_scrapes_this_run % args.restart_every == 0
            ):
                print(
                    f"[info] Restarting browser after {new_scrapes_this_run} new recipes "
                    f"to keep the session stable."
                )
                shutdown_driver(driver)
                driver = init_driver(headless=args.headless)

            print(f"[info] Scraping {index}/{len(recipe_links)}: {recipe_url}")
            attempts_for_recipe = 0
            while attempts_for_recipe < 2:
                attempts_for_recipe += 1
                try:
                    record = extract_recipe_payload(
                        driver=driver,
                        item=item,
                        timeout=args.timeout,
                        delay=args.delay,
                    )
                    append_jsonl(raw_jsonl_path, record)
                    append_ingredients_csv(ingredients_csv_path, flatten_ingredient_rows(record))
                    records.append(record)
                    write_wide_csv(wide_csv_path, records)
                    processed_calories_urls.add(calories_url)
                    new_scrapes_this_run += 1
                    print(
                        f"[info] Recipe CSV updated with {len(records)} recipes: "
                        f"{wide_csv_path}"
                    )
                    break
                except (TimeoutException, WebDriverException, RuntimeError, ValueError) as exc:
                    if is_dead_session_error(exc) and attempts_for_recipe < 2:
                        print(
                            f"[warn] Browser session died while scraping {recipe_url}. "
                            f"Recreating browser and retrying once."
                        )
                        shutdown_driver(driver)
                        driver = init_driver(headless=args.headless)
                        continue
                    print(f"[error] Failed to scrape {recipe_url}: {exc}")
                    errors.append(
                        {
                            "source_page_number": item["source_page_number"],
                            "calories_url": item["calories_url"],
                            "recipe_url": recipe_url,
                            "error": str(exc),
                        }
                    )
                    break

        write_wide_csv(wide_csv_path, records)
        write_errors_csv(errors_csv_path, errors)

        print(f"[done] Recipes scraped: {len(records)}")
        print(f"[done] Wide CSV: {wide_csv_path}")
        print(f"[done] Ingredients CSV: {ingredients_csv_path}")
        print(f"[done] Raw JSONL: {raw_jsonl_path}")
        if errors:
            print(f"[done] Errors CSV: {errors_csv_path} ({len(errors)} failed URLs)")
        return 0
    finally:
        shutdown_driver(driver)


if __name__ == "__main__":
    sys.exit(main())
