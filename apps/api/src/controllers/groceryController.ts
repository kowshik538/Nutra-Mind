import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService } from '../services/agents';

export async function getGroceryList(req: AuthRequest, res: Response) {
  const result = await pool.query(
    `SELECT * FROM grocery_lists WHERE user_id = $1 ORDER BY week_start_date DESC LIMIT 1`,
    [req.user!.userId]
  );
  res.json({ list: result.rows[0] || null, disclaimer: config.medicalDisclaimer });
}

export async function generateGroceryList(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const plan = await pool.query(
    `SELECT plan_json, week_start_date FROM meal_plans WHERE user_id = $1 AND status = 'active'
     ORDER BY week_start_date DESC LIMIT 1`,
    [userId]
  );

  if (plan.rows.length === 0) {
    return res.status(404).json({ error: 'No active meal plan' });
  }

  const user = await pool.query('SELECT location_country, budget_per_day FROM users WHERE id = $1', [userId]);
  const grocery = await callAgentService<{ items_json: unknown; total_cost_inr: number }>(
    '/api/v1/agents/grocery',
    { meal_plan: plan.rows[0].plan_json, user: user.rows[0] }
  );

  const insert = await pool.query(
    `INSERT INTO grocery_lists (user_id, week_start_date, items_json, total_cost_inr)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, plan.rows[0].week_start_date, JSON.stringify(grocery.items_json), grocery.total_cost_inr]
  );

  res.json({ list: insert.rows[0], disclaimer: config.medicalDisclaimer });
}

export async function toggleGroceryItem(req: AuthRequest, res: Response) {
  const { listId, itemId, checked } = req.body;
  const list = await pool.query('SELECT checked_items FROM grocery_lists WHERE id = $1 AND user_id = $2', [
    listId,
    req.user!.userId,
  ]);

  if (list.rows.length === 0) return res.status(404).json({ error: 'List not found' });

  let checkedItems: string[] = list.rows[0].checked_items || [];
  if (checked) {
    if (!checkedItems.includes(itemId)) checkedItems.push(itemId);
  } else {
    checkedItems = checkedItems.filter((id: string) => id !== itemId);
  }

  await pool.query('UPDATE grocery_lists SET checked_items = $1 WHERE id = $2', [checkedItems, listId]);
  res.json({ checked_items: checkedItems });
}
