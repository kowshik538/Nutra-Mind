type MealLike = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type DayTotals = {
  daily_calories: number;
  daily_macros: { protein_g: number; carbs_g: number; fat_g: number };
};

export function getDayTotals(day: Record<string, unknown> | undefined): DayTotals | null {
  if (!day) return null;

  const existing = day.daily_macros as { protein_g?: number; carbs_g?: number; fat_g?: number } | undefined;
  if (existing?.protein_g != null && day.daily_calories != null) {
    return {
      daily_calories: Number(day.daily_calories),
      daily_macros: {
        protein_g: Number(existing.protein_g),
        carbs_g: Number(existing.carbs_g ?? 0),
        fat_g: Number(existing.fat_g ?? 0),
      },
    };
  }

  const meals = day.meals as Record<string, MealLike> | undefined;
  if (!meals) return null;

  const list = Object.values(meals).filter((m) => m && typeof m === 'object');
  if (list.length === 0) return null;

  return {
    daily_calories: Math.round(list.reduce((s, m) => s + Number(m.calories || 0), 0)),
    daily_macros: {
      protein_g: Math.round(list.reduce((s, m) => s + Number(m.protein_g || 0), 0) * 10) / 10,
      carbs_g: Math.round(list.reduce((s, m) => s + Number(m.carbs_g || 0), 0) * 10) / 10,
      fat_g: Math.round(list.reduce((s, m) => s + Number(m.fat_g || 0), 0) * 10) / 10,
    },
  };
}

export function planMeetsTargets(
  planJson: { days?: Record<string, Record<string, unknown>> },
  calorieTarget: number,
  minProteinG: number
): boolean {
  const monday = planJson.days?.monday;
  const totals = getDayTotals(monday);
  if (!totals) return false;
  return (
    totals.daily_calories >= calorieTarget * 0.88 &&
    totals.daily_macros.protein_g >= minProteinG * 0.85
  );
}
