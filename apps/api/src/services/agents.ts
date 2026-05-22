import { config } from '../config';
import { generateFallbackMealPlan } from './mealPlanFallback';
import { planMeetsTargets } from './planDayTotals';

const AGENT_TIMEOUT_MS = 8000;

export class AgentsUnavailableError extends Error {
  constructor(message = 'AI agents service is not running') {
    super(message);
    this.name = 'AgentsUnavailableError';
  }
}

export async function callAgentService<T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> {
  const base = config.agentsServiceUrl.replace('localhost', '127.0.0.1');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Agent service error: ${err}`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AgentsUnavailableError('AI agents service timed out');
    }
    throw new AgentsUnavailableError(
      err instanceof Error ? err.message : 'AI agents service unreachable'
    );
  }
}

function parseMacroTargets(user: Record<string, unknown>): { protein_g: number; carbs_g: number; fat_g: number } {
  const raw = user.macro_targets;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { protein_g: 130, carbs_g: 400, fat_g: 70 };
    }
  }
  return (raw as { protein_g: number; carbs_g: number; fat_g: number }) || {
    protein_g: 130,
    carbs_g: 400,
    fat_g: 70,
  };
}

function shouldUseScaledFallback(user: Record<string, unknown>): boolean {
  const calorieTarget = Number(user.daily_calorie_target) || 2000;
  const goal = String(user.goal_type || '');
  const macros = parseMacroTargets(user);
  return goal === 'gain' || calorieTarget >= 2400 || macros.protein_g >= 110;
}

/** Meal plan: always use scaled TS fallback for muscle-gain / high-calorie users; validate agent output otherwise. */
export async function generateMealPlanForUser(user: Record<string, unknown>): Promise<{
  plan_json: unknown;
  festival_adapted?: string | null;
  source: 'agents' | 'fallback';
}> {
  const calorieTarget = Number(user.daily_calorie_target) || 2000;
  const macros = parseMacroTargets(user);

  if (shouldUseScaledFallback(user)) {
    const fallback = generateFallbackMealPlan(user);
    return { ...fallback, source: 'fallback' };
  }

  try {
    const result = await callAgentService<{ plan_json: unknown; festival_adapted?: string }>(
      '/api/v1/agents/meal-planner',
      { user }
    );
    const planJson = result.plan_json as { days?: Record<string, Record<string, unknown>> };
    if (!planMeetsTargets(planJson, calorieTarget, macros.protein_g)) {
      console.warn('Agent meal plan below user targets — using scaled fallback');
      const fallback = generateFallbackMealPlan(user);
      return { ...fallback, source: 'fallback' };
    }
    return { ...result, source: 'agents' };
  } catch (e) {
    console.warn('Agents offline — using local meal plan fallback:', (e as Error).message);
    const fallback = generateFallbackMealPlan(user);
    return { ...fallback, source: 'fallback' };
  }
}

export async function runFullPipeline(userId: string, onboardingData: Record<string, unknown>) {
  return callAgentService<{ profile: unknown; nutrition: unknown; meal_plan: unknown }>(
    '/api/v1/orchestrate',
    { user_id: userId, onboarding: onboardingData }
  );
}
