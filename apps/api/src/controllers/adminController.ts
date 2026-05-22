import { Response } from 'express';
import { pool } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

export async function listUsers(req: AuthRequest, res: Response) {
  const result = await pool.query(
    `SELECT id, email, name, role, onboarding_completed, created_at FROM users ORDER BY created_at DESC LIMIT 100`
  );
  res.json({ users: result.rows });
}

export async function banUser(req: AuthRequest, res: Response) {
  await pool.query("UPDATE users SET role = 'banned' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
}

export async function platformStats(req: AuthRequest, res: Response) {
  const [users, logs, plans, agents] = await Promise.all([
    pool.query('SELECT COUNT(*) as total FROM users'),
    pool.query('SELECT COUNT(DISTINCT user_id) as dau FROM daily_logs WHERE date = CURRENT_DATE'),
    pool.query('SELECT COUNT(*) as active_plans FROM meal_plans WHERE status = $1', ['active']),
    pool.query(
      `SELECT agent_name, COUNT(*) as runs,
              AVG(duration_ms) as avg_duration,
              COUNT(*) FILTER (WHERE status = 'error') as errors
       FROM agent_runs WHERE created_at >= CURRENT_DATE - 7 GROUP BY agent_name`
    ),
  ]);

  res.json({
    total_users: users.rows[0].total,
    dau: logs.rows[0].dau,
    active_plans: plans.rows[0].active_plans,
    agent_stats: agents.rows,
  });
}

export async function manageFood(req: AuthRequest, res: Response) {
  const food = req.body;
  const result = await pool.query(
    `INSERT INTO foods (name, name_local, category, calories, protein_g, carbs_g, fat_g, source, region)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [food.name, food.name_local, food.category, food.calories, food.protein_g, food.carbs_g, food.fat_g, food.source || 'custom', food.region]
  );
  res.status(201).json({ food: result.rows[0] });
}
