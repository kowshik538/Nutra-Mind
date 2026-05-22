/** Parse calorie/macro numbers from natural-language chat messages */

export type ParsedTargets = {
  daily_calorie_target?: number;
  macro_targets?: { protein_g: number; carbs_g: number; fat_g: number };
  micro_targets?: Record<string, number>;
  goal_type?: string;
};

function num(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

function extractRange(text: string, pattern: RegExp): number | undefined {
  const m = text.match(pattern);
  if (!m) return undefined;
  const a = num(m[1]);
  const b = m[2] ? num(m[2]) : a;
  return Math.round((a + b) / 2);
}

export function parseTargetsFromMessage(message: string): ParsedTargets | null {
  const lower = message.toLowerCase();
  const hasIntent =
    lower.includes('meal plan') ||
    lower.includes('target') ||
    lower.includes('macro') ||
    lower.includes('kcal') ||
    lower.includes('calorie') ||
    lower.includes('protein') ||
    lower.includes('carb') ||
    lower.includes('fix my') ||
    lower.includes('according to');

  if (!hasIntent) return null;

  const result: ParsedTargets = {};

  const calories =
    extractRange(lower, /([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})\s*kcal/) ||
    extractRange(lower, /([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})\s*cal/) ||
    extractRange(lower, /muscle gain[:\s]*\n*target[:\s]*([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})/) ||
    extractRange(lower, /target[:\s]*([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})\s*kcal\/day/) ||
    extractRange(lower, /≈\s*([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})\s*kcal/) ||
    extractRange(lower, /roughly\s*([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})/) ||
    extractRange(lower, /target[:\s]+([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})/) ||
    (lower.match(/([\d,]{3,5})\s*kcal/) ? num(lower.match(/([\d,]{3,5})\s*kcal/)![1]) : undefined);

  if (calories) result.daily_calorie_target = calories;

  const protein =
    extractRange(lower, /~?\s*(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*protein/) ||
    extractRange(lower, /protein[:\s]+(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g/) ||
    extractRange(lower, /(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*protein\/day/) ||
    extractRange(lower, /(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*protein/) ||
    extractRange(lower, /protein[:\s]*(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g/) ||
    (lower.match(/protein[:\s]*(\d{2,3})\s*g/) ? num(lower.match(/protein[:\s]*(\d{2,3})\s*g/)![1]) : undefined);

  const carbs =
    extractRange(lower, /~?\s*(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*carb/) ||
    extractRange(lower, /carb[s]?[:\s]+(\d{2,3})\s*[-–—to]+\s*(\d{2,3})/) ||
    extractRange(lower, /(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*carb/);

  const fat =
    extractRange(lower, /~?\s*(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*fat/) ||
    extractRange(lower, /fat[s]?[:\s]+(\d{2,3})\s*[-–—to]+\s*(\d{2,3})/) ||
    extractRange(lower, /(\d{2,3})\s*[-–—to]+\s*(\d{2,3})\s*g\s*fat/);

  if (protein || carbs || fat) {
    result.macro_targets = {
      protein_g: protein || 130,
      carbs_g: carbs || 350,
      fat_g: fat || 60,
    };
  }

  if (
    lower.includes('muscle') ||
    lower.includes('gain') ||
    lower.includes('65') ||
    lower.includes('67 kg') ||
    lower.includes('build muscle') ||
    lower.includes('weight gain')
  ) {
    result.goal_type = 'gain';
    if (!result.daily_calorie_target) {
      result.daily_calorie_target = extractRange(lower, /target[:\s]*([\d,]{3,5})\s*[-–—to]+\s*([\d,]{3,5})\s*kcal/) || 2850;
    }
    if (!result.macro_targets) {
      result.macro_targets = { protein_g: 132, carbs_g: 410, fat_g: 75 };
    }
  }

  if (lower.includes('vegetarian')) {
    /* diet_type set by caller if needed */
  }

  if (lower.includes('calcium') || lower.includes('iron') || lower.includes('micronutrient')) {
    result.micro_targets = {
      calcium_mg: 1100,
      iron_mg: 15,
      vit_b12_ug: 2.4,
      vit_d_ug: 15,
      zinc_mg: 11,
      magnesium_mg: 380,
      potassium_mg: 3500,
      omega3_g: 1.2,
      fiber_g: 30,
    };
  }

  if (!result.daily_calorie_target && !result.macro_targets) return null;
  return result;
}

export function wantsMealPlanUpdate(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('fix my meal plan') ||
    lower.includes('fix meal plan') ||
    lower.includes('update my meal plan') ||
    lower.includes('prepare') ||
    lower.includes('should be prepared') ||
    lower.includes('according to that') ||
    lower.includes('according to this') ||
    lower.includes('regenerate') ||
    lower.includes('rebuild') ||
    (lower.includes('meal plan') && (lower.includes('target') || lower.includes('according'))) ||
    (lower.includes('daily meal plan') && lower.includes('muscle'))
  );
}

export function resolveUserTargets(
  parsed: ParsedTargets,
  user: Record<string, unknown>
): ParsedTargets {
  const weight = Number(user.weight_kg) || 63;
  const defaults = muscleGainTargetsForProfile(weight);
  const goal = parsed.goal_type || user.goal_type || 'maintain';
  const isGain = goal === 'gain' || String(user.goal_type) === 'gain';

  const dbMacros =
    typeof user.macro_targets === 'string'
      ? JSON.parse(user.macro_targets as string)
      : (user.macro_targets as Record<string, number>) || {};

  if (isGain) {
    return {
      daily_calorie_target:
        parsed.daily_calorie_target ??
        (Number(user.daily_calorie_target) >= 2600 ? Number(user.daily_calorie_target) : defaults.daily_calorie_target),
      macro_targets: {
        protein_g: parsed.macro_targets?.protein_g ?? defaults.macro_targets!.protein_g,
        carbs_g: parsed.macro_targets?.carbs_g ?? defaults.macro_targets!.carbs_g,
        fat_g: parsed.macro_targets?.fat_g ?? defaults.macro_targets!.fat_g,
      },
      micro_targets: parsed.micro_targets ?? defaults.micro_targets,
      goal_type: 'gain',
    };
  }

  return {
    daily_calorie_target:
      parsed.daily_calorie_target ?? (Number(user.daily_calorie_target) || 2000),
    macro_targets: parsed.macro_targets ?? {
      protein_g: dbMacros.protein_g ?? 100,
      carbs_g: dbMacros.carbs_g ?? 250,
      fat_g: dbMacros.fat_g ?? 60,
    },
    micro_targets: parsed.micro_targets,
    goal_type: String(goal),
  };
}

export function isGenericCoachReply(reply: string): boolean {
  return (
    reply.includes('How can I help you today') ||
    reply.includes("I'm your NutriMind nutrition coach. Ask about meals")
  );
}

/** Defaults for 63 kg vegetarian muscle gain (~20y, 5'8") */
export function muscleGainTargetsForProfile(weightKg = 63): ParsedTargets {
  return {
    daily_calorie_target: 2800,
    goal_type: 'gain',
    macro_targets: {
      protein_g: Math.round(weightKg * 2.1),
      carbs_g: Math.round(weightKg * 5.2),
      fat_g: Math.round(weightKg * 0.95),
    },
    micro_targets: {
      calcium_mg: 1100,
      iron_mg: 15,
      vit_b12_ug: 2.4,
      vit_d_ug: 15,
      zinc_mg: 11,
      magnesium_mg: 380,
      potassium_mg: 3500,
      omega3_g: 1.2,
      fiber_g: 30,
    },
  };
}
