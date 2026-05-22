import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

export async function getDashboard(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const today = new Date().toISOString().split('T')[0];

  const [user, logs, progress, plan, notifications, streak] = await Promise.all([
    pool.query(
      'SELECT daily_calorie_target, macro_targets, micro_targets, water_goal_ml, weight_kg FROM users WHERE id = $1',
      [userId]
    ),
    pool.query(
      `SELECT SUM(calories) as calories, SUM(protein_g) as protein, SUM(carbs_g) as carbs, SUM(fat_g) as fat
       FROM daily_logs WHERE user_id = $1 AND date = $2`,
      [userId, today]
    ),
    pool.query('SELECT * FROM progress_logs WHERE user_id = $1 AND date = $2', [userId, today]),
    pool.query(
      `SELECT plan_json FROM meal_plans WHERE user_id = $1 AND status = 'active' ORDER BY week_start_date DESC LIMIT 1`,
      [userId]
    ),
    pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND (sent_at IS NOT NULL OR scheduled_at <= NOW())
       ORDER BY created_at DESC LIMIT 3`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(DISTINCT date) as streak FROM daily_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    ),
  ]);

  const weightHistory = await pool.query(
    `SELECT date, weight_kg FROM progress_logs WHERE user_id = $1 AND weight_kg IS NOT NULL
     ORDER BY date DESC LIMIT 14`,
    [userId]
  );

  const u = user.rows[0] || {};
  const consumed = logs.rows[0] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const macros = typeof u.macro_targets === 'string' ? JSON.parse(u.macro_targets) : u.macro_targets || {};

  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date().getDay()
  ];
  const planJson = plan.rows[0]?.plan_json;
  const todayMeals = planJson?.days?.[dayName] || planJson?.[dayName] || null;

  res.json({
    today,
    calories: {
      consumed: Number(consumed.calories || 0),
      target: u.daily_calorie_target || 2000,
    },
    macros: {
      protein: { consumed: Number(consumed.protein || 0), target: macros.protein_g || 100 },
      carbs: { consumed: Number(consumed.carbs || 0), target: macros.carbs_g || 200 },
      fat: { consumed: Number(consumed.fat || 0), target: macros.fat_g || 65 },
    },
    water: {
      consumed_ml: progress.rows[0]?.water_ml || 0,
      goal_ml: u.water_goal_ml || 2500,
    },
    micro_targets: u.micro_targets,
    today_meals: todayMeals,
    coach_messages: notifications.rows.map((n: { message?: string; title?: string; type?: string }) => ({
      message: n.message || n.title || 'Stay consistent with your plan today.',
      type: n.type || 'motivation',
    })),
    weight_history: weightHistory.rows.reverse(),
    streak: Number(streak.rows[0]?.streak || 0),
    disclaimer: config.medicalDisclaimer,
  });
}
