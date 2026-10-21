/**
 * Photo → nutrition: the vision model only identifies foods and estimates grams;
 * macros come from the local food table (deterministic) or, as a fallback, from
 * the model's own per-100g values. Ported from feat/photo-nutrition-scanner.
 */
import { FOOD_DB, type Food } from './food-db';

// shortcut: the key is inlined into the client bundle (prototype only) — proxy the Gemini call through the backend before release
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-3.5-flash-lite';

export const hasGeminiKey = !!API_KEY;

const PROMPT = `You are a nutrition vision model. Look at the meal photo and list every DISTINCT food item (one entry per distinct item, e.g. "rice", "chicken curry", "salad" - not "dinner").
For each item estimate:
- name: short item name
- grams: its estimated weight in grams. Judge size RELATIVE to plates, bowls, cutlery, hands or cups visible in the photo - NEVER assume a typical serving size. Include cooking oil/gravy in the weight.
- k, p2, c2, f2, fb: its per-100g nutrition (kcal, protein, carbs, fat, fiber) for the food AS SERVED, including cooking oil/marinade.
- conf: your confidence HIGH, MEDIUM or LOW.
If the photo contains no food, return items: []. Do not add commentary, no markdown.`;

// Short property names to minimize output tokens.
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          k: { type: 'NUMBER' },
          p2: { type: 'NUMBER' },
          c2: { type: 'NUMBER' },
          f2: { type: 'NUMBER' },
          fb: { type: 'NUMBER' },
          conf: { type: 'STRING', enum: ['HIGH', 'MEDIUM', 'LOW'] },
        },
        required: ['name', 'grams', 'k', 'p2', 'c2', 'f2', 'fb', 'conf'],
      },
    },
  },
  required: ['items'],
};

type ModelItem = {
  name: string;
  grams: number;
  k: number;
  p2: number;
  c2: number;
  f2: number;
  fb: number;
  conf: 'HIGH' | 'MEDIUM' | 'LOW';
};

type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

export type MealItem = Macros & {
  name: string;
  grams: number;
  confidence: ModelItem['conf'];
  source: 'DB' | 'AI';
};

export type MealResult = { items: MealItem[]; totals: Macros };

// deterministic lookup: exact name/alias first, else a keyword that covers most of the item name
// so "sliced steak with greens" is not logged as 55 kcal salad.
// shortcut: still string matching, not a food index — replace when the backend lands
function matchDb(name: string): Food | null {
  const needle = name.toLowerCase().trim();
  let best: { food: Food; length: number } | null = null;

  for (const food of FOOD_DB) {
    for (const key of [food.name, ...food.aliases]) {
      if (needle === key) return food;
      if (!needle.includes(key) && !key.includes(needle)) continue;

      const coverage = Math.min(key.length, needle.length) / Math.max(key.length, needle.length);
      if (coverage >= 0.5 && (!best || key.length > best.length)) best = { food, length: key.length };
    }
  }

  return best?.food ?? null;
}

function scale(per100: number[], grams: number): Macros {
  const m = grams / 100;
  const round1 = (value: number) => Math.round(value * 10) / 10;
  return {
    kcal: Math.round(per100[0] * m),
    protein: round1(per100[1] * m),
    carbs: round1(per100[2] * m),
    fat: round1(per100[3] * m),
    fiber: round1(per100[4] * m),
  };
}

async function callOnce(base64: string): Promise<{ items?: ModelItem[] }> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }],
        },
      ],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text).join('') || '';
  return JSON.parse(text);
}

export async function analyzeMeal(base64: string): Promise<MealResult> {
  if (!API_KEY) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY. Add it to frontend/.env and restart the dev server.');

  let json: { items?: ModelItem[] };
  try {
    json = await callOnce(base64);
  } catch (error) {
    if (error instanceof SyntaxError) json = await callOnce(base64); // one retry on malformed JSON
    else throw error;
  }

  // the model is not trusted to respect the schema: coerce every number and name
  const clean = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  };

  const rawItems = Array.isArray(json.items) ? json.items : [];
  const items: MealItem[] = rawItems.slice(0, 12).map((item) => {
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Food item';
    const grams = Math.min(Math.max(clean(item.grams), 1), 3000);
    const food = matchDb(name);
    const per100 = food ? food.per100 : [clean(item.k), clean(item.p2), clean(item.c2), clean(item.f2), clean(item.fb)];
    return {
      name,
      grams,
      confidence: item.conf === 'HIGH' || item.conf === 'LOW' ? item.conf : 'MEDIUM',
      source: food ? 'DB' : 'AI',
      ...scale(per100, grams),
    };
  });

  const totals = items.reduce<Macros>(
    (sum, item) => ({
      kcal: sum.kcal + item.kcal,
      protein: sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
      fiber: sum.fiber + item.fiber,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    items,
    totals: {
      kcal: Math.round(totals.kcal),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      fiber: Math.round(totals.fiber),
    },
  };
}
