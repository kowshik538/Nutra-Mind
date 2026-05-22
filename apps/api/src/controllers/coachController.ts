import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService, AgentsUnavailableError } from '../services/agents';
import { generateCoachNudges } from '../services/chatCoachFallback';

export async function getCoachMessages(req: AuthRequest, res: Response) {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.user!.userId]
  );
  res.json({ messages: result.rows, disclaimer: config.medicalDisclaimer });
}

export async function generateNudges(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const logs = await pool.query(
    'SELECT * FROM daily_logs WHERE user_id = $1 AND date >= CURRENT_DATE - 7 ORDER BY date',
    [userId]
  );
  const progress = await pool.query(
    'SELECT * FROM progress_logs WHERE user_id = $1 AND date >= CURRENT_DATE - 7',
    [userId]
  );

  let nudges: { notifications: { type: string; message: string }[] };
  try {
    nudges = await callAgentService<{ notifications: { type: string; message: string }[] }>(
      '/api/v1/agents/coach',
      { user: user.rows[0], logs: logs.rows, progress: progress.rows }
    );
  } catch (e) {
    if (!(e instanceof AgentsUnavailableError)) throw e;
    nudges = { notifications: generateCoachNudges(user.rows[0], logs.rows, progress.rows) };
  }

  for (const n of nudges.notifications || []) {
    await pool.query(
      'INSERT INTO notifications (user_id, type, message, sent_at) VALUES ($1, $2, $3, NOW())',
      [userId, n.type, n.message]
    );
  }

  res.json({ nudges: nudges.notifications, disclaimer: config.medicalDisclaimer });
}

export async function logProgress(req: AuthRequest, res: Response) {
  const { date, weight_kg, water_ml, sleep_hours, steps_count, mood, energy_level, notes } = req.body;

  const result = await pool.query(
    `INSERT INTO progress_logs (user_id, date, weight_kg, water_ml, sleep_hours, steps_count, mood, energy_level, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, date) DO UPDATE SET
       weight_kg = COALESCE(EXCLUDED.weight_kg, progress_logs.weight_kg),
       water_ml = COALESCE(EXCLUDED.water_ml, progress_logs.water_ml),
       sleep_hours = COALESCE(EXCLUDED.sleep_hours, progress_logs.sleep_hours),
       steps_count = COALESCE(EXCLUDED.steps_count, progress_logs.steps_count),
       mood = COALESCE(EXCLUDED.mood, progress_logs.mood),
       energy_level = COALESCE(EXCLUDED.energy_level, progress_logs.energy_level),
       notes = COALESCE(EXCLUDED.notes, progress_logs.notes)
     RETURNING *`,
    [
      req.user!.userId,
      date || new Date().toISOString().split('T')[0],
      weight_kg,
      water_ml,
      sleep_hours,
      steps_count,
      mood,
      energy_level,
      notes,
    ]
  );

  res.json({ progress: result.rows[0], disclaimer: config.medicalDisclaimer });
}
