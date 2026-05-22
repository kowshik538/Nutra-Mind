import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService } from '../services/agents';

export async function getAnalytics(req: AuthRequest, res: Response) {
  const { period = 'weekly' } = req.query;
  const userId = req.user!.userId;
  const days = period === 'daily' ? 1 : period === 'monthly' ? 30 : 7;

  const [calorieTrend, macroTrend, weightTrend, progressLogs, completion] = await Promise.all([
    pool.query(
      `SELECT date, SUM(calories) as calories, SUM(protein_g) as protein,
              SUM(carbs_g) as carbs, SUM(fat_g) as fat
       FROM daily_logs WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int
       GROUP BY date ORDER BY date`,
      [userId, days]
    ),
    pool.query(
      `SELECT date, mood, energy_level, sleep_hours, water_ml FROM progress_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int ORDER BY date`,
      [userId, days]
    ),
    pool.query(
      `SELECT date, weight_kg FROM progress_logs WHERE user_id = $1 AND weight_kg IS NOT NULL
       AND date >= CURRENT_DATE - $2::int ORDER BY date`,
      [userId, days]
    ),
    pool.query('SELECT target_weight_kg, daily_calorie_target, macro_targets FROM users WHERE id = $1', [
      userId,
    ]),
    pool.query(
      `SELECT COUNT(DISTINCT date) as logged_days FROM daily_logs
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::int`,
      [userId, days]
    ),
  ]);

  let agentInsights = null;
  try {
    agentInsights = await callAgentService('/api/v1/agents/monitoring', {
      user_id: userId,
      period,
      logs: calorieTrend.rows,
    });
  } catch {
    agentInsights = { gaps: [], trends: {} };
  }

  res.json({
    period,
    calorie_trend: calorieTrend.rows,
    macro_trend: calorieTrend.rows,
    weight_trend: weightTrend.rows,
    mood_energy: progressLogs.rows,
    target_weight: progressLogs.rows[0]?.target_weight_kg,
    completion_rate: Math.round((Number(completion.rows[0]?.logged_days || 0) / days) * 100),
    insights: agentInsights,
    disclaimer: config.medicalDisclaimer,
  });
}
