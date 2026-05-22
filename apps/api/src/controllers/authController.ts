import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/pool';
import { config } from '../config';
import { AuthRequest, AuthPayload } from '../middleware/auth';

function signTokens(userId: string, email: string, role: string) {
  const payload: AuthPayload = { userId, email, role };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

export async function signup(req: AuthRequest, res: Response) {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (email, name, password_hash, auth_provider)
     VALUES ($1, $2, $3, 'email') RETURNING id, email, name, role, onboarding_completed`,
    [email.toLowerCase(), name || null, passwordHash]
  );

  const user = result.rows[0];
  const tokens = signTokens(user.id, user.email, user.role || 'user');

  const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshHash, expiresAt]
  );

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, onboardingCompleted: user.onboarding_completed },
    ...tokens,
    disclaimer: config.medicalDisclaimer,
  });
}

export async function login(req: AuthRequest, res: Response) {
  const { email, password } = req.body;
  const result = await pool.query(
    'SELECT id, email, name, password_hash, role, onboarding_completed FROM users WHERE email = $1',
    [email?.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = result.rows[0];
  if (!user.password_hash) {
    return res.status(401).json({ error: 'Use social login for this account' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const tokens = signTokens(user.id, user.email, user.role || 'user');
  const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
    [user.id, refreshHash]
  );

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboardingCompleted: user.onboarding_completed,
    },
    ...tokens,
    disclaimer: config.medicalDisclaimer,
  });
}

export async function refresh(req: AuthRequest, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as AuthPayload;
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await pool.query(
      'SELECT id FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()',
      [payload.userId, hash]
    );
    if (stored.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = signTokens(payload.userId, payload.email, payload.role);
    res.json(tokens);
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

export async function me(req: AuthRequest, res: Response) {
  const result = await pool.query(
    `SELECT id, email, name, role, avatar_url, onboarding_completed,
            age, gender, height_cm, weight_kg, target_weight_kg, goal_type,
            activity_level, diet_type, location_city, location_country,
            daily_calorie_target, macro_targets, micro_targets, water_goal_ml,
            allergies, health_conditions, motivation_style, profile_json, risk_flags
     FROM users WHERE id = $1`,
    [req.user!.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ user: result.rows[0], disclaimer: config.medicalDisclaimer });
}

export async function forgotPassword(req: AuthRequest, res: Response) {
  const { email } = req.body;
  // In production: send email with reset token
  res.json({ message: 'If the email exists, a reset link has been sent.' });
}

export async function resetPassword(req: AuthRequest, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  res.json({ message: 'Password reset successful' });
}

export async function googleLogin(req: AuthRequest, res: Response) {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Google credential required' });
  }
  if (!config.googleClientId) {
    return res.status(503).json({ error: 'Google OAuth not configured on the server' });
  }

  try {
    const tokenRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!tokenRes.ok) {
      return res.status(401).json({ error: 'Invalid Google sign-in' });
    }
    const payload = (await tokenRes.json()) as {
      aud: string;
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: string;
    };

    if (payload.aud !== config.googleClientId) {
      return res.status(401).json({ error: 'Invalid Google sign-in' });
    }
    if (payload.email_verified === 'false') {
      return res.status(401).json({ error: 'Google email not verified' });
    }

    req.body = {
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    };
    return oauthCallback(req, res);
  } catch {
    return res.status(500).json({ error: 'Google sign-in failed' });
  }
}

export async function oauthCallback(req: AuthRequest, res: Response) {
  const { provider, providerId, email, name, avatarUrl } = req.body;
  let result = await pool.query('SELECT * FROM users WHERE email = $1', [email?.toLowerCase()]);

  if (result.rows.length === 0) {
    result = await pool.query(
      `INSERT INTO users (email, name, auth_provider, avatar_url, onboarding_completed)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      [email.toLowerCase(), name, provider, avatarUrl]
    );
  }

  const user = result.rows[0];
  const tokens = signTokens(user.id, user.email, user.role || 'user');
  const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
    [user.id, refreshHash]
  );

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboardingCompleted: user.onboarding_completed,
    },
    ...tokens,
    disclaimer: config.medicalDisclaimer,
  });
}
