#!/usr/bin/env python3
"""
Scrape Tarla Dalal calorie pages into CSV.

Why Selenium instead of requests?
The site is protected by Cloudflare and often returns 403 to plain HTTP
clients. A normal visible Chrome session via undetected_chromedriver works
reliably, while headless mode is more likely to be challenged.

Outputs:
- tarladalal_calories_links.csv
- tarladalal_calories_raw.jsonl
- tarladalal_calories_wide.csv
- tarladalal_calories_errors.csv
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

BASE_URL = "https://www.tarladalal.com/calories-in-indian-recipes/"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "output" / "tarladalal"
GENERIC_SERVING_TERMS = {
    "barfi",
    "bottle",
    "bowl",
    "chapatti",
    "chapati",
    "cup",
    "glass",
    "idli",
    "katori",
    "ladoo",
    "ladoo",
    "ladoo",
    "piece",
    "plate",
    "portion",
    "puri",
    "roti",
    "serving",
    "slice",
}


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
        description="Scrape Tarla Dalal calorie pages and export nutrition data to CSV."
    )
    parser.add_argument("--start-page", type=int, default=1, help="First list page to scrape.")
    parser.add_argument(
        "--end-page",
        type=int,
        default=None,
        help="Last list page to scrape. If omitted, the scraper detects it from page 1.",
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
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Folder for output files. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=None,
        help="Optional cap on number of recipe detail pages to scrape.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run headless. Note: the site is more likely to block headless sessions.",
    )
    parser.add_argument(
        "--restart-every",
        type=int,
        default=100,
        help="Restart the browser after this many newly scraped foods. Use 0 to disable.",
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
    if any(token in value for token in ("â€™", "â€“", "â€œ", "â€", "Ã", "â„¢")):
        with suppress(UnicodeEncodeError, UnicodeDecodeError):
            value = value.encode("latin-1").decode("utf-8")
    return re.sub(r"\s+", " ", value).strip()


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", normalize_space(text).lower())
    return slug.strip("_")


def clean_food_name_from_title(title: str) -> str:
    value = normalize_space(title)
    value = re.sub(r"^Calories in\s+", "", value, flags=re.I)
    value = re.sub(r"\|\s*Tarladalal\.com\s*$", "", value, flags=re.I)
    value = re.sub(r"\s+[–-]\s+Nutrition Facts.*$", "", value, flags=re.I)
    return value.strip(" -|")


def build_list_page_url(page_number: int) -> str:
    if page_number <= 1:
        return BASE_URL
    return f"{BASE_URL}?page={page_number}"


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


def get_total_pages(driver: uc.Chrome, timeout: int, delay: float) -> int:
    safe_get(
        driver=driver,
        url=BASE_URL,
        wait_css="ul.pagination, .recipe-list a[href*='/calories-for-']",
        timeout=timeout,
        pause_after=delay,
    )
    page_numbers = driver.execute_script(
        """
        return Array.from(document.querySelectorAll('ul.pagination a.page-link'))
          .map(a => (a.innerText || '').trim())
          .filter(Boolean);
        """
    )
    numeric_pages = [int(text) for text in page_numbers if text.isdigit()]
    return max(numeric_pages) if numeric_pages else 1


def collect_recipe_links(
    driver: uc.Chrome,
    start_page: int,
    end_page: int,
    timeout: int,
    delay: float,
    max_items: int | None = None,
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    recipes: list[dict[str, Any]] = []

    for page_number in range(start_page, end_page + 1):
        page_url = build_list_page_url(page_number)
        print(f"[info] Collecting links from page {page_number}/{end_page}: {page_url}")
        safe_get(
            driver=driver,
            url=page_url,
            wait_css=".recipe-list a[href*='/calories-for-']",
            timeout=timeout,
            pause_after=delay,
        )
        page_links = driver.execute_script(
            """
            const titleAnchors = Array.from(
              document.querySelectorAll('.recipe-list h5 a[href*="/calories-for-"]')
            );
            const imageAnchors = Array.from(
              document.querySelectorAll('.recipe-list .img-block a[href*="/calories-for-"]')
            );
            const byHref = new Map();
            for (const a of [...imageAnchors, ...titleAnchors]) {
              const href = a.href;
              if (!href) continue;
              const existing = byHref.get(href) || {
                recipe_url: href,
                list_title: ''
              };
              const text = (a.innerText || '').trim();
              if (text) {
                existing.list_title = text;
              }
              byHref.set(href, existing);
            }
            return Array.from(byHref.values());
            """
        )
        for item in page_links:
            recipe_url = item["recipe_url"]
            if recipe_url in seen:
                continue
            seen.add(recipe_url)
            recipes.append(
                {
                    "source_page_number": page_number,
                    "recipe_url": recipe_url,
                    "list_title": normalize_space(item.get("list_title", "")),
                }
            )
            if max_items is not None and len(recipes) >= max_items:
                return recipes
    return recipes


def parse_value_header(value_header: str) -> str:
    header = normalize_space(value_header)
    match = re.match(r"^Value(?:\s+per)?\s+(.+)$", header, flags=re.I)
    if match:
        return normalize_space(match.group(1))
    return ""


def looks_like_quantity(text: str) -> bool:
    return bool(re.search(r"\d", normalize_space(text)))


def extract_serving_weight_grams(paragraphs: list[str], serving_qty: str) -> tuple[str, str]:
    normalized_qty = normalize_space(serving_qty)
    if re.search(r"\b\d+(?:\.\d+)?\s*grams?\b", normalized_qty, flags=re.I):
        grams_text = re.search(
            r"\b\d+(?:\.\d+)?\s*grams?\b", normalized_qty, flags=re.I
        ).group(0)
        numeric_match = re.search(r"\d+(?:\.\d+)?", grams_text)
        return normalize_space(grams_text), numeric_match.group(0) if numeric_match else ""

    search_space = " ".join(paragraphs[:2])
    patterns = [
        r"\((\d+(?:\.\d+)?)\s*grams?\)",
        r"\b(\d+(?:\.\d+)?)\s*grams?\s+per\s+[A-Za-z][A-Za-z\s-]*",
    ]
    for pattern in patterns:
        match = re.search(pattern, search_space, flags=re.I)
        if match:
            numeric = match.group(1)
            return f"{numeric} grams", numeric
    return "", ""


def parse_serving_details(
    page_title: str,
    paragraphs: list[str],
    value_header: str,
) -> dict[str, str]:
    first_paragraph = paragraphs[0] if paragraphs else ""
    serving_phrase = ""
    serving_qty = ""
    serving_type = parse_value_header(value_header)
    food_name = ""

    match = re.search(
        r"^(?:One|1)\s+(.+?)\s*\(([^)]+)\)\s+(?:gives|contains|has)\b",
        first_paragraph,
        flags=re.I,
    )
    if match:
        serving_phrase = normalize_space(match.group(1))
        maybe_qty = normalize_space(match.group(2))
        if looks_like_quantity(maybe_qty):
            serving_qty = maybe_qty
        food_name = re.sub(r"\s*\([^)]*\)", "", serving_phrase).strip()
    else:
        match = re.search(
            r"^(?:One|1)\s+(.+?)\s+(?:gives|contains|has)\b",
            first_paragraph,
            flags=re.I,
        )
        if match:
            serving_phrase = normalize_space(match.group(1))
            phrase_lower = serving_phrase.lower()
            generic_prefix = next(
                (
                    term
                    for term in sorted(GENERIC_SERVING_TERMS, key=len, reverse=True)
                    if phrase_lower == term or phrase_lower.startswith(f"{term} of ")
                ),
                "",
            )
            if generic_prefix and not serving_type:
                serving_type = generic_prefix
            if generic_prefix and phrase_lower.startswith(f"{generic_prefix} of "):
                food_name = serving_phrase[len(generic_prefix) + 4 :].strip()
            elif not generic_prefix:
                food_name = serving_phrase

    if not food_name:
        food_name = clean_food_name_from_title(page_title)
    if food_name and food_name == food_name.lower():
        food_name = food_name.title()
    if not serving_type:
        serving_type = serving_phrase or ""
    if not serving_qty and serving_type:
        serving_qty = f"1 {serving_type}"

    yield_text = next(
        (paragraph for paragraph in paragraphs if "recipe makes" in paragraph.lower()),
        "",
    )
    serving_weight_grams, serving_weight_grams_numeric = extract_serving_weight_grams(
        paragraphs=paragraphs,
        serving_qty=serving_qty,
    )

    return {
        "food_name": normalize_space(food_name),
        "serving_type": normalize_space(serving_type),
        "serving_qty": normalize_space(serving_qty),
        "serving_weight_grams": normalize_space(serving_weight_grams),
        "serving_weight_grams_numeric": normalize_space(serving_weight_grams_numeric),
        "serving_phrase": normalize_space(serving_phrase),
        "yield_text": normalize_space(yield_text),
        "intro_paragraph_1": normalize_space(paragraphs[0]) if len(paragraphs) >= 1 else "",
        "intro_paragraph_2": normalize_space(paragraphs[1]) if len(paragraphs) >= 2 else "",
    }


def parse_nutrition_rows(rows: list[list[str]]) -> tuple[str, str, list[dict[str, str]]]:
    value_header = ""
    daily_value_header = ""
    current_section = ""
    nutrients: list[dict[str, str]] = []

    for raw_cells in rows:
        cells = [normalize_space(cell) for cell in raw_cells]
        if not any(cells):
            continue

        if len(cells) >= 3 and not cells[0] and cells[1]:
            value_header = cells[1]
            daily_value_header = cells[2]
            continue

        non_empty_cells = [cell for cell in cells if cell]
        if len(non_empty_cells) == 1 and non_empty_cells[0].upper() == non_empty_cells[0]:
            current_section = non_empty_cells[0]
            continue

        if len(cells) >= 3 and cells[0]:
            nutrients.append(
                {
                    "section": current_section,
                    "nutrient": cells[0],
                    "value": cells[1],
                    "daily_value_pct": cells[2],
                }
            )

    return value_header, daily_value_header, nutrients


def extract_detail_payload(
    driver: uc.Chrome,
    recipe_url: str,
    source_page_number: int,
    list_title: str,
    timeout: int,
    delay: float,
) -> dict[str, Any]:
    safe_get(
        driver=driver,
        url=recipe_url,
        wait_css="#aboutrecipe, #nvvalues table",
        timeout=timeout,
        pause_after=delay,
    )
    payload = driver.execute_script(
        """
        const title =
          document.querySelector('h1.rec-heading span, h1.rec-heading, h1')?.innerText?.trim() || '';
        const paragraphs = Array.from(document.querySelectorAll('#aboutrecipe > p'))
          .map(p => (p.innerText || '').replace(/\\u00a0/g, ' ').trim())
          .filter(Boolean);
        const rows = Array.from(document.querySelectorAll('#nvvalues table tr'))
          .map(tr => Array.from(tr.querySelectorAll('td'))
            .map(td => (td.innerText || '').replace(/\\u00a0/g, ' ').trim()));
        return { title, paragraphs, rows, currentUrl: window.location.href };
        """
    )

    page_title = normalize_space(payload.get("title", "")) or clean_food_name_from_title(list_title)
    paragraphs = [normalize_space(item) for item in payload.get("paragraphs", [])]
    rows = payload.get("rows", [])
    value_header, daily_value_header, nutrients = parse_nutrition_rows(rows)
    serving = parse_serving_details(page_title=page_title, paragraphs=paragraphs, value_header=value_header)

    wide_nutrients: dict[str, str] = {}
    for nutrient in nutrients:
        nutrient_key = slugify(nutrient["nutrient"])
        if not nutrient_key:
            continue
        wide_nutrients[f"{nutrient_key}_value"] = nutrient["value"]
        wide_nutrients[f"{nutrient_key}_daily_value_pct"] = nutrient["daily_value_pct"]

    return {
        "url": recipe_url,
        "final_url": normalize_space(payload.get("currentUrl", "")),
        "source_page_number": source_page_number,
        "list_title": list_title,
        "page_title": page_title,
        "table_value_header": normalize_space(value_header),
        "table_daily_value_header": normalize_space(daily_value_header),
        "nutrients": nutrients,
        "nutrient_count": len(nutrients),
        **serving,
        **wide_nutrients,
    }


def ensure_output_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def remove_if_exists(path: Path) -> None:
    with suppress(FileNotFoundError):
        path.unlink()


def load_processed_urls(raw_jsonl_path: Path) -> set[str]:
    processed: set[str] = set()
    if not raw_jsonl_path.exists():
        return processed
    with raw_jsonl_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            with suppress(json.JSONDecodeError):
                processed.add(json.loads(line).get("url", ""))
    return {url for url in processed if url}


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_links_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = ["source_page_number", "recipe_url", "list_title"]
    write_csv(path, rows, fieldnames)


def load_links_csv(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, Any]] = []
        for row in reader:
            source_page_number = row.get("source_page_number", "")
            with suppress(ValueError, TypeError):
                source_page_number = int(source_page_number)
            rows.append(
                {
                    "source_page_number": source_page_number,
                    "recipe_url": normalize_space(row.get("recipe_url", "")),
                    "list_title": normalize_space(row.get("list_title", "")),
                }
            )
    return [row for row in rows if row["recipe_url"]]


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


def write_wide_csv(path: Path, records: list[dict[str, Any]]) -> None:
    base_columns = [
        "food_name",
        "serving_type",
        "serving_qty",
        "serving_weight_grams",
        "serving_weight_grams_numeric",
        "serving_phrase",
        "table_value_header",
        "table_daily_value_header",
        "nutrient_count",
    ]
    excluded_columns = {
        "nutrients",
        "page_title",
        "list_title",
        "url",
        "final_url",
        "source_page_number",
        "yield_text",
        "intro_paragraph_1",
        "intro_paragraph_2",
    }

    dynamic_columns = sorted(
        {
            key
            for record in records
            for key in record
            if key not in set(base_columns) | excluded_columns
        }
    )
    fieldnames = base_columns + dynamic_columns
    rows = []
    for record in records:
        row = {key: record.get(key, "") for key in fieldnames}
        rows.append(row)
    write_csv(path, rows, fieldnames)


def write_errors_csv(path: Path, errors: list[dict[str, Any]]) -> None:
    if not errors:
        return
    fieldnames = ["source_page_number", "recipe_url", "error"]
    write_csv(path, errors, fieldnames)


def main() -> int:
    args = parse_args()
    ensure_output_dir(args.output_dir)

    links_csv_path = args.output_dir / "tarladalal_calories_links.csv"
    raw_jsonl_path = args.output_dir / "tarladalal_calories_raw.jsonl"
    wide_csv_path = args.output_dir / "tarladalal_calories_wide.csv"
    errors_csv_path = args.output_dir / "tarladalal_calories_errors.csv"

    if args.no_resume:
        for path in [links_csv_path, raw_jsonl_path, wide_csv_path, errors_csv_path]:
            remove_if_exists(path)

    driver: uc.Chrome | None = None
    errors: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = []

    try:
        driver = init_driver(headless=args.headless)
        detected_end_page = get_total_pages(driver, timeout=args.timeout, delay=args.delay)
        end_page = args.end_page or detected_end_page
        if args.start_page < 1:
            raise ValueError("--start-page must be >= 1")
        if end_page < args.start_page:
            raise ValueError("--end-page must be >= --start-page")

        print(f"[info] Total pages detected: {detected_end_page}")
        print(f"[info] Scraping page range: {args.start_page} -> {end_page}")
        print(f"[info] Output directory: {args.output_dir}")
        if args.headless:
            print("[warn] Headless mode is enabled. The site may block headless browsers.")

        if not args.no_resume and links_csv_path.exists():
            links = load_links_csv(links_csv_path)
            print(f"[info] Loaded {len(links)} recipe links from existing CSV: {links_csv_path}")
        else:
            links = collect_recipe_links(
                driver=driver,
                start_page=args.start_page,
                end_page=end_page,
                timeout=args.timeout,
                delay=args.delay,
                max_items=args.max_items,
            )
            write_links_csv(links_csv_path, links)
            print(f"[info] Collected {len(links)} recipe links.")

        processed_urls = set() if args.no_resume else load_processed_urls(raw_jsonl_path)
        records = [] if args.no_resume else load_jsonl_records(raw_jsonl_path)
        print(f"[info] Existing processed records: {len(processed_urls)}")
        if records:
            write_wide_csv(wide_csv_path, records)
        new_scrapes_this_run = 0

        for index, link in enumerate(links, start=1):
            recipe_url = link["recipe_url"]
            if recipe_url in processed_urls:
                print(f"[skip] {index}/{len(links)} already processed: {recipe_url}")
                continue

            if (
                args.restart_every > 0
                and new_scrapes_this_run > 0
                and new_scrapes_this_run % args.restart_every == 0
            ):
                print(
                    f"[info] Restarting browser after {new_scrapes_this_run} new foods "
                    f"to keep the session stable."
                )
                shutdown_driver(driver)
                driver = init_driver(headless=args.headless)

            print(f"[info] Scraping {index}/{len(links)}: {recipe_url}")
            attempts_for_food = 0
            while attempts_for_food < 2:
                attempts_for_food += 1
                try:
                    record = extract_detail_payload(
                        driver=driver,
                        recipe_url=recipe_url,
                        source_page_number=link["source_page_number"],
                        list_title=link["list_title"],
                        timeout=args.timeout,
                        delay=args.delay,
                    )
                    append_jsonl(raw_jsonl_path, record)
                    records.append(record)
                    write_wide_csv(wide_csv_path, records)
                    processed_urls.add(recipe_url)
                    new_scrapes_this_run += 1
                    print(
                        f"[info] Wide CSV updated with {len(records)} foods: "
                        f"{wide_csv_path}"
                    )
                    break
                except (TimeoutException, WebDriverException, RuntimeError, ValueError) as exc:
                    if is_dead_session_error(exc) and attempts_for_food < 2:
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
                            "source_page_number": link["source_page_number"],
                            "recipe_url": recipe_url,
                            "error": str(exc),
                        }
                    )
                    break

        write_wide_csv(wide_csv_path, records)
        write_errors_csv(errors_csv_path, errors)

        print(f"[done] Foods scraped: {len(records)}")
        print(f"[done] Wide CSV: {wide_csv_path}")
        print(f"[done] Raw JSONL: {raw_jsonl_path}")
        if errors:
            print(f"[done] Errors CSV: {errors_csv_path} ({len(errors)} failed URLs)")
        return 0
    finally:
        shutdown_driver(driver)


if __name__ == "__main__":
    sys.exit(main())
