import { pool } from './pool';
import { FOOD_CATALOG } from './foodCatalog';

/** Insert any catalog foods missing from DB (safe to run on every API start in dev). */
export async function ensureFoodCatalog(): Promise<number> {
  let added = 0;
  for (const food of FOOD_CATALOG) {
    const exists = await pool.query('SELECT id FROM foods WHERE name ILIKE $1 LIMIT 1', [food.name]);
    if (exists.rows.length > 0) continue;
    await pool.query(
      `INSERT INTO foods (name, name_local, category, calories, protein_g, carbs_g, fat_g, fiber_g,
        iron_mg, calcium_mg, potassium_mg, region, source, serving_size_g,
        is_vegetarian, is_vegan, is_gluten_free, cost_per_100g_inr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,100,$14,$15,$16,$17)`,
      [
        food.name,
        food.name_local ?? null,
        food.category,
        food.calories,
        food.protein_g,
        food.carbs_g,
        food.fat_g,
        food.fiber_g ?? null,
        food.iron_mg ?? null,
        food.calcium_mg ?? null,
        food.potassium_mg ?? null,
        food.region ?? 'Global',
        food.source ?? 'USDA',
        food.is_vegetarian ?? true,
        food.is_vegan ?? false,
        food.is_gluten_free ?? false,
        15,
      ]
    );
    added += 1;
  }
  return added;
}
