import { pool } from '../db/pool';

const MEAL_KEYWORDS: Record<string, string[]> = {
  breakfast: ['breakfast', 'morning'],
  lunch: ['lunch', 'afternoon'],
  dinner: ['dinner', 'night', 'supper'],
  snack: ['snack', 'tea time', 'evening snack'],
};

export function detectMealType(transcript: string): string {
  const lower = transcript.toLowerCase();
  for (const [meal, words] of Object.entries(MEAL_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return meal;
  }
  return 'lunch';
}

/** Extract likely food phrases from plain-text voice log. */
export function extractFoodPhrases(transcript: string): string[] {
  let text = transcript
    .toLowerCase()
    .replace(/^(i had|i ate|for|my|today|just|some)\s+/gi, '')
    .trim();

  const forMatch = text.match(/\bfor\s+(breakfast|lunch|dinner|snack)\s*$/i);
  if (forMatch) text = text.replace(/\bfor\s+(breakfast|lunch|dinner|snack)\s*$/i, '').trim();

  const parts = text
    .split(/\s+and\s+|,\s*|\s+with\s+/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);

  return parts.length > 0 ? parts : [text];
}

export async function parseTranscriptToFoodItems(
  transcript: string,
  userId: string
): Promise<{ name: string; quantity_g: number; meal_type: string; food_id?: string }[]> {
  const meal_type = detectMealType(transcript);
  const phrases = extractFoodPhrases(transcript);
  const items: { name: string; quantity_g: number; meal_type: string; food_id?: string }[] = [];

  for (const phrase of phrases) {
    const words = phrase.split(/\s+/).filter((w) => w.length >= 2);
    const searchTerms = [phrase, ...words];
    let result = { rows: [] as { id: string; name: string; serving_size_g: number }[] };

    for (const term of searchTerms) {
      const r = await pool.query(
        `SELECT id, name, serving_size_g FROM foods
         WHERE name ILIKE $1 OR name_local ILIKE $1 OR category ILIKE $1
         ORDER BY CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END, name LIMIT 1`,
        [`%${term}%`, `${term}%`]
      );
      if (r.rows.length > 0) {
        result = r;
        break;
      }
    }

    if (result.rows.length > 0) {
      const f = result.rows[0];
      items.push({
        name: f.name,
        quantity_g: Number(f.serving_size_g) || 150,
        meal_type,
        food_id: f.id,
      });
    } else {
      items.push({ name: phrase, quantity_g: 150, meal_type });
    }
  }

  return items;
}
