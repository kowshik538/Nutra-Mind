import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService, generateMealPlanForUser, AgentsUnavailableError } from '../services/agents';
import { generateFallbackMealPlan } from '../services/mealPlanFallback';
import { syncRecipesFromMealPlan } from '../services/recipeFromMealPlan';

export async function getCurrentMealPlan(req: AuthRequest, res: Response) {
  const result = await pool.query(
    `SELECT * FROM meal_plans WHERE user_id = $1 AND status = 'active'
     ORDER BY week_start_date DESC LIMIT 1`,
    [req.user!.userId]
  );

  if (result.rows.length === 0) {
    return res.json({ plan: null, disclaimer: config.medicalDisclaimer });
  }

  const plan = result.rows[0];
  const festivals = await pool.query(
    `SELECT * FROM festivals WHERE start_date <= CURRENT_DATE + INTERVAL '7 days'
     AND end_date >= CURRENT_DATE`
  );

  res.json({
    plan,
    festivals: festivals.rows,
    disclaimer: config.medicalDisclaimer,
  });
}

export async function generateMealPlan(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  await pool.query(
    `UPDATE meal_plans SET status = 'archived' WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const result = await generateMealPlanForUser(user.rows[0]);
  const weekStart = getMonday(new Date());
  const agentName =
    result.source === 'agents' ? 'meal_planner_agent' : 'meal_planner_scaled';

  const insert = await pool.query(
    `INSERT INTO meal_plans (user_id, week_start_date, plan_json, festival_adapted, generated_by_agent, status)
     VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
    [userId, weekStart, JSON.stringify(result.plan_json), result.festival_adapted, agentName]
  );

  const planJson = result.plan_json as { days?: Record<string, unknown> };
  const recipesSynced = await syncRecipesFromMealPlan(userId, planJson);

  res.json({
    plan: insert.rows[0],
    source: result.source,
    recipes_synced: recipesSynced,
    nutrition_targets: (planJson as { nutrition_targets?: unknown }).nutrition_targets,
    disclaimer: config.medicalDisclaimer,
  });
}

export async function getDayMeals(req: AuthRequest, res: Response) {
  const { day } = req.params;
  const plan = await pool.query(
    `SELECT plan_json FROM meal_plans WHERE user_id = $1 AND status = 'active'
     ORDER BY week_start_date DESC LIMIT 1`,
    [req.user!.userId]
  );

  if (plan.rows.length === 0) return res.status(404).json({ error: 'No active meal plan' });

  const planJson = plan.rows[0].plan_json as Record<string, unknown>;
  const dayMeals = (planJson as { days?: Record<string, unknown> }).days?.[day] || planJson[day];

  res.json({ day, meals: dayMeals, disclaimer: config.medicalDisclaimer });
}

export async function swapMeal(req: AuthRequest, res: Response) {
  const { day, mealType, mealIndex } = req.body;
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user!.userId]);

  try {
    const alternatives = await callAgentService<{ alternatives: unknown[] }>(
      '/api/v1/agents/meal-planner/swap',
      {
        user: user.rows[0],
        day,
        meal_type: mealType,
        meal_index: mealIndex,
      }
    );
    res.json({ alternatives: alternatives.alternatives, disclaimer: config.medicalDisclaimer });
  } catch (e) {
    if (e instanceof AgentsUnavailableError) {
      const plan = generateFallbackMealPlan(user.rows[0]);
      const dayData = (plan.plan_json as { days?: Record<string, { meals?: Record<string, Meal> }> }).days?.[day];
      const meals = dayData?.meals || {};
      const current = meals[mealType as string];
      const alts = Object.values(meals)
        .filter((m) => m.name !== current?.name)
        .slice(0, 3)
        .map((m) => ({ ...m, allergen_safe: true }));
      return res.json({ alternatives: alts, disclaimer: config.medicalDisclaimer });
    }
    throw e;
  }
}

type Meal = { name: string; calories: number; protein_g: number };

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}
