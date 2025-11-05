import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import db from "./db.js";

const router = express.Router();

const ACCESS_TOKEN_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC || 900); // 15m
const REFRESH_TOKEN_TTL_SEC = Number(process.env.REFRESH_TOKEN_TTL_SEC || 60 * 60 * 24 * 7); // 7d

function signAccessToken(user) {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      roles: user.roles || [],
      jti,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SEC }
  );
  const exp = new Date(Date.now() + ACCESS_TOKEN_TTL_SEC * 1000);
  return { token, jti, expiresAt: exp };
}

function createRefreshToken() {
  const raw = uuidv4() + "." + uuidv4();
  return raw;
}

async function hashToken(raw) {
  const saltRounds = 10;
  return bcrypt.hash(raw, saltRounds);
}

async function getUserWithRolesByEmail(email) {
  const user = await db('users').where({ email }).first();
  if (!user) return null;
  const roles = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', user.id)
    .pluck('roles.name');
  return { ...user, roles };
}

function requireEnv(keys) {
  for (const k of keys) {
    if (!process.env[k]) {
      throw new Error(`Missing env: ${k}`);
    }
  }
}

router.post('/auth/register', async (req, res) => {
  try {
    requireEnv(['JWT_SECRET']);
    const { email, password, fullName, roles = [] } = req.body || {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password, fullName are required' });
    }
    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [id] = await db('users').insert({ email, password_hash: passwordHash, full_name: fullName });

    if (Array.isArray(roles) && roles.length > 0) {
      const dbRoles = await db('roles').whereIn('name', roles);
      const rows = dbRoles.map((r) => ({ user_id: id, role_id: r.id }));
      if (rows.length) await db('user_roles').insert(rows);
    }

    return res.json({ id, email, fullName });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    requireEnv(['JWT_SECRET']);
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await getUserWithRolesByEmail(email);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const { token: accessToken, jti, expiresAt } = signAccessToken(user);
    const refreshRaw = createRefreshToken();
    const refreshHash = await hashToken(refreshRaw);
    const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);

    await db('tokens').insert({
      user_id: user.id,
      token_hash: refreshHash,
      type: 'refresh',
      user_agent: req.headers['user-agent'] || null,
      ip_address: req.ip || null,
      expires_at: refreshExpires,
    });

    return res.json({
      accessToken,
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: refreshRaw,
      refreshTokenExpiresAt: refreshExpires.toISOString(),
      user: { id: user.id, email: user.email, fullName: user.full_name, roles: user.roles },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/auth/refresh', async (req, res) => {
  try {
    requireEnv(['JWT_SECRET']);
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    // Find a matching (by bcrypt) non-revoked, non-expired token
    const candidates = await db('tokens')
      .where({ type: 'refresh' })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', db.fn.now())
      .orderBy('id', 'desc');

    let tokenRow = null;
    for (const row of candidates) {
      const match = await bcrypt.compare(refreshToken, row.token_hash);
      if (match) { tokenRow = row; break; }
    }
    if (!tokenRow) return res.status(401).json({ error: 'Invalid refresh token' });

    // rotate token: revoke old, issue new
    await db('tokens').where({ id: tokenRow.id }).update({ revoked_at: db.fn.now() });

    const user = await db('users').where({ id: tokenRow.user_id }).first();
    const roles = await db('user_roles')
      .join('roles', 'user_roles.role_id', 'roles.id')
      .where('user_roles.user_id', user.id)
      .pluck('roles.name');
    const { token: accessToken, jti, expiresAt } = signAccessToken({ ...user, roles });

    const newRefreshRaw = createRefreshToken();
    const newRefreshHash = await hashToken(newRefreshRaw);
    const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000);
    await db('tokens').insert({
      user_id: user.id,
      token_hash: newRefreshHash,
      type: 'refresh',
      user_agent: req.headers['user-agent'] || null,
      ip_address: req.ip || null,
      expires_at: refreshExpires,
    });

    return res.json({
      accessToken,
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: newRefreshRaw,
      refreshTokenExpiresAt: refreshExpires.toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const { refreshToken } = req.body || {};

    if (bearer) {
      try {
        const decoded = jwt.verify(bearer, process.env.JWT_SECRET);
        const expMs = decoded.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;
        await db('token_blacklist').insert({ jti: decoded.jti, expires_at: new Date(expMs) });
      } catch (_) {
        // ignore
      }
    }

    if (refreshToken) {
      const candidates = await db('tokens').where({ type: 'refresh' }).whereNull('revoked_at');
      for (const row of candidates) {
        const match = await bcrypt.compare(refreshToken, row.token_hash);
        if (match) {
          await db('tokens').where({ id: row.id }).update({ revoked_at: db.fn.now() });
          break;
        }
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export function requireAuth(roles = []) {
  return async (req, res, next) => {
    try {
      const auth = req.headers['authorization'] || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      // check blacklist
      const blacklisted = await db('token_blacklist').where({ jti: payload.jti }).first();
      if (blacklisted) return res.status(401).json({ error: 'Token revoked' });

      req.user = { id: Number(payload.sub), email: payload.email, roles: payload.roles || [] };
      if (roles.length > 0) {
        const has = req.user.roles.some((r) => roles.includes(r));
        if (!has) return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

export default router;


