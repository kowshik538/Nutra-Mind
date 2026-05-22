/**
 * Nutrition calculation service — Mifflin-St Jeor, TDEE, macros, micros
 */

export type Gender = 'male' | 'female' | 'other';
export type GoalType = 'lose' | 'gain' | 'maintain' | 'recomposition';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // average for other
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateDailyCalories(
  tdee: number,
  goal: GoalType,
  gender: Gender,
  minFemale: number,
  minMale: number
): { calories: number; warning?: string } {
  let target = tdee;
  if (goal === 'lose') target = Math.round(tdee * 0.8);
  else if (goal === 'gain') target = Math.max(Math.round(tdee * 1.15), Math.round(tdee + 300), 2700);
  else if (goal === 'recomposition') target = Math.round(tdee * 0.95);

  const minCal = gender === 'female' ? minFemale : minMale;
  if (target < minCal) {
    return {
      calories: minCal,
      warning: `Calorie target adjusted to safe minimum (${minCal} kcal). Consult a healthcare provider.`,
    };
  }
  return { calories: target };
}

export function calculateMacros(
  calories: number,
  weightKg: number,
  goal: GoalType
): { protein_g: number; carbs_g: number; fat_g: number } {
  if (goal === 'gain') {
    const protein_g = Math.round(weightKg * 2.1);
    const fat_g = Math.round(weightKg * 0.95);
    const proteinCal = protein_g * 4;
    const fatCal = fat_g * 9;
    const carbs_g = Math.max(200, Math.round((calories - proteinCal - fatCal) / 4));
    return { protein_g, carbs_g, fat_g };
  }

  let proteinPerKg = 1.4;
  if (goal === 'lose') proteinPerKg = 1.4;
  else if (goal === 'recomposition') proteinPerKg = 1.8;

  const protein_g = Math.round(weightKg * proteinPerKg);
  const proteinCal = protein_g * 4;
  const fatCal = Math.round(calories * 0.25);
  const fat_g = Math.round(fatCal / 9);
  const carbs_g = Math.round((calories - proteinCal - fatCal) / 4);

  return { protein_g, carbs_g, fat_g };
}

export function calculateMicroTargets(
  age: number,
  gender: Gender,
  healthConditions: string[] = []
): Record<string, number> {
  const base: Record<string, number> = {
    iron_mg: gender === 'female' && age < 50 ? 18 : 8,
    zinc_mg: gender === 'female' ? 8 : 11,
    calcium_mg: age > 50 ? 1200 : 1000,
    vit_d_ug: 15,
    vit_b12_ug: 2.4,
    magnesium_mg: gender === 'female' ? 310 : 400,
    potassium_mg: 3500,
    sodium_mg: 2300,
    fiber_g: gender === 'female' ? 25 : 38,
    omega3_g: 1.6,
  };

  if (healthConditions.includes('diabetes')) {
    base.fiber_g = 35;
    base.sodium_mg = 2000;
  }
  if (healthConditions.includes('hypertension') || healthConditions.includes('high_blood_pressure')) {
    base.sodium_mg = 1500;
    base.potassium_mg = 4700;
  }
  if (healthConditions.includes('PCOS')) {
    base.fiber_g = 30;
    base.iron_mg = 15;
  }
  if (healthConditions.includes('thyroid')) {
    base.zinc_mg = 12;
    base.selenium_ug = 55;
  }

  return base;
}

export function calculateWaterGoal(weightKg: number, activityLevel: ActivityLevel): number {
  let ml = Math.round(weightKg * 35);
  if (activityLevel === 'very_active' || activityLevel === 'extremely_active') {
    ml += 500;
  }
  return ml;
}
