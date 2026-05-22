import { pool } from './pool';
import { FOOD_CATALOG } from './foodCatalog';

const FESTIVALS = [
  { name: 'Navratri', religion: 'Hindu', duration_days: 9, fasting_rules: { no_onion_garlic: true, sattvic: true }, traditional_foods: ['sabudana khichdi', 'kuttu roti', 'singhara atta'], regions: ['India'] },
  { name: 'Ramadan', religion: 'Muslim', duration_days: 30, fasting_rules: { dawn_to_dusk: true }, traditional_foods: ['dates', 'harees', 'biryani'], regions: ['Global'] },
  { name: 'Ekadashi', religion: 'Hindu', duration_days: 1, fasting_rules: { no_grains: true }, traditional_foods: ['sabudana', 'fruits', 'milk'], regions: ['India'] },
  { name: 'Pongal', religion: 'Hindu', duration_days: 4, fasting_rules: {}, traditional_foods: ['ven pongal', 'sakkarai pongal', 'vadai'], regions: ['Tamil Nadu'] },
];

const CHALLENGES = [
  { name: '7-Day Protein Streak', description: 'Hit your protein target 7 days in a row', duration_days: 7, criteria: { type: 'protein_streak', days: 7 }, badge_reward: 'protein_hero' },
  { name: 'Hydration Hero', description: 'Meet water goal for 5 consecutive days', duration_days: 5, criteria: { type: 'water_streak', days: 5 }, badge_reward: 'hydration_hero' },
];

async function seed() {
  console.log('Seeding foods...');
  for (const food of FOOD_CATALOG) {
    const exists = await pool.query('SELECT id FROM foods WHERE name ILIKE $1 LIMIT 1', [food.name]);
    if (exists.rows.length > 0) continue;
    await pool.query(
      `INSERT INTO foods (name, name_local, category, calories, protein_g, carbs_g, fat_g, fiber_g,
        iron_mg, calcium_mg, potassium_mg, magnesium_mg, vit_b12_ug, region, source,
        is_vegetarian, is_vegan, is_gluten_free, cost_per_100g_inr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       `,
      [
        food.name, food.name_local, food.category, food.calories, food.protein_g, food.carbs_g, food.fat_g,
        (food as { fiber_g?: number }).fiber_g, (food as { iron_mg?: number }).iron_mg,
        (food as { calcium_mg?: number }).calcium_mg, (food as { potassium_mg?: number }).potassium_mg,
        (food as { magnesium_mg?: number }).magnesium_mg, (food as { vit_b12_ug?: number }).vit_b12_ug,
        food.region, food.source, food.is_vegetarian ?? true, (food as { is_vegan?: boolean }).is_vegan ?? false,
        (food as { is_gluten_free?: boolean }).is_gluten_free ?? false, 15,
      ]
    );
  }

  console.log('Seeding festivals...');
  for (const f of FESTIVALS) {
    await pool.query(
      `INSERT INTO festivals (name, religion, duration_days, fasting_rules, traditional_foods, regions, year)
       VALUES ($1,$2,$3,$4,$5,$6,2026)`,
      [f.name, f.religion, f.duration_days, JSON.stringify(f.fasting_rules), f.traditional_foods, f.regions]
    );
  }

  console.log('Seeding challenges...');
  for (const c of CHALLENGES) {
    await pool.query(
      `INSERT INTO challenges (name, description, duration_days, criteria, badge_reward) VALUES ($1,$2,$3,$4,$5)`,
      [c.name, c.description, c.duration_days, JSON.stringify(c.criteria), c.badge_reward]
    );
  }

  // Admin user
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash('admin123', 12);
  await pool.query(
    `INSERT INTO users (email, name, password_hash, role, onboarding_completed)
     VALUES ('admin@nutrimind.ai', 'Admin', $1, 'admin', true)
     ON CONFLICT (email) DO NOTHING`,
    [hash]
  );

  console.log('Seed completed.');
  await pool.end();
}

seed().catch(console.error);
