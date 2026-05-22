import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService, AgentsUnavailableError } from '../services/agents';
import { syncRecipesFromMealPlan } from '../services/recipeFromMealPlan';

export async function listRecipes(req: AuthRequest, res: Response) {
  const { cuisine, diet } = req.query;
  let query =
    'SELECT id, food_name, prep_time_min, cook_time_min, difficulty, macros_json, image_url, diet_tags, cuisine FROM recipes WHERE 1=1';
  const params: unknown[] = [];

  if (cuisine) {
    params.push(cuisine);
    query += ` AND cuisine = $${params.length}`;
  }
  if (diet) {
    params.push(diet);
    query += ` AND $${params.length} = ANY(diet_tags)`;
  }

  query += ' ORDER BY created_at DESC LIMIT 50';
  let result = await pool.query(query, params);

  if (result.rows.length === 0) {
    const plan = await pool.query(
      `SELECT plan_json FROM meal_plans WHERE user_id = $1 AND status = 'active' ORDER BY week_start_date DESC LIMIT 1`,
      [req.user!.userId]
    );
    if (plan.rows[0]?.plan_json) {
      await syncRecipesFromMealPlan(req.user!.userId, plan.rows[0].plan_json);
      result = await pool.query(query, params);
    }
  }

  res.json({ recipes: result.rows, disclaimer: config.medicalDisclaimer });
}

export async function getRecipe(req: AuthRequest, res: Response) {
  const result = await pool.query('SELECT * FROM recipes WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Recipe not found' });
  res.json({ recipe: result.rows[0], disclaimer: config.medicalDisclaimer });
}

export async function generateRecipe(req: AuthRequest, res: Response) {
  const { meal_name } = req.body;
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);

  let recipe: Record<string, unknown>;
  try {
    recipe = await callAgentService<Record<string, unknown>>('/api/v1/agents/recipe', {
      meal_name,
      user: user.rows[0],
    });
  } catch (e) {
    if (!(e instanceof AgentsUnavailableError)) throw e;
    recipe = {
      food_name: meal_name,
      ingredients: [
        { name: 'Main ingredients', quantity: 'as needed' },
        { name: 'Spices', quantity: 'to taste' },
      ],
      steps: [
        `Wash and prep ingredients for ${meal_name}.`,
        'Cook on medium heat until done.',
        'Serve fresh and log your portion.',
      ],
      prep_time_min: 15,
      cook_time_min: 25,
      difficulty: 'easy',
      macros: { calories: 350, protein_g: 12, carbs_g: 45, fat_g: 12 },
      tips: ['Log exact portion in Food Log for accurate macros'],
      diet_tags: [user.rows[0].diet_type || 'vegetarian'],
    };
  }

  const insert = await pool.query(
    `INSERT INTO recipes (food_name, ingredients_json, steps_json, prep_time_min, cook_time_min,
      difficulty, macros_json, micros_json, tips, image_url, diet_tags, allergen_warnings, cuisine)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      recipe.food_name || meal_name,
      JSON.stringify(recipe.ingredients || []),
      JSON.stringify(recipe.steps || []),
      recipe.prep_time_min,
      recipe.cook_time_min,
      recipe.difficulty,
      JSON.stringify(recipe.macros || {}),
      JSON.stringify(recipe.micros || {}),
      recipe.tips || [],
      recipe.image_url,
      recipe.diet_tags || [],
      recipe.allergen_warnings || [],
      user.rows[0].cuisine_preference,
    ]
  );

  res.json({ recipe: insert.rows[0], disclaimer: config.medicalDisclaimer });
}

export async function saveRecipe(req: AuthRequest, res: Response) {
  await pool.query(
    'INSERT INTO saved_recipes (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user!.userId, req.params.id]
  );
  res.json({ saved: true });
}
