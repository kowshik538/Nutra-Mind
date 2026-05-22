const DISCLAIMER =
  'NutriMind AI provides guidance and is not a replacement for licensed medical or nutritional professionals.';

type UserRow = Record<string, unknown>;
type LogRow = Record<string, unknown>;
type ProgressRow = Record<string, unknown>;

export function generateCoachNudges(
  user: UserRow,
  logs: LogRow[],
  progress: ProgressRow[]
): { type: string; message: string }[] {
  const notifications: { type: string; message: string }[] = [];
  const goal = String(user.goal_type || 'maintain');
  const motivation = String(user.motivation_style || 'gentle');
  const today = new Date().toISOString().split('T')[0];

  const todayCals = logs
    .filter((l) => String(l.date).startsWith(today))
    .reduce((s, l) => s + Number(l.calories || 0), 0);
  const target = Number(user.daily_calorie_target) || 2000;
  const water = Number(progress.find((p) => String(p.date).startsWith(today))?.water_ml || 0);
  const waterGoal = Number(user.water_goal_ml) || 2500;

  const macros =
    typeof user.macro_targets === 'string'
      ? JSON.parse(user.macro_targets as string)
      : (user.macro_targets as Record<string, number>) || {};

  if (todayCals < target * 0.7) {
    const deficit = Math.round(target - todayCals);
    notifications.push({
      type: 'calorie_nudge',
      message:
        motivation === 'tough_coach'
          ? `You're ${deficit} kcal under target today. Add a protein-rich snack now — no excuses.`
          : `You're ${deficit} kcal under today's ${target} kcal target. Try fruit with peanuts or a bowl of dal rice.`,
    });
  } else if (todayCals > target * 1.15) {
    notifications.push({
      type: 'calorie_nudge',
      message: `You're ${Math.round(todayCals - target)} kcal over target. A light dinner (dal + salad) can balance your day.`,
    });
  }

  if (water < waterGoal * 0.6) {
    const glasses = Math.max(1, Math.round((waterGoal - water) / 250));
    notifications.push({
      type: 'hydration',
      message: `Hydration check: drink about ${glasses} more glass${glasses > 1 ? 'es' : ''} of water today (goal ${waterGoal} ml).`,
    });
  }

  if (goal === 'gain') {
    notifications.push({
      type: 'motivation',
      message: `Muscle gain focus: aim for ${macros.protein_g || 120}g protein today. Paneer, dal, and eggs are budget-friendly options.`,
    });
  } else if (goal === 'lose') {
    notifications.push({
      type: 'motivation',
      message: `Weight loss mode: stay near ${target} kcal and prioritize protein (${macros.protein_g || 100}g) to protect muscle.`,
    });
  }

  if (user.festival_calendar === 'Hindu') {
    notifications.push({
      type: 'festival',
      message: 'Festival season tip: fasting-friendly options (sabudana, fruits, milk) are in your meal plan when needed.',
    });
  }

  if (logs.length === 0) {
    notifications.unshift({
      type: 'action',
      message: 'Start logging meals in Food Log so your coach can give personalized nudges.',
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      type: 'general',
      message: "You're on track today. Keep logging meals and water to stay aligned with your goals.",
    });
  }

  return notifications;
}

export function generateChatReply(
  user: UserRow,
  message: string,
  history: { role: string; content: string }[]
): { reply: string; actions: { type: string; path?: string; meal?: string }[] } {
  const msgLower = message.toLowerCase();
  let reply = "I'm your NutriMind nutrition coach. Ask about meals, macros, swaps, or your weekly progress.";
  const actions: { type: string; path?: string; meal?: string }[] = [];

  const target = Number(user.daily_calorie_target) || 2000;
  const macros =
    typeof user.macro_targets === 'string'
      ? JSON.parse(user.macro_targets as string)
      : (user.macro_targets as Record<string, number>) || {};
  const micros =
    typeof user.micro_targets === 'string'
      ? JSON.parse(user.micro_targets as string)
      : (user.micro_targets as Record<string, number>) || {};

  if (msgLower.includes('protein') && msgLower.includes('paneer')) {
    reply =
      '100g paneer ≈ 18g protein, 265 kcal, rich in calcium (IFCT data).\n\nFor your targets: aim for ' +
      `${macros.protein_g || 100}g protein/day. A 150g paneer portion gives ~27g protein.`;
  } else if (msgLower.includes('swap') || msgLower.includes("don't like") || msgLower.includes('dont like')) {
    reply =
      'I can suggest allergen-safe alternatives within ±50 kcal.\n\nGo to Meal Plan → pick a day → tap Swap on any meal, or tell me which meal (breakfast/lunch/dinner).';
    actions.push({ type: 'open_meal_swap', path: '/meal-plan' });
  } else if (msgLower.includes('week') || msgLower.includes('progress') || msgLower.includes('how am i')) {
    reply = `Weekly check-in:\n• Calorie target: ${target} kcal/day\n• Protein: ${macros.protein_g || '—'}g · Carbs: ${macros.carbs_g || '—'}g · Fat: ${macros.fat_g || '—'}g\n\nLog meals daily and open Analytics for trends.`;
    actions.push({ type: 'navigate', path: '/analytics' });
  } else if (msgLower.includes('burger') || msgLower.includes('cheat') || msgLower.includes('pizza')) {
    reply =
      'One indulgent meal is fine.\n\nBalance with a lighter dinner: moong dal + salad (~350 kcal, ~18g protein) or vegetable upma + curd.';
    actions.push({ type: 'suggest_meal', meal: 'Moong dal + salad' });
  } else if (msgLower.includes('bloat')) {
    reply =
      'For bloating today:\n• Ginger tea or warm water\n• Light khichdi or moong dal soup\n• Avoid heavy fried food and excess dairy';
  } else if (
    (msgLower.includes('dinner') || msgLower.includes('lunch')) &&
    (msgLower.includes('₹') || msgLower.includes('rs') || msgLower.includes('budget') || msgLower.includes('cheap'))
  ) {
    reply =
      'Budget-friendly high-protein options:\n• 2 egg bhurji + roti (~₹40, ~22g protein)\n• Sprout chaat (~₹30, ~12g protein)\n• Curd rice + peanuts (~₹35, ~15g protein)';
  } else if (msgLower.includes('macro') || msgLower.includes('calorie') || msgLower.includes('target')) {
    reply = `Your personalized targets (from onboarding):\n\nCalories: ${target} kcal/day\nProtein: ${macros.protein_g || '—'}g\nCarbs: ${macros.carbs_g || '—'}g\nFat: ${macros.fat_g || '—'}g\n\nKey micros: Iron ${micros.iron_mg || '—'}mg · Calcium ${micros.calcium_mg || '—'}mg · Fiber ${micros.fiber_g || '—'}g`;
  } else if (msgLower.includes('upma') || msgLower.includes('idli') || msgLower.includes('pesarattu')) {
    reply =
      'South Indian staples (per typical serving):\n• Upma ~290 kcal, ~8g protein\n• Idli + sambar ~280 kcal\n• Pesarattu ~320 kcal, ~14g protein\n\nSearch exact portions in Food Log.';
  } else if (msgLower.includes('hello') || msgLower.includes('hi ') || msgLower === 'hi') {
    const name = user.name ? `, ${user.name}` : '';
    reply = `Hello${name}! I know your ${user.cuisine_preference || 'regional'} diet preferences and ${target} kcal target. What would you like help with today?`;
  } else if (history.length > 2) {
    reply =
      'Based on our chat, keep focusing on consistent logging and hitting your protein target. Want meal swaps, budget ideas, or a weekly review?';
  }

  return {
    reply: `${reply}\n\n—\n${DISCLAIMER}`,
    actions,
  };
}
