import { pool } from '../db/pool';

type MealEntry = { name: string; calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number };

/** Create simple recipe rows from an active meal plan so the Recipe Library is populated. */
export async function syncRecipesFromMealPlan(
  userId: string,
  planJson: { days?: Record<string, { meals?: Record<string, MealEntry> }> }
): Promise<number> {
  const days = planJson?.days || {};
  const seen = new Set<string>();
  let count = 0;

  for (const dayData of Object.values(days)) {
    const meals = dayData?.meals || {};
    for (const meal of Object.values(meals)) {
      if (!meal?.name || seen.has(meal.name)) continue;
      seen.add(meal.name);

      const existing = await pool.query('SELECT id FROM recipes WHERE food_name ILIKE $1 LIMIT 1', [
        meal.name,
      ]);
      if (existing.rows.length > 0) continue;

      const ingredients = [
        { name: 'Main ingredient', quantity: 'as needed' },
        { name: 'Spices', quantity: 'to taste' },
      ];
      const steps = [
        `Prepare ${meal.name} using fresh ingredients aligned with your diet plan.`,
        'Cook using minimal oil; adjust spice to your tolerance.',
        'Serve fresh and log portions in Food Log.',
      ];

      await pool.query(
        `INSERT INTO recipes (food_name, ingredients_json, steps_json, prep_time_min, cook_time_min,
          difficulty, macros_json, tips, diet_tags, cuisine)
         VALUES ($1, $2, $3, 15, 25, 'easy', $4, $5, ARRAY['vegetarian'], 'Indian')`,
        [
          meal.name,
          JSON.stringify(ingredients),
          JSON.stringify(steps),
          JSON.stringify({
            calories: meal.calories || 300,
            protein_g: meal.protein_g || 12,
            carbs_g: meal.carbs_g || 40,
            fat_g: meal.fat_g || 10,
          }),
          ['Pair with dal or salad for balanced macros'],
        ]
      );
      count += 1;
    }
  }

  return count;
}
