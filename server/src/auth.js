import express from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import db from "./db.js";

const router = express.Router();

const ACCESS_TOKEN_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC || 900); // 15m

function signAccessToken(user) {
  const jti = uuidv4();
  const token = jwt.sign(
    {
      sub: user.id,
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

function requireEnv(keys) {
  for (const k of keys) {
    if (!process.env[k]) {
      throw new Error(`Missing env: ${k}`);
    }
  }
}

// Helper function to get user with profile and role
async function getUserWithProfile(userId) {
  const { data: profile, error: profileError } = await db
    .from('admin_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (profileError || !profile) return null;
  
  // Get user from auth.users via admin API
  const { data: authUser, error: authError } = await db.auth.admin.getUserById(userId);
  
  if (authError || !authUser) return null;
  
  return {
    id: authUser.user.id,
    email: authUser.user.email,
    fullName: profile.full_name,
    role: profile.role,
    roles: [profile.role], // For compatibility
    is_active: profile.is_active,
  };
}

// Helper function to check if user is superadmin
async function isSuperadmin(userId) {
  const { data: profile } = await db
    .from('admin_profiles')
    .select('role')
    .eq('id', userId)
    .eq('is_active', true)
    .single();
  
  return profile?.role === 'superadmin';
}

// Login endpoint - uses Supabase Auth
router.post('/auth/login', async (req, res) => {
  try {
    requireEnv(['JWT_SECRET']);
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId = authData.user.id;

    // Get admin profile
    const { data: profile, error: profileError } = await db
      .from('admin_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User is not an admin' });
    }

    if (!profile.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    const user = {
      id: authData.user.id,
      email: authData.user.email,
      fullName: profile.full_name,
      role: profile.role,
      roles: [profile.role],
    };

    const { token: accessToken, jti, expiresAt } = signAccessToken(user);

    return res.json({
      accessToken,
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: authData.session?.refresh_token || '',
      refreshTokenExpiresAt: authData.session?.expires_at 
        ? new Date(authData.session.expires_at * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
      },
    });
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({ error: e.message || 'Login failed' });
  }
});

// Register endpoint - only superadmin can create accounts
router.post('/auth/register', async (req, res) => {
  try {
    requireEnv(['JWT_SECRET']);
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify token and check if user is superadmin
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const currentUserId = payload.sub;
    const isSuper = await isSuperadmin(currentUserId);
    
    if (!isSuper) {
      return res.status(403).json({ error: 'Only superadmin can create accounts' });
    }

    const { email, password, fullName, role = 'admin' } = req.body || {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password, fullName are required' });
    }

    // Validate role
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "superadmin"' });
    }

    // Check if email already exists
    const { data: existingUser } = await db.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === email);
    
    if (emailExists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user via Supabase Auth Admin API
    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !newUser?.user) {
      return res.status(500).json({ error: createError?.message || 'Failed to create user' });
    }

    const userId = newUser.user.id;

    // Create admin profile
    const { error: profileError } = await db
      .from('admin_profiles')
      .insert({
        id: userId,
        full_name: fullName,
        role: role,
        is_active: true,
      });

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await db.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create admin profile' });
    }

    return res.json({
      id: userId,
      email: newUser.user.email,
      fullName,
      role,
    });
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({ error: e.message || 'Registration failed' });
  }
});

// Refresh token endpoint - uses Supabase Auth refresh
router.post('/auth/refresh', async (req, res) => {
  try {
    requireEnv(['JWT_SECRET']);
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Refresh session with Supabase Auth
    // Note: Using admin API to refresh session
    const { data: sessionData, error: refreshError } = await db.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (refreshError || !sessionData?.session?.user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const userId = sessionData.session.user.id;

    // Get admin profile
    const { data: profile, error: profileError } = await db
      .from('admin_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.is_active) {
      return res.status(401).json({ error: 'User is not active or not an admin' });
    }

    const user = {
      id: sessionData.session.user.id,
      email: sessionData.session.user.email,
      fullName: profile.full_name,
      role: profile.role,
      roles: [profile.role],
    };

    const { token: accessToken, jti, expiresAt } = signAccessToken(user);

    return res.json({
      accessToken,
      accessTokenExpiresAt: expiresAt.toISOString(),
      refreshToken: sessionData.session.refresh_token,
      refreshTokenExpiresAt: sessionData.session.expires_at
        ? new Date(sessionData.session.expires_at * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (e) {
    console.error('Refresh error:', e);
    return res.status(500).json({ error: e.message || 'Token refresh failed' });
  }
});

// Logout endpoint
router.post('/auth/logout', async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const { refreshToken } = req.body || {};

    // Sign out from Supabase Auth
    if (refreshToken) {
      await db.auth.signOut();
    }

    // Blacklist the access token if provided
    if (bearer) {
      try {
        const decoded = jwt.verify(bearer, process.env.JWT_SECRET);
        const expMs = decoded.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;
        
        // Note: If you want to keep token blacklist, you can create a table for it
        // For now, we rely on Supabase Auth session management
      } catch (_) {
        // ignore
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('Logout error:', e);
    return res.status(500).json({ error: e.message || 'Logout failed' });
  }
});

// Middleware to require authentication
export function requireAuth(roles = []) {
  return async (req, res, next) => {
    try {
      const auth = req.headers['authorization'] || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userId = payload.sub;

      // Get user profile to verify it still exists and is active
      const { data: profile } = await db
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile || !profile.is_active) {
        return res.status(401).json({ error: 'User is not active' });
      }

      req.user = {
        id: userId,
        email: payload.email,
        roles: payload.roles || [profile.role],
        role: profile.role,
      };

      // Check role requirements
      if (roles.length > 0) {
        const hasRole = req.user.roles.some((r) => roles.includes(r));
        if (!hasRole) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      next();
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

export default router;
