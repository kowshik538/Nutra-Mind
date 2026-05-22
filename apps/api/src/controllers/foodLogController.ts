import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService, AgentsUnavailableError } from '../services/agents';
import { parseTranscriptToFoodItems } from '../services/foodParseFallback';

function estimateCustomFoodNutrition(name: string, qtyG: number): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  const n = name.toLowerCase();
  const ratio = qtyG / 100;
  let per100 = { cal: 80, p: 3, c: 12, f: 2 };
  if (/fruit|apple|banana|mango|orange|grape|papaya|berry|melon/.test(n)) {
    per100 = { cal: 55, p: 0.8, c: 14, f: 0.2 };
  } else if (/vegetable|carrot|spinach|potato|tomato|onion|cabbage|cauliflower|beans|salad|gobi|palak/.test(n)) {
    per100 = { cal: 35, p: 2, c: 7, f: 0.3 };
  } else if (/dal|rajma|chana|pulse|lentil|bean/.test(n)) {
    per100 = { cal: 110, p: 7, c: 17, f: 1 };
  } else if (/rice|roti|chapati|bread|poha|upma|idli|dosa|noodle/.test(n)) {
    per100 = { cal: 130, p: 3, c: 26, f: 2 };
  } else if (/paneer|milk|curd|yogurt|cheese|egg/.test(n)) {
    per100 = { cal: 150, p: 10, c: 5, f: 8 };
  } else if (/nut|almond|peanut|seed/.test(n)) {
    per100 = { cal: 550, p: 20, c: 18, f: 45 };
  }
  return {
    calories: Math.round(per100.cal * ratio),
    protein_g: Math.round(per100.p * ratio * 10) / 10,
    carbs_g: Math.round(per100.c * ratio * 10) / 10,
    fat_g: Math.round(per100.f * ratio * 10) / 10,
  };
}

export async function searchFoods(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim();
  const region = req.query.region;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  if (!q) {
    return res.status(400).json({ error: 'Enter a food name to search' });
  }

  const user = await pool.query('SELECT allergies FROM users WHERE id = $1', [req.user!.userId]);
  const userAllergies = user.rows[0]?.allergies || [];

  const pattern = `%${q}%`;
  const words = q
    .toLowerCase()
    .split(/[\s,]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 2);

  const conditions: string[] = [
    'name ILIKE $1',
    'name_local ILIKE $1',
    'category ILIKE $1',
  ];
  const params: unknown[] = [pattern];

  words.forEach((word) => {
    params.push(`%${word}%`);
    const n = params.length;
    conditions.push(`name ILIKE $${n}`, `name_local ILIKE $${n}`, `category ILIKE $${n}`);
  });

  let query = `SELECT id, name, name_local, category, serving_size_g, calories, protein_g, carbs_g, fat_g,
               iron_mg, calcium_mg, region, source, is_vegetarian, is_vegan, is_gluten_free, is_dairy_free
               FROM foods WHERE (${conditions.join(' OR ')})`;

  if (region) {
    params.push(region);
    query += ` AND (region = $${params.length} OR region IS NULL)`;
  }

  query += ` ORDER BY CASE WHEN name ILIKE $${params.length + 1} THEN 0 WHEN name ILIKE $${params.length + 2} THEN 1 ELSE 2 END, name LIMIT $${params.length + 3}`;
  params.push(`${q}%`, pattern, limit);

  const result = await pool.query(query, params);

  res.json({
    foods: result.rows,
    count: result.rows.length,
    user_allergies: userAllergies,
    disclaimer: config.medicalDisclaimer,
  });
}

export async function logFood(req: AuthRequest, res: Response) {
  const { date, meal_type, food_id, food_name, quantity_g, log_method, calories, protein_g, carbs_g, fat_g } =
    req.body;
  const userId = req.user!.userId;

  if (!food_name && !food_id) {
    return res.status(400).json({ error: 'food_name or food_id required' });
  }

  const qty = Number(quantity_g) || 100;
  let nutrition = {
    calories: Number(calories) || 0,
    protein_g: Number(protein_g) || 0,
    carbs_g: Number(carbs_g) || 0,
    fat_g: Number(fat_g) || 0,
  };
  let resolvedName = food_name;

  if (food_id) {
    const food = await pool.query('SELECT * FROM foods WHERE id = $1', [food_id]);
    if (food.rows.length > 0) {
      const f = food.rows[0];
      const ratio = qty / (f.serving_size_g || 100);
      resolvedName = f.name;
      nutrition = {
        calories: Math.round(f.calories * ratio),
        protein_g: Math.round(f.protein_g * ratio * 10) / 10,
        carbs_g: Math.round(f.carbs_g * ratio * 10) / 10,
        fat_g: Math.round(f.fat_g * ratio * 10) / 10,
      };
    }
  } else if (!nutrition.calories && resolvedName) {
    const match = await pool.query(
      'SELECT * FROM foods WHERE name ILIKE $1 ORDER BY name LIMIT 1',
      [`%${resolvedName}%`]
    );
    if (match.rows.length > 0) {
      const f = match.rows[0];
      const ratio = qty / (f.serving_size_g || 100);
      nutrition = {
        calories: Math.round(f.calories * ratio),
        protein_g: Math.round(f.protein_g * ratio * 10) / 10,
        carbs_g: Math.round(f.carbs_g * ratio * 10) / 10,
        fat_g: Math.round(f.fat_g * ratio * 10) / 10,
      };
    } else {
      nutrition = estimateCustomFoodNutrition(resolvedName || '', qty);
    }
  }

  const result = await pool.query(
    `INSERT INTO daily_logs (user_id, date, meal_type, food_id, food_name, quantity_g,
      calories, protein_g, carbs_g, fat_g, log_method)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      userId,
      date || new Date().toISOString().split('T')[0],
      meal_type,
      food_id,
      resolvedName || food_name,
      quantity_g,
      nutrition.calories,
      nutrition.protein_g,
      nutrition.carbs_g,
      nutrition.fat_g,
      log_method || 'manual',
    ]
  );

  res.status(201).json({ log: result.rows[0], disclaimer: config.medicalDisclaimer });
}

export async function voiceLog(req: AuthRequest, res: Response) {
  const { transcript, audio_base64, confirm } = req.body;
  const userId = req.user!.userId;

  if (!transcript?.trim() && !audio_base64) {
    return res.status(400).json({ error: 'transcript or audio required' });
  }

  let items: { name: string; quantity_g: number; meal_type: string; food_id?: string }[] = [];

  try {
    const parsed = await callAgentService<{
      items: { name: string; quantity_g: number; meal_type: string }[];
    }>('/api/v1/agents/food-parse', {
      message: transcript,
      transcript: transcript || undefined,
      audio_base64,
      user_id: userId,
    });
    items = parsed.items || [];
  } catch (e) {
    if (!(e instanceof AgentsUnavailableError)) throw e;
    items = await parseTranscriptToFoodItems(transcript || '', userId);
  }

  const logs = [];
  if (confirm) {
    for (const item of items) {
      let nutrition = { calories: 150, protein_g: 5, carbs_g: 20, fat_g: 5 };
      if (item.food_id) {
        const food = await pool.query('SELECT * FROM foods WHERE id = $1', [item.food_id]);
        if (food.rows.length > 0) {
          const f = food.rows[0];
          const ratio = item.quantity_g / (f.serving_size_g || 100);
          nutrition = {
            calories: Math.round(f.calories * ratio),
            protein_g: Math.round(f.protein_g * ratio * 10) / 10,
            carbs_g: Math.round(f.carbs_g * ratio * 10) / 10,
            fat_g: Math.round(f.fat_g * ratio * 10) / 10,
          };
        }
      }
      const insert = await pool.query(
        `INSERT INTO daily_logs (user_id, date, meal_type, food_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g, log_method)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, 'voice') RETURNING *`,
        [
          userId,
          item.meal_type,
          item.food_id || null,
          item.name,
          item.quantity_g,
          nutrition.calories,
          nutrition.protein_g,
          nutrition.carbs_g,
          nutrition.fat_g,
        ]
      );
      logs.push(insert.rows[0]);
    }
  }

  res.json({
    parsed_items: items,
    logs,
    saved: Boolean(confirm),
    requires_confirmation: !confirm,
    disclaimer: config.medicalDisclaimer,
  });
}

export async function imageLog(req: AuthRequest, res: Response) {
  const { image_base64 } = req.body;

  const analysis = await callAgentService<{
    food_name: string;
    quantity_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    confidence_score: number;
  }>('/api/v1/agents/food-vision', { image_base64, user_id: req.user!.userId });

  res.json({ analysis, requires_confirmation: true, disclaimer: config.medicalDisclaimer });
}

export async function getDailyLogs(req: AuthRequest, res: Response) {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const logs = await pool.query(
    'SELECT * FROM daily_logs WHERE user_id = $1 AND date = $2 ORDER BY created_at',
    [req.user!.userId, date]
  );

  const totals = logs.rows.reduce(
    (acc, log) => ({
      calories: acc.calories + Number(log.calories || 0),
      protein_g: acc.protein_g + Number(log.protein_g || 0),
      carbs_g: acc.carbs_g + Number(log.carbs_g || 0),
      fat_g: acc.fat_g + Number(log.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  res.json({ date, logs: logs.rows, totals, disclaimer: config.medicalDisclaimer });
}
