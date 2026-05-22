import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import {
  calculateBMR,
  calculateBMI,
  calculateTDEE,
  calculateDailyCalories,
  calculateMacros,
  calculateMicroTargets,
  calculateWaterGoal,
  Gender,
  GoalType,
  ActivityLevel,
} from '../services/nutrition';
import { callAgentService } from '../services/agents';

export async function completeOnboarding(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const data = req.body;

  const gender = (data.gender || 'other') as Gender;
  const goalType = (data.goal_type || data.goalType || 'maintain') as GoalType;
  const activityLevel = (data.activity_level || data.activityLevel || 'moderately_active') as ActivityLevel;
  const weightKg = parseFloat(data.weight_kg || data.weightKg);
  const heightCm = parseFloat(data.height_cm || data.heightCm);
  const age = parseInt(data.age, 10);
  const healthConditions = data.health_conditions || data.healthConditions || [];

  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const bmi = calculateBMI(weightKg, heightCm);
  const tdee = calculateTDEE(bmr, activityLevel);
  const { calories, warning } = calculateDailyCalories(
    tdee,
    goalType,
    gender,
    config.minCaloriesFemale,
    config.minCaloriesMale
  );
  const macros = calculateMacros(calories, weightKg, goalType);
  const micros = calculateMicroTargets(age, gender, healthConditions);
  const waterGoal = data.water_goal_ml || calculateWaterGoal(weightKg, activityLevel);

  // Risk flags
  const riskFlags: string[] = [];
  if (healthConditions.includes('diabetes') && data.diet_type === 'keto') {
    riskFlags.push('keto_with_diabetes');
  }
  if (healthConditions.includes('PCOS') && (data.allergies || []).includes('dairy')) {
    riskFlags.push('pcos_dairy_allergy');
  }
  if (healthConditions.length > 0) {
    riskFlags.push('consult_healthcare_provider');
  }

  let profileJson: Record<string, unknown> = {};
  try {
    const agentResult = await callAgentService<{ profile: Record<string, unknown> }>(
      '/api/v1/agents/profile',
      { onboarding: data, bmr, bmi, tdee, calories, macros, micros, risk_flags: riskFlags }
    );
    profileJson = agentResult.profile || {};
  } catch {
    profileJson = {
      restrictions: data.allergies || [],
      goal_classification: goalType,
      risk_flags: riskFlags,
      validated: true,
    };
  }

  await pool.query(
    `UPDATE users SET
      name = COALESCE($2, name),
      age = $3, gender = $4, height_cm = $5, weight_kg = $6,
      target_weight_kg = $7, goal_type = $8, activity_level = $9,
      occupation = $10, diet_type = $11,
      religious_restrictions = $12, food_dislikes = $13, allergies = $14,
      spice_tolerance = $15, location_city = $16, location_state = $17,
      location_country = $18, cuisine_preference = $19, festival_calendar = $20,
      budget_per_day = $21, wake_time = $22, sleep_time = $23,
      meal_timings = $24, water_goal_ml = $25,
      health_conditions = $26, medications = $27, pregnancy_breastfeeding = $28,
      motivation_style = $29, target_date = $30,
      bmr = $31, tdee = $32, daily_calorie_target = $33,
      macro_targets = $34, micro_targets = $35,
      profile_json = $36, risk_flags = $37,
      onboarding_completed = true, updated_at = NOW()
     WHERE id = $1`,
    [
      userId,
      data.full_name || data.name,
      age,
      gender,
      heightCm,
      weightKg,
      data.target_weight_kg,
      goalType,
      activityLevel,
      data.occupation,
      data.diet_type,
      data.religious_restrictions || [],
      data.food_dislikes || [],
      data.allergies || [],
      data.spice_tolerance,
      data.location_city,
      data.location_state,
      data.location_country,
      data.cuisine_preference,
      data.festival_calendar,
      data.budget_per_day,
      data.wake_time,
      data.sleep_time,
      JSON.stringify(data.meal_timings || {}),
      waterGoal,
      healthConditions,
      data.medications,
      data.pregnancy_breastfeeding || false,
      data.motivation_style,
      data.target_date,
      bmr,
      tdee,
      calories,
      JSON.stringify(macros),
      JSON.stringify(micros),
      JSON.stringify(profileJson),
      riskFlags,
    ]
  );

  // Trigger meal plan generation
  try {
    await callAgentService('/api/v1/orchestrate/meal-plan', { user_id: userId });
  } catch (e) {
    console.warn('Meal plan generation deferred:', e);
  }

  res.json({
    success: true,
    nutrition: { bmr, bmi, tdee, daily_calories: calories, macros, micros, water_goal_ml: waterGoal },
    risk_flags: riskFlags,
    warning,
    disclaimer: config.medicalDisclaimer,
    redirect: '/dashboard',
  });
}
