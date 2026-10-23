"""Meal-photo analysis. A faithful Python port of the frontend feature on branch
feat/photo-nutrition-scanner (src/api.js + src/foodDb.js): same prompt, same Gemini schema,
same FOOD_DB matching, same "1 retry on malformed JSON" behaviour — so results match what
the client used to produce."""

import base64
import json
from collections import namedtuple
from typing import Any, Final

import httpx

from .config import settings

Food = namedtuple("Food", ["name", "aliases", "per100"])  # per100: [kcal, protein_g, carbs_g, fat_g, fiber_g]

MAX_ITEMS = 12
MIN_GRAMS, MAX_GRAMS = 1, 3000
GEMINI_TIMEOUT = 60.0

MAX_BYTES = 5 * 1024 * 1024  # decoded image cap, matches the media upload endpoint


class ImageError(ValueError):
    """Raised for undecodable/non-image inputs starting with 'data:image/...;base64,'."""


class GeminiError(RuntimeError):
    """Raised for anything the analysis service returns that cannot be turned into results."""


# Per-100g nutrition: [kcal, protein_g, carbs_g, fat_g, fiber_g]
# Cooked/as-served values, approximated from USDA FoodData Central + IFCT 2017.
# Matched items use these (deterministic); unmatched items fall back to the model's own per-100g.
FOOD_DB: Final = [
    Food("cooked white rice", ["rice", "steamed rice"], [130, 2.7, 28, 0.3, 0.4]),
    Food("roti / chapati", ["roti", "chapati", "flatbread", "phulka"], [280, 10, 46, 5, 4]),
    Food("paratha", ["parantha"], [326, 8, 44, 13, 3.5]),
    Food(
        "dal / lentil curry",
        ["dal", "daal", "lentils", "sambar", "rasam", "rajma", "chhole", "chana masala", "beans curry"],
        [116, 9, 16, 1.5, 6],
    ),
    Food("biryani", ["biryani", "pulao", "pilaf"], [200, 8, 30, 6, 2]),
    Food("idli", ["idlis"], [130, 4.2, 25, 1, 1]),
    Food("dosa", ["masala dosa", "plain dosa"], [168, 4, 30, 4, 1]),
    Food("poha", ["flattened rice"], [130, 2.5, 27, 2, 1.5]),
    Food("upma", ["rava upma"], [153, 3.5, 27, 4, 2]),
    Food("samosa", ["samosas"], [308, 5, 32, 18, 2]),
    Food("paneer curry / paneer", ["paneer", "paneer butter masala", "palak paneer", "shahi paneer"], [225, 14, 8, 16, 2]),
    Food("curd / yogurt", ["curd", "yogurt", "dahi", "raita"], [60, 3.5, 5, 3.5, 0]),
    Food("milk", ["milk"], [64, 3.3, 5, 3.3, 0]),
    Food("gulab jamun", ["gulab jamun", "gulabjamun"], [375, 4, 45, 19, 0]),
    Food("kheer / payasam", ["kheer", "payasam", "rice pudding"], [130, 3, 25, 2.5, 0.3]),
    Food("laddoo", ["laddoo", "laddu", "besan ladoo"], [420, 8, 48, 23, 0.5]),
    Food("cooked chicken breast", ["chicken breast", "grilled chicken", "tandoori chicken", "boiled chicken"], [165, 31, 0, 3.6, 0]),
    Food(
        "chicken curry / thigh",
        ["chicken curry", "butter chicken", "chicken tikka masala", "chicken thigh", "fried chicken", "chicken wings", "murger"],
        [209, 26, 3, 11, 0.5],
    ),
    Food("mutton / lamb curry", ["mutton", "lamb", "goat curry"], [244, 20, 3, 17, 0.3]),
    Food("fish cooked", ["fish", "salmon", "tilapia", "pomfret", "rohu", "sardine", "tuna"], [206, 22, 0, 12, 0]),
    Food("prawns / shrimp", ["prawn", "shrimp"], [99, 24, 0.2, 0.3, 0]),
    Food("boiled egg", ["egg", "boiled egg", "poached egg"], [155, 13, 1.1, 11, 0]),
    Food("omelette / fried egg", ["omelette", "omlet", "fried egg", "egg bhurji", "scrambled egg"], [196, 13, 1, 15, 0]),
    Food("tofu", ["tofu"], [145, 16, 3, 8, 1]),
    Food("bread (white)", ["bread", "toast", "white bread"], [265, 9, 49, 3.2, 2.7]),
    Food("bread (brown/whole wheat)", ["brown bread", "whole wheat bread", "multigrain"], [250, 10, 45, 3.5, 6]),
    Food("oats cooked", ["oats", "oatmeal", "porridge"], [71, 2.5, 12, 1.5, 1]),
    Food("corn flakes", ["cornflakes", "cereal"], [357, 8, 84, 1, 4]),
    Food("banana", ["banana"], [89, 1.1, 23, 0.3, 2.6]),
    Food("apple", ["apple"], [52, 0.3, 14, 0.2, 2.4]),
    Food("orange", ["orange"], [47, 0.9, 12, 0.1, 2.4]),
    Food("mango", ["mango"], [60, 0.8, 15, 0.4, 1.6]),
    Food("grapes", ["grape"], [69, 0.7, 18, 0.2, 0.9]),
    Food("papaya", ["papaya"], [43, 0.5, 11, 0.3, 1.7]),
    Food("watermelon", ["watermelon"], [30, 0.6, 8, 0.2, 0.4]),
    Food("pizza", ["pizza"], [280, 12, 34, 11, 2]),
    Food("burger", ["burger", "cheeseburger"], [250, 13, 30, 10, 1.5]),
    Food("french fries", ["fries", "chips", "potato wedges"], [312, 3.4, 41, 15, 3.8]),
    Food("pasta cooked / macaroni", ["pasta", "macaroni", "penne", "spaghetti", "noodles", "chowmein", "maggi"], [190, 7, 31, 4, 2]),
    Food("sandwich", ["sandwich"], [250, 10, 28, 11, 3]),
    Food("salad / greens", ["salad", "lettuce", "spinach", "greens", "cucumber", "tomato", "carrot", "cabbage"], [25, 1.5, 4, 0.3, 1.8]),
    Food("broccoli / cauliflower", ["broccoli", "cauliflower", "gobhi"], [35, 2.4, 7, 0.4, 3.3]),
    Food("soup (vegetable)", ["soup"], [35, 2, 6, 0.8, 1.5]),
    Food("tea with milk & sugar", ["tea", "chai"], [63, 1.5, 9, 2.2, 0]),
    Food("coffee with milk & sugar", ["coffee", "latte", "cappuccino"], [55, 1.5, 8, 1.8, 0]),
    Food("soft drink / juice", ["cola", "soda", "soft drink", "juice", "pepsi", "mango juice"], [45, 0.1, 11, 0, 0]),
    Food(
        "sweets / dessert (misc)",
        ["jalebi", "halwa", "barfi", "cake", "pastry", "ice cream", "chocolate", "cookie", "biscuit", "donut", "gulab"],
        [400, 4, 50, 21, 1],
    ),
]

# Exactly the prompt used by the frontend feature (wording affects estimates — do not edit casually).
PROMPT = """You are a nutrition vision model. Look at the meal photo and list every DISTINCT food item (one entry per distinct item, e.g. "rice", "chicken curry", "salad" - not "dinner").
For each item estimate:
- name: short item name
- grams: its estimated weight in grams. Judge size RELATIVE to plates, bowls, cutlery, hands or cups visible in the photo - NEVER assume a typical serving size. Include cooking oil/gravy in the weight.
- k, p2, c2, f2, fb: its per-100g nutrition (kcal, protein, carbs, fat, fiber) for the food AS SERVED, including cooking oil/marinade.
- conf: your confidence HIGH, MEDIUM or LOW.
If the photo contains no food, return items: []. Do not add commentary, no markdown."""

# Short property names to minimize output tokens.
SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING"},
                    "grams": {"type": "NUMBER"},
                    "k": {"type": "NUMBER"},
                    "p2": {"type": "NUMBER"},
                    "c2": {"type": "NUMBER"},
                    "f2": {"type": "NUMBER"},
                    "fb": {"type": "NUMBER"},
                    "conf": {"type": "STRING", "enum": ["HIGH", "MEDIUM", "LOW"]},
                },
                "required": ["name", "grams", "k", "p2", "c2", "f2", "fb", "conf"],
            },
        },
    },
    "required": ["items"],
}


# deterministic lookup: best-coverage substring match (port of the TS matcher in
# frontend/src/features/nutrition/scanner.ts) — longest overlapping key wins, so
# "chicken biryani" resolves to chicken, not biryani.
def match_db(name: str) -> Food | None:
    s = name.lower().strip()
    best: tuple[Food, int] | None = None
    for food in FOOD_DB:
        for key in (food.name, *food.aliases):
            if s == key:
                return food
            if s not in key and key not in s:
                continue
            coverage = min(len(key), len(s)) / max(len(key), len(s))
            if coverage >= 0.5 and (best is None or len(key) > best[1]):
                best = (food, len(key))
    return best[0] if best else None


def scale(per100: list[float], grams: float) -> dict[str, float | int]:
    multiplier = grams / 100
    return {
        "kcal": round(per100[0] * multiplier),
        "protein": round(per100[1] * multiplier * 10) / 10,
        "carbs": round(per100[2] * multiplier * 10) / 10,
        "fat": round(per100[3] * multiplier * 10) / 10,
        "fiber": round(per100[4] * multiplier * 10) / 10,
    }


def decode_image(b64: str) -> tuple[bytes, str]:
    """Decode base64 (also accepts the  data:image/...;base64,  prefix) → (bytes, mime)."""
    raw = b64.strip()
    mime = "image/jpeg"
    if raw.startswith("data:"):
        header, sep, raw = raw.partition(",")
        if not sep:
            raise ImageError("Malformed data URL")
        if "image/png" in header:
            mime = "image/png"
    try:
        data = base64.b64decode(raw + "=" * (-len(raw) % 4), validate=True)
    except (ValueError, TypeError) as exc:
        raise ImageError("photo must be valid base64") from exc
    if not data:
        raise ImageError("Empty image")
    if len(data) > MAX_BYTES:
        raise ImageError("Image must be 5 MB or smaller")
    if data.startswith(b"\x89PNG"):
        mime = "image/png"
    elif not data.startswith(b"\xff\xd8\xff"):
        raise ImageError("Only JPEG or PNG meal photos are accepted")
    return data, mime


def _call_once(data: bytes, mime: str) -> dict:
    res = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
        params={"key": settings.gemini_api_key},
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": PROMPT}, {"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json", "responseSchema": SCHEMA},
        },
        timeout=GEMINI_TIMEOUT,
    )
    try:
        payload = res.json()
    except ValueError as exc:
        raise GeminiError(f"Analysis service returned HTTP {res.status_code}") from exc
    if not isinstance(payload, dict):
        raise GeminiError(f"Analysis service returned HTTP {res.status_code}")
    if not res.is_success:
        error = payload.get("error")
        message = error.get("message") if isinstance(error, dict) else None
        raise GeminiError(message or f"Analysis service returned HTTP {res.status_code}")
    candidates = payload.get("candidates") or []
    if not candidates:
        # safety-blocked or empty response: there is no candidate[0] to read
        blocked = (payload.get("promptFeedback") or {}).get("blockReason")
        raise GeminiError(f"the photo was rejected by the analysis service ({blocked})" if blocked else "the analysis service returned no result")
    text = "".join(part.get("text", "") for part in (candidates[0].get("content", {}).get("parts") or []))
    try:
        parsed = json.loads(text)
    except ValueError as exc:
        raise GeminiError("Analysis service returned malformed JSON") from exc
    if not isinstance(parsed, dict):
        raise GeminiError("Analysis service returned malformed JSON")
    return parsed


def _num(value: Any) -> float:
    """External model fields are untrusted: one bad value must not 500 the whole scan."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def analyze_meal(b64: str) -> dict:
    """Full flow, same output shape as the original frontend analyzeMeal:
    {items: [{name, grams, conf, source, n:{kcal, protein, carbs, fat, fiber}}], totals:{...}}"""
    data, mime = decode_image(b64)
    try:
        payload = _call_once(data, mime)
    except GeminiError as first_error:
        if "malformed JSON" in str(first_error):
            payload = _call_once(data, mime)  # 1 retry on malformed JSON (same as the JS flow)
        else:
            raise
    raw_items = payload.get("items") or []
    if not isinstance(raw_items, list):
        raise GeminiError("Analysis service returned malformed JSON")
    items = []
    for entry in raw_items[:MAX_ITEMS]:
        if not isinstance(entry, dict):
            continue
        grams = min(max(_num(entry.get("grams")), MIN_GRAMS), MAX_GRAMS)
        name = str(entry.get("name") or "")[:80]
        food = match_db(name)
        per100 = (
            food.per100
            if food
            else [max(_num(entry.get(key)), 0.0) for key in ("k", "p2", "c2", "f2", "fb")]
        )
        items.append(
            {
                "name": name,
                "grams": grams,
                "conf": str(entry.get("conf") or "LOW"),
                "source": "DB" if food else "AI",
                "n": scale(per100, grams),
            }
        )
    totals: dict[str, float | int] = {
        key: round(sum(item["n"][key] for item in items)) for key in ("kcal", "protein", "carbs", "fat", "fiber")
    }
    return {"items": items, "totals": totals}
