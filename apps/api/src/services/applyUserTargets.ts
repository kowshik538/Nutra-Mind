import { pool } from '../db/pool';
import { ParsedTargets, resolveUserTargets } from './nutritionTargets';
import { generateMealPlanForUser } from './agents';
import { syncRecipesFromMealPlan } from './recipeFromMealPlan';
import { getDayTotals } from './planDayTotals';

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

export async function applyUserTargetsAndRegenerateMealPlan(
  userId: string,
  parsed: ParsedTargets
): Promise<{ message: string; plan?: unknown; targets: ParsedTargets }> {
  const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0) throw new Error('User not found');
  const user = userRes.rows[0];

  const resolved = resolveUserTargets(parsed, user);
  const calorieTarget = resolved.daily_calorie_target ?? 2800;
  const macroTargets = resolved.macro_targets ?? { protein_g: 132, carbs_g: 410, fat_g: 75 };
  const microTargets = resolved.micro_targets ?? {};
  const goalType = resolved.goal_type ?? 'gain';

  await pool.query(
    `UPDATE users SET
      daily_calorie_target = $2,
      macro_targets = $3,
      micro_targets = $4,
      goal_type = $5,
      updated_at = NOW()
     WHERE id = $1`,
    [userId, calorieTarget, JSON.stringify(macroTargets), JSON.stringify(microTargets), goalType]
  );

  const updatedUser = (
    await pool.query('SELECT * FROM users WHERE id = $1', [userId])
  ).rows[0];

  await pool.query(
    `UPDATE meal_plans SET status = 'archived' WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const planResult = await generateMealPlanForUser(updatedUser);
  const weekStart = getMonday(new Date());

  const insert = await pool.query(
    `INSERT INTO meal_plans (user_id, week_start_date, plan_json, festival_adapted, generated_by_agent, status)
     VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
    [
      userId,
      weekStart,
      JSON.stringify(planResult.plan_json),
      planResult.festival_adapted,
      planResult.source === 'agents' ? 'meal_planner_agent' : 'meal_planner_scaled',
    ]
  );

  await syncRecipesFromMealPlan(userId, planResult.plan_json as { days?: Record<string, unknown> });

  const planJson = planResult.plan_json as {
    days?: Record<string, Record<string, unknown>>;
  };
  const mondayTotals = getDayTotals(planJson.days?.monday);

  const message =
    `Done — I updated your profile and rebuilt your 7-day meal plan.\n\n` +
    `Daily targets:\n` +
    `• Calories: ${calorieTarget} kcal\n` +
    `• Protein: ${macroTargets.protein_g}g · Carbs: ${macroTargets.carbs_g}g · Fat: ${macroTargets.fat_g}g\n\n` +
    (mondayTotals
      ? `Monday sample totals: ${mondayTotals.daily_calories} kcal, ${mondayTotals.daily_macros.protein_g}g protein, ${mondayTotals.daily_macros.carbs_g}g carbs, ${mondayTotals.daily_macros.fat_g}g fat.\n\n`
      : '') +
    `Open Meal Plan to review the full week. Log meals in Food Log to track progress on your dashboard.`;

  return {
    message,
    plan: insert.rows[0],
    targets: {
      daily_calorie_target: calorieTarget,
      macro_targets: macroTargets,
      micro_targets: microTargets as Record<string, number>,
      goal_type: goalType,
    },
  };
}
