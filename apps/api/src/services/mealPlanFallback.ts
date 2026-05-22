const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

type MealTemplate = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_weight?: number;
};

/** 6-meal vegetarian muscle-gain day (~2800–3000 kcal, high protein) */
const MUSCLE_GAIN_SLOTS: { key: string; split: number; meals: MealTemplate[] }[] = [
  {
    key: 'breakfast',
    split: 0.2,
    meals: [
      { name: 'Oats + milk + banana + peanut butter', calories: 520, protein_g: 22, carbs_g: 68, fat_g: 16, protein_weight: 1.2 },
      { name: 'Poha + peas + curd + peanuts', calories: 480, protein_g: 18, carbs_g: 72, fat_g: 14, protein_weight: 1.1 },
      { name: 'Moong dal chilla (3) + mint chutney + milk', calories: 500, protein_g: 24, carbs_g: 58, fat_g: 14, protein_weight: 1.3 },
    ],
  },
  {
    key: 'mid_morning',
    split: 0.08,
    meals: [
      { name: 'Curd (200g) + honey + roasted almonds', calories: 300, protein_g: 16, carbs_g: 22, fat_g: 16, protein_weight: 1.4 },
      { name: 'Buttermilk + mixed nuts + fruit', calories: 280, protein_g: 10, carbs_g: 28, fat_g: 14 },
    ],
  },
  {
    key: 'lunch',
    split: 0.28,
    meals: [
      { name: 'Rice + double dal + paneer curry + salad', calories: 820, protein_g: 38, carbs_g: 95, fat_g: 22, protein_weight: 1.5 },
      { name: 'Rice + sambar + soy chunks curry + curd', calories: 780, protein_g: 36, carbs_g: 88, fat_g: 18, protein_weight: 1.5 },
      { name: 'Roti (3) + rajma + paneer bhurji', calories: 760, protein_g: 34, carbs_g: 82, fat_g: 24, protein_weight: 1.4 },
    ],
  },
  {
    key: 'snack',
    split: 0.12,
    meals: [
      { name: 'Soy chunks stir fry + roti', calories: 380, protein_g: 28, carbs_g: 38, fat_g: 10, protein_weight: 1.6 },
      { name: 'Sprout chaat + peanuts + lemon', calories: 320, protein_g: 18, carbs_g: 42, fat_g: 12, protein_weight: 1.3 },
      { name: 'Paneer tikka (150g) + mint chutney', calories: 340, protein_g: 26, carbs_g: 8, fat_g: 22, protein_weight: 1.6 },
    ],
  },
  {
    key: 'dinner',
    split: 0.22,
    meals: [
      { name: 'Roti (3) + paneer bhurji + cucumber salad', calories: 620, protein_g: 35, carbs_g: 48, fat_g: 28, protein_weight: 1.5 },
      { name: 'Vegetable pulao + raita + extra dal', calories: 580, protein_g: 22, carbs_g: 72, fat_g: 18 },
      { name: 'Dosa (2) + sambar + coconut chutney + curd', calories: 540, protein_g: 18, carbs_g: 68, fat_g: 16 },
    ],
  },
  {
    key: 'evening',
    split: 0.1,
    meals: [
      { name: 'Milk (300ml) + dates + almonds + flax', calories: 400, protein_g: 16, carbs_g: 48, fat_g: 14, protein_weight: 1.2 },
      { name: 'Whey/soy shake + banana (optional powder)', calories: 350, protein_g: 28, carbs_g: 42, fat_g: 6, protein_weight: 1.8 },
      { name: 'Warm milk + turmeric + jaggery + nuts', calories: 320, protein_g: 12, carbs_g: 38, fat_g: 12 },
    ],
  },
];

const LIGHT_DAY_SLOTS: { key: string; split: number; meals: MealTemplate[] }[] = [
  {
    key: 'breakfast',
    split: 0.25,
    meals: [{ name: 'Pesarattu + coconut chutney', calories: 320, protein_g: 14, carbs_g: 38, fat_g: 12 }],
  },
  {
    key: 'lunch',
    split: 0.35,
    meals: [{ name: 'Rice + tomato pappu + curd + papad', calories: 510, protein_g: 18, carbs_g: 72, fat_g: 14 }],
  },
  {
    key: 'snack',
    split: 0.1,
    meals: [{ name: 'Roasted peanuts + tea', calories: 180, protein_g: 8, carbs_g: 12, fat_g: 12 }],
  },
  {
    key: 'dinner',
    split: 0.3,
    meals: [{ name: 'Vegetable pulao + raita', calories: 420, protein_g: 16, carbs_g: 55, fat_g: 14 }],
  },
];

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function scaleMeal(
  meal: MealTemplate,
  calFactor: number,
  proteinBoost: number
): MealTemplate & { meal_type?: string; estimated_cost_inr?: number } {
  const pBoost = 1 + (proteinBoost - 1) * (meal.protein_weight || 1);
  const f = calFactor;
  return {
    name: meal.name,
    calories: Math.round(meal.calories * f),
    protein_g: Math.round(meal.protein_g * f * pBoost * 10) / 10,
    carbs_g: Math.round(meal.carbs_g * f * 10) / 10,
    fat_g: Math.round(meal.fat_g * f * 10) / 10,
  };
}

function buildDay(
  dayIndex: number,
  slots: typeof MUSCLE_GAIN_SLOTS,
  calorieTarget: number,
  macroTargets: { protein_g: number; carbs_g: number; fat_g: number },
  budget: number
): Record<string, unknown> {
  const rawMeals: Record<string, MealTemplate> = {};
  let rawCal = 0;
  let rawProtein = 0;
  let rawCarbs = 0;
  let rawFat = 0;

  slots.forEach((slot, slotIdx) => {
    const options = slot.meals;
    const idx = (dayIndex + slotIdx) % options.length;
    rawMeals[slot.key] = { ...options[idx] };
    rawCal += rawMeals[slot.key].calories;
    rawProtein += rawMeals[slot.key].protein_g;
    rawCarbs += rawMeals[slot.key].carbs_g;
    rawFat += rawMeals[slot.key].fat_g;
  });

  const calFactor = rawCal > 0 ? calorieTarget / rawCal : 1;
  const proteinFactor = rawProtein > 0 ? macroTargets.protein_g / (rawProtein * calFactor) : 1;
  const proteinBoost = Math.min(1.35, Math.max(1, proteinFactor));

  const dayMeals: Record<string, MealTemplate & { meal_type: string; estimated_cost_inr: number }> = {};
  let dailyCost = 0;

  for (const slot of slots) {
    const scaled = scaleMeal(rawMeals[slot.key], calFactor, proteinBoost);
    dayMeals[slot.key] = {
      ...scaled,
      meal_type: slot.key,
      estimated_cost_inr: Math.round(budget * slot.split),
    };
    dailyCost += dayMeals[slot.key].estimated_cost_inr;
  }

  let daily_calories = Object.values(dayMeals).reduce((s, m) => s + m.calories, 0);
  let daily_macros = {
    protein_g: Math.round(Object.values(dayMeals).reduce((s, m) => s + m.protein_g, 0) * 10) / 10,
    carbs_g: Math.round(Object.values(dayMeals).reduce((s, m) => s + m.carbs_g, 0) * 10) / 10,
    fat_g: Math.round(Object.values(dayMeals).reduce((s, m) => s + m.fat_g, 0) * 10) / 10,
  };

  const carbGap = macroTargets.carbs_g / daily_macros.carbs_g;
  const fatGap = macroTargets.fat_g / daily_macros.fat_g;
  if (daily_macros.carbs_g > 0 && (carbGap < 0.92 || carbGap > 1.08)) {
    const cf = Math.min(1.15, Math.max(0.9, carbGap));
    for (const key of Object.keys(dayMeals)) {
      dayMeals[key].carbs_g = Math.round(dayMeals[key].carbs_g * cf * 10) / 10;
      dayMeals[key].calories = Math.round(dayMeals[key].calories * (0.98 + cf * 0.02));
    }
    daily_calories = Object.values(dayMeals).reduce((s, m) => s + m.calories, 0);
    daily_macros.carbs_g = Math.round(Object.values(dayMeals).reduce((s, m) => s + m.carbs_g, 0) * 10) / 10;
  }
  if (daily_macros.fat_g > 0 && (fatGap < 0.88 || fatGap > 1.12)) {
    const ff = Math.min(1.2, Math.max(0.88, fatGap));
    for (const key of Object.keys(dayMeals)) {
      dayMeals[key].fat_g = Math.round(dayMeals[key].fat_g * ff * 10) / 10;
    }
    daily_macros.fat_g = Math.round(Object.values(dayMeals).reduce((s, m) => s + m.fat_g, 0) * 10) / 10;
  }

  return {
    meals: dayMeals,
    daily_calories,
    daily_macros,
    macro_targets: macroTargets,
    calorie_target: calorieTarget,
    estimated_cost_inr: dailyCost,
    macro_match_pct: {
      calories: Math.min(100, Math.round((daily_calories / calorieTarget) * 100)),
      protein: Math.min(100, Math.round((daily_macros.protein_g / macroTargets.protein_g) * 100)),
      carbs: Math.min(100, Math.round((daily_macros.carbs_g / macroTargets.carbs_g) * 100)),
      fat: Math.min(100, Math.round((daily_macros.fat_g / macroTargets.fat_g) * 100)),
    },
  };
}

export function generateFallbackMealPlan(user: Record<string, unknown>): {
  plan_json: Record<string, unknown>;
  festival_adapted: string | null;
} {
  const cuisine = String(user.cuisine_preference || 'South Indian').toLowerCase();
  const diet = String(user.diet_type || 'vegetarian');
  const budget = Number(user.budget_per_day || 250);
  const goal = String(user.goal_type || 'maintain');

  const calorieTarget = Number(user.daily_calorie_target) || 2000;
  const macroTargets = parseJsonField(user.macro_targets, {
    protein_g: Math.round(Number(user.weight_kg || 63) * 2.0),
    carbs_g: 350,
    fat_g: 60,
  });
  const microTargets = parseJsonField(user.micro_targets, {
    iron_mg: 15,
    calcium_mg: 1100,
    fiber_g: 30,
    vit_b12_ug: 2.4,
    vit_d_ug: 15,
    zinc_mg: 11,
    magnesium_mg: 380,
    potassium_mg: 3500,
    omega3_g: 1.2,
  });

  const useMuscleGain =
    goal === 'gain' || calorieTarget >= 2500 || macroTargets.protein_g >= 110;
  const slots = useMuscleGain ? MUSCLE_GAIN_SLOTS : LIGHT_DAY_SLOTS;

  const days: Record<string, Record<string, unknown>> = {};
  DAYS.forEach((day, i) => {
    days[day] = {
      ...buildDay(i, slots, calorieTarget, macroTargets, budget),
      micro_targets: microTargets,
    };
  });

  const festival =
    user.festival_calendar === 'Hindu'
      ? 'Navratri/Ekadashi rules may apply — sattvic options included'
      : null;

  return {
    plan_json: {
      week_start: getMonday(new Date()),
      days,
      cuisine,
      diet_type: diet,
      generated_by: 'local_fallback',
      nutrition_targets: {
        daily_calories: calorieTarget,
        macros: macroTargets,
        micros: microTargets,
      },
    },
    festival_adapted: festival,
  };
}
