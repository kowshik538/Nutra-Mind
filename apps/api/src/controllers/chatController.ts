import { Response } from 'express';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { callAgentService, AgentsUnavailableError } from '../services/agents';
import { generateChatReply } from '../services/chatCoachFallback';
import {
  parseTargetsFromMessage,
  wantsMealPlanUpdate,
  isGenericCoachReply,
  resolveUserTargets,
} from '../services/nutritionTargets';
import { applyUserTargetsAndRegenerateMealPlan } from '../services/applyUserTargets';

export async function getChatHistory(req: AuthRequest, res: Response) {
  const result = await pool.query(
    'SELECT id, role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT 100',
    [req.user!.userId]
  );
  res.json({ messages: result.rows, disclaimer: config.medicalDisclaimer });
}

export async function sendMessage(req: AuthRequest, res: Response) {
  const { message } = req.body;
  const userId = req.user!.userId;

  await pool.query(
    'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
    [userId, 'user', message]
  );

  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const history = await pool.query(
    'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
    [userId]
  );

  const parsed = parseTargetsFromMessage(message);
  const shouldRebuild =
    parsed &&
    (wantsMealPlanUpdate(message) ||
      message.length > 350 ||
      (parsed.goal_type === 'gain' && Boolean(parsed.daily_calorie_target || parsed.macro_targets)));

  let response: { reply: string; actions?: unknown[] };

  if (shouldRebuild) {
    const targets = resolveUserTargets(parsed, user.rows[0]);
    const result = await applyUserTargetsAndRegenerateMealPlan(userId, targets);
    response = {
      reply: `${result.message}\n\n—\n${config.medicalDisclaimer}`,
      actions: [{ type: 'navigate', path: '/meal-plan' }],
    };
  } else {
    try {
      response = await callAgentService<{ reply: string; actions?: unknown[] }>(
        '/api/v1/agents/coach/chat',
        {
          user: user.rows[0],
          message,
          history: history.rows.reverse(),
        }
      );
    } catch (e) {
      if (!(e instanceof AgentsUnavailableError)) throw e;
      response = generateChatReply(user.rows[0], message, history.rows.reverse());
    }

    if (isGenericCoachReply(response.reply) || parsed) {
      const fallback = generateChatReply(user.rows[0], message, history.rows.reverse());
      if (!isGenericCoachReply(fallback.reply) || parsed) {
        response = fallback;
      }
      if (parsed && !wantsMealPlanUpdate(message)) {
        const t = resolveUserTargets(parsed, user.rows[0]);
        const m = t.macro_targets!;
        response.reply =
          `Here are the targets I parsed from your message:\n\n` +
          `• Calories: ${t.daily_calorie_target} kcal/day\n` +
          `• Protein: ${m.protein_g}g · Carbs: ${m.carbs_g}g · Fat: ${m.fat_g}g\n\n` +
          `Say "fix my meal plan according to that" and I'll regenerate your full week.\n\n—\n${config.medicalDisclaimer}`;
      }
    }
  }

  await pool.query(
    'INSERT INTO chat_messages (user_id, role, content, metadata) VALUES ($1, $2, $3, $4)',
    [userId, 'assistant', response.reply, JSON.stringify({ actions: response.actions })]
  );

  res.json({
    reply: response.reply,
    actions: response.actions,
    disclaimer: config.medicalDisclaimer,
  });
}
