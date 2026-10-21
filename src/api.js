import { FOOD_DB } from './foodDb';

const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-3.5-flash-lite';

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

// deterministic lookup: item name vs db names + aliases, substring either direction
function matchDb(name) {
  const s = name.toLowerCase().trim();
  for (const food of FOOD_DB) {
    const keys = [food.n, ...food.a];
    if (keys.some((kk) => s.includes(kk) || kk.includes(s))) return food;
  }
  return null;
}

function scale(per100, grams) {
  const m = grams / 100;
  return {
    kcal: Math.round(per100[0] * m),
    protein: Math.round(per100[1] * m * 10) / 10,
    carbs: Math.round(per100[2] * m * 10) / 10,
    fat: Math.round(per100[3] * m * 10) / 10,
    fiber: Math.round(per100[4] * m * 10) / 10,
  };
}

async function callOnce(base64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: PROMPT },
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        ]}],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return JSON.parse(text);
}

export async function analyzeMeal(base64) {
  let json;
  try {
    json = await callOnce(base64);
  } catch (e) {
    if (e instanceof SyntaxError) json = await callOnce(base64); // 1 retry on malformed JSON
    else throw e;
  }
  const items = (json.items || []).slice(0, 12).map((it) => {
    const g = Math.min(Math.max(Number(it.grams) || 0, 1), 3000);
    const db = matchDb(it.name);
    const per100 = db ? db.p : [it.k, it.p2, it.c2, it.f2, it.fb];
    return {
      name: it.name,
      grams: g,
      conf: it.conf,
      source: db ? 'DB' : 'AI',
      n: scale(per100, g),
    };
  });
  const totals = items.reduce(
    (t, x) => ({
      kcal: t.kcal + x.n.kcal,
      protein: t.protein + x.n.protein,
      carbs: t.carbs + x.n.carbs,
      fat: t.fat + x.n.fat,
      fiber: t.fiber + x.n.fiber,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
  totals.kcal = Math.round(totals.kcal);
  totals.protein = Math.round(totals.protein);
  totals.carbs = Math.round(totals.carbs);
  totals.fat = Math.round(totals.fat);
  totals.fiber = Math.round(totals.fiber);
  return { items, totals };
}
