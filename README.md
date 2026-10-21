# Reliable Calorie Tracker — Photo → Nutrition Prototype

Take a photo of a meal, get an itemized nutrition breakdown (kcal, protein, carbs, fat, fiber per item + totals). Built as a demo of the **"identification + portion estimation → database lookup"** pattern used by production apps like Cal AI / SnapCalorie — the vision model never invents calorie numbers; it only identifies food and estimates grams, and reproducible per-100g values come from a local food table.

---

## 1. What happens when you tap "Analyze"

```
┌──────────────┐   ┌────────────────────┐   ┌───────────────┐   ┌──────────────────┐
│ Camera /     │ → │ Preprocess: resize │ → │ Gemini 3.5    │ → │ Local food table │
│ Gallery pick │   │ ≤768px, JPEG q60   │   │ Flash-Lite    │   │ match (or model) │
└──────────────┘   └────────────────────┘   └───────────────┘   └────────┬─────────┘
        ImagePicker            ImageManipulator        strict JSON              │
                                                                        macro math × grams
                                                                                 │
                                                                        ┌────────▼─────────┐
                                                                        │ UI: totals + items,
                                                                        │ DB/AI tag + confidence
                                                                        └──────────────────┘
```

| Stage | Module | What it does | Why |
|---|---|---|---|
| Capture | `App.js` (`getImage()`) | `expo-image-picker` `launchCameraAsync` / `launchImageLibraryAsync` | one picker handles both capture and upload |
| Compress | `App.js` (`getImage()`) | resize to ≤768px width, JPEG quality 0.6, return base64 | Gemini bills images in 768×768 tiles — one tile ≈ **258 tokens** instead of thousands. Biggest cost lever. |
| Vision call | `src/api.js` (`callOnce`) | REST `POST /v1beta/models/gemini-3.5-flash-lite:generateContent`, `temperature: 0`, `responseMimeType: application/json` + `responseSchema`, **1 retry** on malformed JSON | forces a fixed output shape → parse never breaks; temp 0 + fixed prompt → same photo ≈ same result |
| Resolve | `src/api.js` (`matchDb`) | fuzzy-substring match of returned food name against `src/foodDb.js` names + aliases | **"resolution, not generation"**: model returns *food + grams*; your data supplies the macros |
| Compute | `src/api.js` (`scale`) | macros = per-100g values × grams/100 | arithmetic is done in code, not by the LLM, so it is auditable |
| Display | `App.js` | totals card + item cards; each item tagged **DB** (blue, table value) or **AI** (purple, model's own per-100g fallback) plus HIGH/MED/LOW confidence | tells you *where each number came from* |

## 2. The model

**`gemini-3.5-flash-lite`** via the public Gemini REST API (`generativelanguage.googleapis.com/v1beta`) — chosen after testing all four keys in `.env`: Gemini ✅ (cheapest vision tier), NVIDIA ✅ (kept as manual fallback), Groq key ⚠️ valid, Mistral ❌ 401.

Request contract:
- Input: ~258 image tokens + ~350-token prompt; Output: ~200 tokens of JSON ≈ **~800 tokens ≈ $0.0003/scan**
- Prompt rules: number of *distinct items*, estimate grams **relative to plate/cutlery/hands in frame — never a "typical serving"**, include cooking oil/gravy in weight, and supply per-100g nutrition only as a fallback
- Output schema (`responseSchema`, enforced): `{ items: [{ name, grams, k, p2, c2, f2, fb, conf }] }` — one entry per distinct food; `conf` ∈ HIGH/MEDIUM/LOW

Note: the app called `gemini-2.5-flash-lite` originally, but Google gated it for new users in 2026 (`404`), so `3.5-flash-lite` is the active model.

## 3. The local food table

`src/foodDb.js` — 47 curated foods (Indian staples + global common), each `{ name, aliases[], p: [kcal, protein, carbs, fat, fiber] per 100g }`, values approximated from USDA FoodData Central + IFCT 2017, as-cooked/as-served.

- Match → table values are used: **deterministic** (same photo → same numbers, the reproducibility guarantee)
- No match → the model's own per-100g values are used, clearly tagged `AI`
- Known weaknesses: naive substring matching (can false-match similar names), and coverage is a hand-curated starter set, not a database — production would ingest the full USDA/IFCT bulk data server-side

## 4. Tech stack

- **Expo SDK 57 / React Native 0.86 / React 19.2.3** — SDK 57 specifically because the Play Store Expo Go still ships SDK 57 (SDK 58's Expo Go isn't on the store yet); pinned in `package.json`
- **expo-image-picker** (capture + gallery), **expo-image-manipulator** (resize/compress/base64)
- No navigation, no state library, no server: single screen, all logic in two `src/` modules, direct client → Gemini calls (`EXPO_PUBLIC_GEMINI_API_KEY` is loaded from `.env` by Expo CLI and inlined into the JS bundle — fine for a prototype, never for release)

```
App.js            screen + capture/analyze flow + results UI
index.js          registerRootComponent entry
src/api.js        prompt, JSON schema, Gemini REST call, retry, DB match, macro math
src/foodDb.js     per-100g nutrition table (the deterministic ground layer)
.env              provider keys; EXPO_PUBLIC_GEMINI_API_KEY is the one the app reads
```

## 5. Run it

```bash
npm install
npm start        # Metro on :8081, prints a QR in an interactive terminal
```

On your phone: install **Expo Go**, device on the same Wi-Fi as the PC, scan the QR (or open `exp://<PC-IP>:8081` inside Expo Go). Press `a`/`i` in the terminal for emulator/simulator.

## 6. Limitations (v1, on purpose)

- Portions are model estimates — expect ±10–20% error; the confidence badge is honest about it. No user-editable grams yet.
- Accuracy for rare regional dishes depends on TABLE match — extend `foodDb.js` first; it's the cheapest accuracy lever.
- API key lives in the client bundle (prototype-only).
- `launchCameraAsync` on some Android phones depends on the native camera app; the gallery path always works.

## 7. Roadmap to production

1. Move the Gemini call server-side, ingest USDA bulk data + IFCT into a searchable index (replaces `foodDb.js` substring matching)
2. Editable portions → one-tap corrections → log them (they become your own labeled dataset — the moat)
3. Barcode → Open Food Facts for exact packaged-food data
4. Gate scans with a free tier / subscription (Cal AI model); consider depth-sensor (LiDAR) portion estimation as a premium accuracy path
