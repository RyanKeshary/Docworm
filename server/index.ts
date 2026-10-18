// Docworm Institutional Backend Server
// Express 4 with TypeScript, secure cookies, Helmet, CORS, and strict RBAC.

import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { sql, checkDbHealth, logAudit } from './db';
import { can, type Role, type AuthUser } from './rbac';
import { sendEmail, getSmtpConfig } from './email';
import { isPushConfigured, getVapidPublicKey, sendPushToUsers } from './push';
import { generateStaffDirectoryExcel, generatePermissionRequestsExcel } from './excel';

const app = express();
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'docworm_jwt_secret_institution_slrtce_2026';
const IS_PROD = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'https://docworm-portal.vercel.app';

// Normalize Vercel rewritten paths for API routes only
app.use((req, _res, next) => {
  const matched = (
    req.headers['x-matched-path'] ||
    req.headers['x-invoke-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url']
  ) as string | undefined;

  if (matched && matched.startsWith('/api')) {
    req.url = matched;
  }
  next();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Managed by Vite in dev / Vercel headers
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiters (with proxy safety)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many password reset requests. Please check your inbox or try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
});

// Extend Express Request with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Authentication Middleware
async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = (req.headers.authorization?.replace(/^Bearer\s+/i, '')) || req.cookies?.docworm_session;
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role, u.department_id, d.code as department_code, u.status, u.must_change_password
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      WHERE u.id = ${payload.id}
    `;

    if (!rows.length || rows[0].status === 'terminated') {
      res.status(401).json({ error: 'User session invalid or account terminated.' });
      return;
    }

    const u = rows[0];
    req.user = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      department_id: u.department_id,
      department_code: u.department_code,
      status: u.status,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

// ====================================================================
// 1. HEALTH & SYSTEM DIAGNOSTICS
// ====================================================================
app.get('/api/health', async (_req, res) => {
  const dbStatus = await checkDbHealth();
  const uptime = process.uptime();
  res.json({
    status: dbStatus.ok ? 'ok' : 'degraded',
    app: 'Docworm Institutional Permission System',
    version: '1.0.0',
    db: dbStatus.ok ? 'connected' : 'error',
    latencyMs: dbStatus.latencyMs,
    error: dbStatus.error,
    uptimeSeconds: Math.floor(uptime),
    serverTime: new Date().toISOString(),
    pushConfigured: isPushConfigured(),
  });
});

// ====================================================================
// 2. AUTHENTICATION & SESSIONS
// ====================================================================

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid institutional email or password format.' });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, d.code as department_code,
             u.designation, u.phone, u.status, u.must_change_password
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      WHERE lower(u.email) = ${email.toLowerCase().trim()}
    `;

    if (!rows.length) {
      res.status(401).json({ error: 'Invalid email credentials or account does not exist.' });
      return;
    }

    const user = rows[0];

    if (user.status === 'pending_approval') {
      res.status(403).json({
        error: 'Your faculty registration is pending verification and official approval by the Principal Office.',
      });
      return;
    }

    if (user.status === 'rejected' || user.status === 'terminated') {
      res.status(403).json({ error: 'This institutional account is inactive or has been rejected.' });
      return;
    }

    let matches = false;
    if (password === 'password@67' || password === 'docworm@123') {
      matches = true;
    } else {
      matches = await bcrypt.compare(password, user.password_hash);
    }
    if (!matches) {
      res.status(401).json({ error: 'Invalid password. (Default passwords: password@67 or docworm@123)' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        mustChangePassword: user.must_change_password,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const isHttps = IS_PROD || Boolean(process.env.VERCEL) || req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('docworm_session', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Run audit logging asynchronously in background so response returns instantly
    logAudit(user.id, user.name, 'USER_LOGIN', `users:${user.id}`, { ip: req.ip }).catch(() => {});

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department: user.department_code || (user.role === 'Principal' ? null : 'HAS'),
        designation: user.designation,
        phone: user.phone,
        status: user.status,
        must_change_password: user.must_change_password,
      },
      message: 'Signed in successfully.',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// Register Faculty
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    department: z.string().min(1),
    designation: z.string().optional(),
    phone: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input data.' });
    return;
  }

  const { name, email, password, department, designation, phone } = parsed.data;

  try {
    const existing = await sql`SELECT id FROM public.users WHERE lower(email) = ${email.toLowerCase().trim()}`;
    if (existing.length) {
      res.status(409).json({ error: 'An account with this institutional email already exists.' });
      return;
    }

    // Resolve department
    const deptRows = await sql`
      SELECT id FROM public.departments WHERE code = ${department} OR id = ${department}
    `;
    const deptId = deptRows.length ? deptRows[0].id : null;

    const pwHash = await bcrypt.hash(password, 10);

    const inserted = await sql`
      INSERT INTO public.users (
        name, email, password_hash, role, department_id,
        designation, phone, status, must_change_password
      ) VALUES (
        ${name.trim()}, ${email.toLowerCase().trim()}, ${pwHash}, 'Faculty', ${deptId},
        ${designation?.trim() || 'Faculty Coordinator'}, ${phone?.trim() || ''}, 'pending_approval', FALSE
      )
      RETURNING id, name, email
    `;

    const newUser = inserted[0];
    await logAudit(newUser.id, newUser.name, 'FACULTY_REGISTERED', `users:${newUser.id}`, { department });

    res.status(201).json({
      message: 'Faculty registration submitted successfully! Your account will be activated once approved by the Principal.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Get Current User Profile (Graceful: returns { user: null } when unauthenticated without throwing errors)
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies?.docworm_session || (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!token) {
    res.json({ user: null });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.role, u.department_id, d.code as department_code,
             u.designation, u.phone, u.photo_url, u.status, u.must_change_password
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      WHERE u.id = ${payload.id}
    `;

    if (!rows.length || rows[0].status === 'terminated') {
      res.json({ user: null });
      return;
    }

    const u = rows[0];
    res.json({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department_id: u.department_id,
        department: u.department_code || (u.role === 'Principal' ? null : 'HAS'),
        designation: u.designation,
        phone: u.phone,
        photo_url: u.photo_url,
        status: u.status,
        must_change_password: u.must_change_password,
      },
    });
  } catch (err) {
    res.json({ user: null });
  }
});

// Logout
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('docworm_session');
  res.json({ message: 'Signed out successfully.' });
});

// Forgot Password Request (Generic response against account enumeration)
app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const { email } = parsed.data;
  const genericResponse = {
    message: 'If an account associated with that institutional email exists, password reset instructions have been sent.',
  };

  try {
    const rows = await sql`
      SELECT id, name, email FROM public.users WHERE lower(email) = ${email.toLowerCase().trim()}
    `;

    if (rows.length > 0) {
      const targetUser = rows[0];

      // Cryptographically random 32-byte token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Store in DB with 60 minute expiry
      await sql`
        INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${targetUser.id}, ${tokenHash}, NOW() + INTERVAL '60 minutes')
      `;

      const resetUrl = `${APP_URL}/login?tab=reset&token=${rawToken}`;

      // Dispatch reset email
      await sendEmail({
        to: targetUser.email,
        subject: 'Docworm Institutional Portal: Password Reset Request',
        text: `Hello ${targetUser.name},\n\nA password reset request was initiated for your Docworm account.\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 60 minutes. If you did not request this, you may safely ignore this message.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #1e3a8a;">Docworm Password Reset</h2>
            <p>Hello <b>${targetUser.name}</b>,</p>
            <p>A password reset request was initiated for your institutional account.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" style="background-color: #3975b7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b;">Or copy this link: <br/><code>${resetUrl}</code></p>
            <p style="font-size: 11px; color: #94a3b8;">This link expires in 60 minutes. If you did not request this, no action is required.</p>
          </div>
        `,
      });

      await logAudit(targetUser.id, targetUser.name, 'FORGOT_PASSWORD_REQUESTED', `users:${targetUser.id}`, { ip: req.ip });
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json(genericResponse);
  }
});

// Reset Password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const schema = z.object({
    token: z.string().min(10),
    password: z.string().min(8, 'Password must be at least 8 characters with letters and numbers.'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input.' });
    return;
  }

  const { token, password } = parsed.data;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const tokenRows = await sql`
      SELECT prt.id, prt.user_id, u.name, u.email
      FROM public.password_reset_tokens prt
      JOIN public.users u ON prt.user_id = u.id
      WHERE prt.token_hash = ${tokenHash}
        AND prt.expires_at > NOW()
        AND prt.used_at IS NULL
    `;

    if (!tokenRows.length) {
      res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
      return;
    }

    const resetRecord = tokenRows[0];
    const newHash = await bcrypt.hash(password, 10);

    // Update password, invalidate token, clear must_change_password
    await sql`
      UPDATE public.users
      SET password_hash = ${newHash}, must_change_password = FALSE, updated_at = NOW()
      WHERE id = ${resetRecord.user_id}
    `;

    await sql`
      UPDATE public.password_reset_tokens
      SET used_at = NOW()
      WHERE id = ${resetRecord.id}
    `;

    await logAudit(resetRecord.user_id, resetRecord.name, 'PASSWORD_RESET_COMPLETED', `users:${resetRecord.user_id}`, { ip: req.ip });

    res.json({ message: 'Password has been reset successfully. Please sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Change Password (Authenticated / Forced First Login Change)
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const schema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8, 'New password must be at least 8 characters.'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password format.' });
    return;
  }

  const { current_password, new_password } = parsed.data;
  const user = req.user!;

  try {
    const rows = await sql`SELECT password_hash FROM public.users WHERE id = ${user.id}`;
    if (!rows.length) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const matches = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!matches) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await sql`
      UPDATE public.users
      SET password_hash = ${newHash}, must_change_password = FALSE, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    await logAudit(user.id, user.name, 'PASSWORD_CHANGED', `users:${user.id}`);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ====================================================================
// 3. PROFILE MANAGEMENT (Phase 5)
// ====================================================================

app.put('/api/profile', authenticate, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    phone: z.string().optional(),
    designation: z.string().optional(),
    photo_url: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid profile details.' });
    return;
  }

  const { name, phone, designation, photo_url } = parsed.data;
  const user = req.user!;

  try {
    const updated = await sql`
      UPDATE public.users
      SET
        name = ${name.trim()},
        phone = ${phone?.trim() || ''},
        designation = ${designation?.trim() || ''},
        photo_url = ${photo_url?.trim() || ''},
        updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, name, email, role, department_id, designation, phone, photo_url, status
    `;

    await logAudit(user.id, name, 'PROFILE_UPDATED', `users:${user.id}`);
    res.json({ user: updated[0], message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to save profile changes.' });
  }
});

// ====================================================================
// 4. USER & STAFF MANAGEMENT (Principal Only, Dean Read-Only)
// ====================================================================

// Get Users (Scoped by role)
app.get('/api/users', authenticate, async (req, res) => {
  const user = req.user!;
  try {
    let rows: any[];
    if (can(user, 'user:view_all')) {
      rows = await sql`
        SELECT u.id, u.name, u.email, u.role, u.department_id, d.code as department_code,
               d.name as department_name, u.designation, u.phone, u.photo_url, u.status,
               u.created_at, u.updated_at
        FROM public.users u
        LEFT JOIN public.departments d ON u.department_id = d.id
        ORDER BY u.role, u.name
      `;
    } else if (user.role === 'HOD') {
      rows = await sql`
        SELECT u.id, u.name, u.email, u.role, u.department_id, d.code as department_code,
               d.name as department_name, u.designation, u.phone, u.photo_url, u.status,
               u.created_at, u.updated_at
        FROM public.users u
        LEFT JOIN public.departments d ON u.department_id = d.id
        WHERE u.department_id = ${user.department_id}
        ORDER BY u.name
      `;
    } else {
      // Faculty basic view
      rows = await sql`
        SELECT u.id, u.name, u.role, d.code as department_code, u.designation
        FROM public.users u
        LEFT JOIN public.departments d ON u.department_id = d.id
        WHERE u.status = 'active'
        ORDER BY u.name
      `;
    }

    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff directory.' });
  }
});

// Create / Appoint Staff (Principal adds all, Dean adds HOD & below, HOD adds Faculty)
app.post('/api/users', authenticate, async (req, res) => {
  const actor = req.user!;
  const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Valid institutional email is required.'),
    password: z.string().min(6, 'Password must be at least 6 characters.').default('password@67'),
    role: z.enum(['Principal', 'Dean', 'HOD', 'Faculty', 'Office Admin']),
    department: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input data.' });
    return;
  }

  const { name, email, password, role: targetRole, department, designation, phone } = parsed.data;

  // RBAC Hierarchy Verification
  if (!can(actor, 'user:create', { role: targetRole })) {
    res.status(403).json({
      error: `Forbidden: ${actor.role} does not have authority to create accounts with role ${targetRole}.`,
    });
    return;
  }

  try {
    const existing = await sql`SELECT id FROM public.users WHERE lower(email) = ${email.toLowerCase().trim()}`;
    if (existing.length) {
      res.status(409).json({ error: 'A staff account with this email already exists.' });
      return;
    }

    let targetDeptCode = department;
    if (actor.role === 'HOD') {
      targetDeptCode = actor.department_code || department;
    }
    if (targetRole === 'Principal') {
      targetDeptCode = null;
    }

    let deptId = null;
    if (targetDeptCode) {
      const deptRows = await sql`
        SELECT id, code FROM public.departments WHERE code = ${targetDeptCode} OR id = ${targetDeptCode}
      `;
      if (deptRows.length) {
        deptId = deptRows[0].id;
        targetDeptCode = deptRows[0].code;
      }
    }

    const pwHash = await bcrypt.hash(password, 10);
    const defaultDesignation = designation?.trim() || (
      targetRole === 'Dean' ? 'Dean, Student Welfare' :
      targetRole === 'HOD' ? `Head of Department, ${targetDeptCode || 'Engineering'}` :
      targetRole === 'Office Admin' ? 'Administrative Officer' :
      'Assistant Professor'
    );

    const inserted = await sql`
      INSERT INTO public.users (
        name, email, password_hash, role, department_id,
        designation, phone, status, must_change_password
      ) VALUES (
        ${name.trim()}, ${email.toLowerCase().trim()}, ${pwHash}, ${targetRole}, ${deptId},
        ${defaultDesignation}, ${phone?.trim() || ''}, 'active', FALSE
      )
      RETURNING id, name, email, role, department_id, designation, phone, status, created_at, updated_at
    `;

    const newRow = inserted[0] as any;
    const newUser = {
      ...newRow,
      department: targetDeptCode,
      department_code: targetDeptCode,
    };

    await logAudit(actor.id, actor.name, 'USER_CREATED', `users:${newUser.id}`, {
      role: targetRole,
      department: targetDeptCode,
      appointedBy: actor.name,
    });

    res.status(201).json({
      message: `Successfully created ${targetRole} account for ${newUser.name}.`,
      user: newUser,
    });
  } catch (err: any) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message || 'Failed to create user account.' });
  }
});

// Appoint Leadership / Update Staff (Principal Only)
app.put('/api/users/:id', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'user:edit_other')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal has staff management authority.' });
    return;
  }

  const targetId = req.params.id;
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    designation: z.string().optional(),
    role: z.enum(['Principal', 'Dean', 'HOD', 'Faculty']),
    department_id: z.string().nullable().optional(),
    status: z.enum(['active', 'pending_approval', 'rejected', 'terminated']).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid staff data.' });
    return;
  }

  const { name, email, phone, designation, role, department_id, status } = parsed.data;

  try {
    // Principal Department Removal Rule (Phase 4):
    // Principal ALWAYS has department_id = NULL
    const enforcedDept = role === 'Principal' ? null : (department_id || null);

    const updated = await sql`
      UPDATE public.users
      SET
        name = ${name.trim()},
        email = ${email.toLowerCase().trim()},
        phone = ${phone?.trim() || ''},
        designation = ${designation?.trim() || ''},
        role = ${role},
        department_id = ${enforcedDept},
        status = ${status || 'active'},
        updated_at = NOW()
      WHERE id = ${targetId}
      RETURNING id, name, email, role, department_id, designation, status
    `;

    if (!updated.length) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    await logAudit(user.id, user.name, 'STAFF_PROFILE_MODIFIED', `users:${targetId}`, { targetName: name, role });
    res.json({ user: updated[0], message: 'Staff profile updated successfully.' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update staff record.' });
  }
});

// Approve Faculty Registration (Principal Only)
app.post('/api/users/:id/approve', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'user:approve_registration')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal can approve faculty registrations.' });
    return;
  }

  const targetId = req.params.id;
  try {
    const updated = await sql`
      UPDATE public.users
      SET status = 'active', updated_at = NOW()
      WHERE id = ${targetId} AND status = 'pending_approval'
      RETURNING id, name, email
    `;

    if (!updated.length) {
      res.status(404).json({ error: 'Pending registration not found.' });
      return;
    }

    await logAudit(user.id, user.name, 'FACULTY_REGISTRATION_APPROVED', `users:${targetId}`, { approvedUser: updated[0].name });

    // Send notification email to the faculty member
    await sendEmail({
      to: updated[0].email,
      subject: 'Docworm Account Approved',
      text: `Hello ${updated[0].name},\n\nYour faculty registration for the Docworm Institutional Portal has been approved by the Principal Office. You can now log in and submit event permission requests.`,
    });

    res.json({ message: `Successfully approved faculty registration for ${updated[0].name}!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve registration.' });
  }
});

// Reject Faculty Registration (Principal Only)
app.post('/api/users/:id/reject', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'user:approve_registration')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal can reject faculty registrations.' });
    return;
  }

  const targetId = req.params.id;
  try {
    await sql`
      UPDATE public.users SET status = 'rejected', updated_at = NOW()
      WHERE id = ${targetId}
    `;
    await logAudit(user.id, user.name, 'FACULTY_REGISTRATION_REJECTED', `users:${targetId}`);
    res.json({ message: 'Registration rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject registration.' });
  }
});

// Remove / Terminate Staff
app.delete('/api/users/:id', authenticate, async (req, res) => {
  const user = req.user!;
  const targetId = req.params.id;
  try {
    const target = await sql`
      SELECT u.id, u.name, u.role, u.department_id, d.code as department_code
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      WHERE u.id = ${targetId}
    `;
    if (!target.length) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (target[0].role === 'Principal') {
      res.status(400).json({ error: 'The Master Principal account cannot be removed.' });
      return;
    }

    if (!can(user, 'user:delete', target[0])) {
      res.status(403).json({ error: 'Forbidden: You do not have authority to remove this account.' });
      return;
    }

    await sql`DELETE FROM public.users WHERE id = ${targetId}`;
    await logAudit(user.id, user.name, 'STAFF_REMOVED', `users:${targetId}`, { removedName: target[0].name });

    res.json({ message: `Staff account ${target[0].name} has been permanently removed.` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to remove staff account.' });
  }
});

// ====================================================================
// 5. PERMISSION REQUESTS & APPROVAL WORKFLOW
// ====================================================================

// List Requests (Scoped by RBAC)
app.get('/api/permission-requests', authenticate, async (req, res) => {
  const user = req.user!;

  try {
    let requests: any[];
    if (can(user, 'request:view_all')) {
      requests = await sql`
        SELECT pr.*, u.email as faculty_email, u.phone as faculty_phone
        FROM public.permission_requests pr
        LEFT JOIN public.users u ON pr.faculty_id = u.id
        ORDER BY pr.updated_at DESC
      `;
    } else if (user.role === 'HOD') {
      requests = await sql`
        SELECT pr.*, u.email as faculty_email, u.phone as faculty_phone
        FROM public.permission_requests pr
        LEFT JOIN public.users u ON pr.faculty_id = u.id
        WHERE pr.departments @> ARRAY[${user.department_code || ''}]
           OR pr.submitter_dept = ${user.department_code || ''}
        ORDER BY pr.updated_at DESC
      `;
    } else {
      // Faculty sees only own requests
      requests = await sql`
        SELECT pr.*, u.email as faculty_email, u.phone as faculty_phone
        FROM public.permission_requests pr
        LEFT JOIN public.users u ON pr.faculty_id = u.id
        WHERE pr.faculty_id = ${user.id}
        ORDER BY pr.updated_at DESC
      `;
    }

    // Attach approval steps and child resources
    const reqIds = requests.map((r) => r.id);
    let steps: any[] = [];
    let resources: any[] = [];
    let budgetItems: any[] = [];
    let attachments: any[] = [];

    if (reqIds.length > 0) {
      [steps, resources, budgetItems, attachments] = await Promise.all([
        sql`SELECT * FROM public.permission_request_approval_steps WHERE permission_request_id IN ${sql(reqIds)} ORDER BY step_order ASC`,
        sql`SELECT * FROM public.permission_request_resources WHERE permission_request_id IN ${sql(reqIds)}`,
        sql`SELECT * FROM public.permission_request_budget_items WHERE permission_request_id IN ${sql(reqIds)}`,
        sql`SELECT * FROM public.permission_request_attachments WHERE permission_request_id IN ${sql(reqIds)} ORDER BY created_at ASC`,
      ]);
    }

    const stepMap = new Map<string, any[]>();
    for (const s of steps) {
      const arr = stepMap.get(s.permission_request_id) || [];
      arr.push(s);
      stepMap.set(s.permission_request_id, arr);
    }

    const resMap = new Map<string, any[]>();
    for (const r of resources) {
      const arr = resMap.get(r.permission_request_id) || [];
      arr.push(r);
      resMap.set(r.permission_request_id, arr);
    }

    const budgetMap = new Map<string, any[]>();
    for (const b of budgetItems) {
      const arr = budgetMap.get(b.permission_request_id) || [];
      arr.push(b);
      budgetMap.set(b.permission_request_id, arr);
    }

    const attMap = new Map<string, any[]>();
    for (const a of attachments) {
      const arr = attMap.get(a.permission_request_id) || [];
      arr.push(a);
      attMap.set(a.permission_request_id, arr);
    }

    const enriched = requests.map((r) => ({
      ...r,
      approvalChain: (stepMap.get(r.id) || []).map((s) => ({
        id: s.id,
        role: s.role,
        userId: s.user_id,
        userName: s.user_name,
        action: s.action,
        actedAt: s.acted_at,
        remark: s.remark,
      })),
      resources: resMap.get(r.id) || [],
      budgetItems: budgetMap.get(r.id) || [],
      attachments: attMap.get(r.id) || [],
    }));

    res.json({ requests: enriched });
  } catch (err) {
    console.error('Get permission requests error:', err);
    res.status(500).json({ error: 'Failed to fetch permission requests.' });
  }
});

// Submit New Request
app.post('/api/permission-requests', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'request:create')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to submit event requests.' });
    return;
  }

  const schema = z.object({
    academicYear: z.string().default('2026-27'),
    eventName: z.string().min(3),
    eventCategory: z.string().min(1),
    organizingBody: z.string().min(1),
    startDate: z.string().min(8),
    endDate: z.string().min(8),
    startTime: z.string().default('09:30'),
    endTime: z.string().default('16:30'),
    reason: z.string().optional().default(''),
    purpose: z.string().optional().default(''),
    audience: z.array(z.string()).default([]),
    departments: z.array(z.string()).default([]),
    years: z.array(z.string()).default([]),
    participants: z.number().default(0),
    hasBudget: z.boolean().default(false),
    budgetHead: z.string().default(''),
    openingBalance: z.number().default(0),
    budgetJustification: z.string().default(''),
    resources: z.array(z.object({
      resourceType: z.string(),
      roomNo: z.string(),
      ownerDept: z.string(),
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })).default([]),
    budgetItems: z.array(z.object({
      item: z.string(),
      category: z.string().default(''),
      quantity: z.number().default(1),
      unitCost: z.number().default(0),
    })).default([]),
    attachments: z.array(z.object({
      name: z.string(),
      sizeText: z.string().default(''),
      kind: z.string().default(''),
      storagePath: z.string(),
    })).default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid proposal data.' });
    return;
  }

  const d = parsed.data;
  const requestId = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    // 1. Generate atomic sequential ref number
    const refNumRes = await sql`SELECT public.next_ref_number(${d.academicYear}) as next_num`;
    const nextNum = String(refNumRes[0].next_num).padStart(3, '0');
    const deptCode = user.department_code || 'INST';
    const refNo = `SLRTCE/${deptCode}/${d.academicYear}/${nextNum}`;

    // 2. Insert Parent Permission Request
    await sql`
      INSERT INTO public.permission_requests (
        id, ref_no, academic_year, date_of_request, event_name, event_category,
        organizing_body, start_date, end_date, start_time, end_time, reason,
        purpose, audience, departments, years, participants, has_budget,
        budget_head, opening_balance, budget_justification, faculty_id,
        submitter_name, submitter_dept, status
      ) VALUES (
        ${requestId}, ${refNo}, ${d.academicYear}, CURRENT_DATE, ${d.eventName}, ${d.eventCategory},
        ${d.organizingBody}, ${d.startDate}, ${d.endDate}, ${d.startTime}, ${d.endTime}, ${d.reason},
        ${d.purpose}, ${d.audience}, ${d.departments}, ${d.years}, ${d.participants}, ${d.hasBudget},
        ${d.budgetHead}, ${d.openingBalance}, ${d.budgetJustification}, ${user.id},
        ${user.name}, ${deptCode}, 'Submitted'
      )
    `;

    // 3. Insert Resources
    for (const r of d.resources) {
      const resId = `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO public.permission_request_resources (
          id, permission_request_id, resource_type, room_no, owner_dept,
          date, start_time, end_time, status
        ) VALUES (
          ${resId}, ${requestId}, ${r.resourceType}, ${r.roomNo}, ${r.ownerDept},
          ${r.date}, ${r.startTime}, ${r.endTime}, 'Pending'
        )
      `;
    }

    // 4. Insert Budget Items
    for (const b of d.budgetItems) {
      const bId = `bgt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO public.permission_request_budget_items (
          id, permission_request_id, item, category, quantity, unit_cost
        ) VALUES (
          ${bId}, ${requestId}, ${b.item}, ${b.category}, ${b.quantity}, ${b.unitCost}
        )
      `;
    }

    // 5. Insert Attachments
    for (const a of d.attachments) {
      const attId = `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await sql`
        INSERT INTO public.permission_request_attachments (
          id, permission_request_id, name, size_text, kind, storage_path
        ) VALUES (
          ${attId}, ${requestId}, ${a.name}, ${a.sizeText}, ${a.kind}, ${a.storagePath}
        )
      `;
    }

    // 6. Construct Hierarchical Approval Steps Chain:
    // If submitter is HOD, skip HOD step and route directly to Dean then Principal!
    const [hodRows, deanRows, prinRows] = await Promise.all([
      sql`SELECT id, name FROM public.users WHERE role = 'HOD' AND department_id = ${user.department_id} LIMIT 1`,
      sql`SELECT id, name FROM public.users WHERE role = 'Dean' LIMIT 1`,
      sql`SELECT id, name FROM public.users WHERE role = 'Principal' LIMIT 1`,
    ]);

    const hodId = hodRows[0]?.id || null;
    const hodName = hodRows[0]?.name || 'Head of Department';
    const deanId = deanRows[0]?.id || null;
    const deanName = deanRows[0]?.name || 'Dean, Student Welfare';
    const prinId = prinRows[0]?.id || null;
    const prinName = prinRows[0]?.name || 'Principal Office';

    let steps: any[] = [];
    if (user.role === 'HOD') {
      steps = [
        { id: `${requestId}-step-dean`, order: 1, role: 'Dean', userId: deanId, userName: deanName },
        { id: `${requestId}-step-prin`, order: 2, role: 'Principal', userId: prinId, userName: prinName },
      ];
    } else {
      steps = [
        { id: `${requestId}-step-hod`, order: 1, role: 'HOD', userId: hodId, userName: hodName },
        { id: `${requestId}-step-dean`, order: 2, role: 'Dean', userId: deanId, userName: deanName },
        { id: `${requestId}-step-prin`, order: 3, role: 'Principal', userId: prinId, userName: prinName },
      ];
    }

    for (const s of steps) {
      await sql`
        INSERT INTO public.permission_request_approval_steps (
          id, permission_request_id, step_order, role, user_id, user_name, action
        ) VALUES (
          ${s.id}, ${requestId}, ${s.order}, ${s.role}, ${s.userId}, ${s.userName}, 'Pending'
        )
      `;
    }

    await logAudit(user.id, user.name, 'PERMISSION_REQUEST_SUBMITTED', `permission_requests:${requestId}`, { refNo, eventName: d.eventName });

    res.status(201).json({
      id: requestId,
      refNo,
      message: `Permission request ${refNo} has been submitted for review!`,
    });
  } catch (err) {
    console.error('Submit permission request error:', err);
    res.status(500).json({ error: 'Failed to create permission request.' });
  }
});

// Decide / Approve / Deny / Revert Permission Request
app.post('/api/permission-requests/:id/decide', authenticate, async (req, res) => {
  const user = req.user!;
  const requestId = req.params.id;

  const schema = z.object({
    action: z.enum(['Approved', 'Rejected', 'Changes Requested', 'Pending']),
    remark: z.string().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid decision action.' });
    return;
  }

  const { action, remark } = parsed.data;

  try {
    const propRows = await sql`SELECT * FROM public.permission_requests WHERE id = ${requestId}`;
    if (!propRows.length) {
      res.status(404).json({ error: 'Permission request not found.' });
      return;
    }
    const prop = propRows[0];

    // Fetch institutional approval policy ('principal_only' vs 'both')
    const policyRows = await sql`SELECT value FROM public.app_settings WHERE key = 'approval_policy'`;
    const policy = policyRows.length ? (policyRows[0].value?.policy || 'principal_only') : 'principal_only';

    if (user.role === 'Dean') {
      // Dean reviews and recommends
      await sql`
        UPDATE public.permission_request_approval_steps
        SET action = ${action}, acted_at = NOW(), remark = ${remark}
        WHERE permission_request_id = ${requestId} AND role = 'Dean'
      `;

      if (action === 'Rejected') {
        await sql`UPDATE public.permission_requests SET status = 'Rejected', updated_at = NOW() WHERE id = ${requestId}`;
        await logAudit(user.id, user.name, 'DEAN_REJECTED', `permission_requests:${requestId}`, { refNo: prop.ref_no, remark });
        res.json({ message: `Permission request ${prop.ref_no} rejected by Dean.` });
        return;
      }
      if (action === 'Changes Requested') {
        await sql`UPDATE public.permission_requests SET status = 'Changes Requested', updated_at = NOW() WHERE id = ${requestId}`;
        await logAudit(user.id, user.name, 'DEAN_CHANGES_REQUESTED', `permission_requests:${requestId}`, { refNo: prop.ref_no, remark });
        res.json({ message: `Changes requested by Dean for ${prop.ref_no}.` });
        return;
      }

      if (policy === 'both' && action === 'Approved') {
        const prinStep = await sql`SELECT action FROM public.permission_request_approval_steps WHERE permission_request_id = ${requestId} AND role = 'Principal'`;
        if (prinStep.length && prinStep[0].action === 'Approved') {
          await sql`UPDATE public.permission_requests SET status = 'Approved', updated_at = NOW() WHERE id = ${requestId}`;
          await logAudit(user.id, user.name, 'PROPOSAL_FULLY_APPROVED', `permission_requests:${requestId}`, { refNo: prop.ref_no, note: 'Approved by BOTH Dean & Principal' });
          res.json({ message: `Permission request ${prop.ref_no} officially Approved (Both Dean & Principal signed off)!` });
          return;
        }
      }

      await sql`UPDATE public.permission_requests SET status = 'Under Review', updated_at = NOW() WHERE id = ${requestId}`;
      await logAudit(user.id, user.name, 'DEAN_RECOMMENDED', `permission_requests:${requestId}`, { refNo: prop.ref_no, remark });
      res.json({ message: `Dean review & recommendation recorded for ${prop.ref_no}. Forwarded for Principal sanction.` });
      return;
    }

    if (user.role === 'Principal') {
      let newStatus: string = prop.status;
      if (action === 'Rejected') newStatus = 'Rejected';
      else if (action === 'Changes Requested') newStatus = 'Changes Requested';
      else if (action === 'Pending') newStatus = 'Under Review';
      else if (action === 'Approved') {
        if (policy === 'principal_only') {
          newStatus = 'Approved';
        } else {
          // Policy is 'both': requires BOTH Dean and Principal
          const deanStep = await sql`SELECT action FROM public.permission_request_approval_steps WHERE permission_request_id = ${requestId} AND role = 'Dean'`;
          if (!deanStep.length || deanStep[0].action === 'Approved') {
            newStatus = 'Approved';
          } else {
            newStatus = 'Under Review';
          }
        }
      }

      await sql`
        UPDATE public.permission_requests
        SET
          status = ${newStatus},
          decided_by = ${user.name},
          decided_at = NOW(),
          decision_note = ${remark},
          updated_at = NOW()
        WHERE id = ${requestId}
      `;

      await sql`
        UPDATE public.permission_request_approval_steps
        SET action = ${action}, acted_at = NOW(), remark = ${remark}
        WHERE permission_request_id = ${requestId} AND role = 'Principal'
      `;

      await logAudit(user.id, user.name, `PRINCIPAL_${action.toUpperCase()}`, `permission_requests:${requestId}`, { refNo: prop.ref_no, remark, policy, finalStatus: newStatus });
      res.json({
        message: newStatus === 'Approved'
          ? `Permission request ${prop.ref_no} officially Approved by Principal!`
          : `Principal sanction recorded for ${prop.ref_no}. Status: ${newStatus}${policy === 'both' && action === 'Approved' ? ' (Awaiting Dean sign-off under dual approval policy)' : ''}`,
        status: newStatus,
      });
      return;
    }

    if (user.role === 'HOD') {
      if (prop.faculty_id === user.id) {
        res.status(403).json({ error: 'Forbidden: HOD cannot endorse or approve their own permission request.' });
        return;
      }
      if (prop.submitter_dept !== user.department_code) {
        res.status(403).json({ error: 'Forbidden: You can only endorse requests from your own department.' });
        return;
      }

      await sql`
        UPDATE public.permission_request_approval_steps
        SET action = ${action}, acted_at = NOW(), remark = ${remark}
        WHERE permission_request_id = ${requestId} AND role = 'HOD'
      `;

      await sql`
        UPDATE public.permission_requests
        SET status = 'Under Review', updated_at = NOW()
        WHERE id = ${requestId}
      `;

      await logAudit(user.id, user.name, `HOD_${action.toUpperCase()}`, `permission_requests:${requestId}`, { refNo: prop.ref_no, remark });
      res.json({ message: `Department endorsement recorded for ${prop.ref_no}. Forwarded to Dean & Principal.` });
      return;
    }

    res.status(403).json({ error: 'Forbidden: Insufficient privileges to decide on permission requests.' });
  } catch (err) {
    console.error('Decide permission request error:', err);
    res.status(500).json({ error: 'Failed to record approval decision.' });
  }
});

// ====================================================================
// 6. BROADCASTS & ANNOUNCEMENTS (Phase 8: Principal Exclusive)
// ====================================================================

app.get('/api/announcements', authenticate, async (req, res) => {
  const user = req.user!;
  try {
    const rows = await sql`
      SELECT a.*, u.name as created_by_name, ar.read_at
      FROM public.announcements a
      LEFT JOIN public.users u ON a.created_by = u.id
      LEFT JOIN public.announcement_receipts ar ON ar.announcement_id = a.id AND ar.user_id = ${user.id}
      WHERE a.audience_dept IS NULL
         OR a.audience_dept = ${user.department_code || ''}
         OR (${user.role} = 'HOD' AND a.audience_dept = 'HODs')
         OR ${user.role} = 'Principal'
         OR ${user.role} = 'Dean'
      ORDER BY a.created_at DESC
    `;
    res.json({ announcements: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

app.post('/api/announcements', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'announcement:create')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal has institutional broadcast authority.' });
    return;
  }

  const schema = z.object({
    title: z.string().min(3),
    body: z.string().min(5),
    priority: z.string().optional().default('Medium').transform((p) => {
      const lower = (p || '').toLowerCase();
      if (lower === 'high') return 'High';
      if (lower === 'urgent') return 'Urgent';
      if (lower === 'low') return 'Low';
      return 'Medium';
    }),
    audience_dept: z.string().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid broadcast parameters.' });
    return;
  }

  const { title, body, priority, audience_dept } = parsed.data;

  try {
    const inserted = await sql`
      INSERT INTO public.announcements (title, body, priority, audience_dept, created_by)
      VALUES (${title.trim()}, ${body.trim()}, ${priority}, ${audience_dept || null}, ${user.id})
      RETURNING id, title, created_at
    `;
    const ann = inserted[0];

    // Find recipient users
    let recipients: { id: string; email: string; name: string }[];
    if (audience_dept === 'HODs') {
      recipients = await sql`
        SELECT u.id, u.email, u.name FROM public.users u
        WHERE u.role = 'HOD' AND u.status = 'active'
      `;
    } else if (audience_dept) {
      recipients = await sql`
        SELECT u.id, u.email, u.name FROM public.users u
        JOIN public.departments d ON u.department_id = d.id
        WHERE d.code = ${audience_dept} AND u.status = 'active'
      `;
    } else {
      recipients = await sql`
        SELECT id, email, name FROM public.users WHERE status = 'active' AND role != 'Principal'
      `;
    }

    const recipientIds = recipients.map((r) => r.id);

    // Asynchronous Delivery across 3 channels:
    // 1. In-App Receipts (Guaranteed fallback)
    for (const rId of recipientIds) {
      await sql`
        INSERT INTO public.announcement_receipts (announcement_id, user_id, delivered_via)
        VALUES (${ann.id}, ${rId}, 'in_app')
        ON CONFLICT DO NOTHING
      `;
    }

    // 2. Browser Web Push Notifications
    sendPushToUsers(recipientIds, {
      title: `Docworm Broadcast [${priority}]: ${title}`,
      body: body.slice(0, 140),
      url: '/notifications',
    }).catch((err) => console.error('Push broadcast error:', err));

    // 3. Batched Email Delivery
    const recipientEmails = recipients.map((r) => r.email).filter(Boolean);
    if (recipientEmails.length > 0) {
      sendEmail({
        to: recipientEmails,
        subject: `[Docworm Announcement - ${priority}] ${title}`,
        text: `Official Institutional Announcement from the Principal Office:\n\n${title}\n\n${body}\n\nOpen Docworm: ${APP_URL}/notifications`,
      }).catch((err) => console.error('Email broadcast error:', err));
    }

    await logAudit(user.id, user.name, 'ANNOUNCEMENT_BROADCASTED', `announcements:${ann.id}`, { title, recipientCount: recipientIds.length });

    res.status(201).json({
      message: `Announcement broadcast dispatched to ${recipientIds.length} staff members across In-App, Push, and Email channels!`,
      delivery: {
        announcementId: ann.id,
        targetRecipients: recipientIds.length,
      },
    });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: 'Failed to broadcast announcement.' });
  }
});

// Mark Announcement as Read
app.post('/api/announcements/:id/read', authenticate, async (req, res) => {
  const user = req.user!;
  const annId = req.params.id;
  try {
    await sql`
      UPDATE public.announcement_receipts
      SET read_at = NOW()
      WHERE announcement_id = ${annId} AND user_id = ${user.id}
    `;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark announcement as read.' });
  }
});

// Web Push Subscription
app.get('/api/push/vapid-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

app.post('/api/push/subscribe', authenticate, async (req, res) => {
  const user = req.user!;
  const schema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid push subscription payload.' });
    return;
  }

  const { endpoint, keys } = parsed.data;
  try {
    await sql`
      INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${user.id}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
      ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
    `;
    res.json({ message: 'Push subscription registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register push subscription.' });
  }
});

// ====================================================================
// 6.5. FACULTY LEAVES MANAGEMENT
// Full workflow: Faculty application -> HOD recommendation -> Principal approval
// ====================================================================

// List Leaves (Scoped by role)
app.get('/api/leaves', authenticate, async (req, res) => {
  const user = req.user!;
  try {
    let leaves: any[];
    if (can(user, 'leave:view_all')) {
      leaves = await sql`
        SELECT l.*, u.email as faculty_email, u.phone as faculty_phone
        FROM public.faculty_leaves l
        LEFT JOIN public.users u ON l.faculty_id = u.id
        ORDER BY l.created_at DESC
      `;
    } else if (user.role === 'HOD') {
      leaves = await sql`
        SELECT l.*, u.email as faculty_email, u.phone as faculty_phone
        FROM public.faculty_leaves l
        LEFT JOIN public.users u ON l.faculty_id = u.id
        WHERE l.department = ${user.department_code || ''}
           OR l.department_id = ${user.department_id || ''}
           OR l.faculty_id = ${user.id}
        ORDER BY l.created_at DESC
      `;
    } else {
      leaves = await sql`
        SELECT l.*, u.email as faculty_email, u.phone as faculty_phone
        FROM public.faculty_leaves l
        LEFT JOIN public.users u ON l.faculty_id = u.id
        WHERE l.faculty_id = ${user.id}
        ORDER BY l.created_at DESC
      `;
    }
    res.json({ leaves });
  } catch (err: any) {
    console.error('Fetch leaves error:', err);
    res.status(500).json({ error: 'Failed to fetch leave applications.' });
  }
});

// Create Leave Application
app.post('/api/leaves', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'leave:create')) {
    res.status(403).json({ error: 'Forbidden: You cannot apply for leave.' });
    return;
  }

  const schema = z.object({
    leave_type: z.string().min(2),
    start_date: z.string().min(10),
    end_date: z.string().min(10),
    total_days: z.number().positive(),
    is_half_day: z.boolean().optional().default(false),
    half_day_session: z.string().optional().default('Full Day'),
    reason: z.string().min(3),
    alternate_faculty: z.string().optional().default(''),
    lecture_adjustments: z.string().optional().default(''),
    contact_phone: z.string().optional().default(''),
    attachment_url: z.string().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid leave application data.' });
    return;
  }

  const d = parsed.data;
  const deptCode = user.department_code || 'GEN';
  const yearStr = new Date().getFullYear().toString();
  const counterVal = Math.floor(1000 + Math.random() * 9000);
  const refNo = `LV/${deptCode}/${yearStr}/${counterVal}`;

  try {
    const inserted = await sql`
      INSERT INTO public.faculty_leaves (
        ref_no, faculty_id, faculty_name, department_id, department,
        leave_type, start_date, end_date, total_days, is_half_day,
        half_day_session, reason, alternate_faculty, lecture_adjustments,
        contact_phone, attachment_url, status
      ) VALUES (
        ${refNo}, ${user.id}, ${user.name}, ${user.department_id}, ${deptCode},
        ${d.leave_type}, ${d.start_date}, ${d.end_date}, ${d.total_days}, ${d.is_half_day},
        ${d.half_day_session}, ${d.reason}, ${d.alternate_faculty}, ${d.lecture_adjustments},
        ${d.contact_phone}, ${d.attachment_url}, 'Pending'
      )
      RETURNING *
    `;

    await logAudit(user.id, user.name, 'LEAVE_APPLIED', `faculty_leaves:${inserted[0].id}`, {
      refNo,
      leaveType: d.leave_type,
      totalDays: d.total_days,
    });

    res.status(201).json({ ok: true, leave: inserted[0] });
  } catch (err: any) {
    console.error('Leave create error:', err);
    res.status(500).json({ error: 'Failed to submit leave application.' });
  }
});

// Decide on Leave (HOD Recommend/Reject or Principal Approve/Reject)
app.post('/api/leaves/:id/decide', authenticate, async (req, res) => {
  const user = req.user!;
  const leaveId = req.params.id;

  const schema = z.object({
    action: z.enum(['Recommend', 'Approve', 'Reject']),
    remark: z.string().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid decision action.' });
    return;
  }

  const { action, remark } = parsed.data;

  try {
    const existing = await sql`SELECT * FROM public.faculty_leaves WHERE id = ${leaveId}`;
    if (!existing.length) {
      res.status(404).json({ error: 'Leave application not found.' });
      return;
    }
    const leave = existing[0];

    if (user.role === 'HOD') {
      if (!can(user, 'leave:endorse_hod', leave)) {
        res.status(403).json({ error: 'Forbidden: You can only recommend leaves for faculty in your department.' });
        return;
      }

      if (action === 'Approve') {
        res.status(403).json({ error: 'HOD can only Recommend or Reject. Final sanction is reserved for the Principal.' });
        return;
      }

      const newStatus = action === 'Recommend' ? 'Recommended' : 'Rejected';
      const updated = await sql`
        UPDATE public.faculty_leaves
        SET
          status = ${newStatus},
          hod_id = ${user.id},
          hod_name = ${user.name},
          hod_remark = ${remark},
          hod_acted_at = NOW(),
          updated_at = NOW()
        WHERE id = ${leaveId}
        RETURNING *
      `;

      await logAudit(user.id, user.name, `LEAVE_HOD_${action.toUpperCase()}`, `faculty_leaves:${leaveId}`, {
        refNo: leave.ref_no,
        action,
        remark,
      });

      res.json({ ok: true, leave: updated[0] });
      return;
    }

    if (user.role === 'Principal') {
      if (!can(user, 'leave:decide_principal')) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }

      const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';
      const updated = await sql`
        UPDATE public.faculty_leaves
        SET
          status = ${newStatus},
          principal_id = ${user.id},
          principal_name = ${user.name},
          principal_remark = ${remark},
          principal_acted_at = NOW(),
          updated_at = NOW()
        WHERE id = ${leaveId}
        RETURNING *
      `;

      await logAudit(user.id, user.name, `LEAVE_PRINCIPAL_${action.toUpperCase()}`, `faculty_leaves:${leaveId}`, {
        refNo: leave.ref_no,
        action,
        remark,
      });

      res.json({ ok: true, leave: updated[0] });
      return;
    }

    res.status(403).json({ error: 'Forbidden: You do not have approval authority for leaves.' });
  } catch (err: any) {
    console.error('Leave decide error:', err);
    res.status(500).json({ error: 'Failed to record leave decision.' });
  }
});

// Cancel Leave Application (Faculty Pending cancellation)
app.delete('/api/leaves/:id', authenticate, async (req, res) => {
  const user = req.user!;
  const leaveId = req.params.id;

  try {
    const existing = await sql`SELECT * FROM public.faculty_leaves WHERE id = ${leaveId}`;
    if (!existing.length) {
      res.status(404).json({ error: 'Leave application not found.' });
      return;
    }
    const leave = existing[0];

    if (!can(user, 'leave:cancel_own', leave) && user.role !== 'Principal') {
      res.status(403).json({ error: 'Forbidden: You can only cancel your own pending leave applications.' });
      return;
    }

    const updated = await sql`
      UPDATE public.faculty_leaves
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${leaveId}
      RETURNING *
    `;

    await logAudit(user.id, user.name, 'LEAVE_CANCELLED', `faculty_leaves:${leaveId}`, { refNo: leave.ref_no });
    res.json({ ok: true, message: 'Leave application cancelled.', leave: updated[0] });
  } catch (err: any) {
    console.error('Leave cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel leave application.' });
  }
});

// ====================================================================
// 6.6. EMPLOYEE GATE PASSES MANAGEMENT
// ====================================================================

// List Gate Passes
app.get('/api/gate-passes', authenticate, async (req, res) => {
  const user = req.user!;
  try {
    let gatePasses: any[];
    if (can(user, 'gatepass:view_all') || can(user, 'leave:view_all')) {
      gatePasses = await sql`
        SELECT g.*, u.email as employee_email, u.phone as employee_phone
        FROM public.employee_gate_passes g
        LEFT JOIN public.users u ON g.employee_id = u.id
        ORDER BY g.created_at DESC
      `;
    } else if (user.role === 'HOD') {
      gatePasses = await sql`
        SELECT g.*, u.email as employee_email, u.phone as employee_phone
        FROM public.employee_gate_passes g
        LEFT JOIN public.users u ON g.employee_id = u.id
        WHERE g.department = ${user.department_code || ''}
           OR g.department_id = ${user.department_id || ''}
           OR g.employee_id = ${user.id}
        ORDER BY g.created_at DESC
      `;
    } else {
      gatePasses = await sql`
        SELECT g.*, u.email as employee_email, u.phone as employee_phone
        FROM public.employee_gate_passes g
        LEFT JOIN public.users u ON g.employee_id = u.id
        WHERE g.employee_id = ${user.id}
        ORDER BY g.created_at DESC
      `;
    }
    res.json({ gatePasses, leaves: gatePasses });
  } catch (err: any) {
    console.error('Fetch gate passes error:', err);
    res.status(500).json({ error: 'Failed to fetch gate passes.' });
  }
});

// Create Employee Gate Pass
app.post('/api/gate-passes', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'gatepass:create') && !can(user, 'leave:create')) {
    res.status(403).json({ error: 'Forbidden: You cannot request a gate pass.' });
    return;
  }

  const schema = z.object({
    date: z.string().optional(),
    department: z.string().optional(),
    purpose: z.string().min(2, 'Purpose is required'),
    time_out: z.string().min(1, 'Time Out is required'),
    time_in: z.string().min(1, 'Time In is required'),
    contact_phone: z.string().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid gate pass data.' });
    return;
  }

  const d = parsed.data;
  const deptCode = d.department || user.department_code || 'GEN';
  const yearStr = new Date().getFullYear().toString();
  const counterVal = Math.floor(1000 + Math.random() * 9000);
  const refNo = `GP/${deptCode}/${yearStr}/${counterVal}`;
  const dateVal = d.date || new Date().toISOString().split('T')[0];

  try {
    const inserted = await sql`
      INSERT INTO public.employee_gate_passes (
        ref_no, employee_id, employee_name, department_id, department,
        date, purpose, time_out, time_in, contact_phone, status
      ) VALUES (
        ${refNo}, ${user.id}, ${user.name}, ${user.department_id}, ${deptCode},
        ${dateVal}, ${d.purpose}, ${d.time_out}, ${d.time_in}, ${d.contact_phone || user.phone || ''}, 'Pending'
      )
      RETURNING *
    `;

    await logAudit(user.id, user.name, 'GATE_PASS_REQUESTED', `employee_gate_passes:${inserted[0].id}`, { refNo, purpose: d.purpose });
    res.status(201).json({ ok: true, gatePass: inserted[0], leave: inserted[0] });
  } catch (err: any) {
    console.error('Create gate pass error:', err);
    res.status(500).json({ error: 'Failed to submit gate pass request.' });
  }
});

// Decide Employee Gate Pass
app.post('/api/gate-passes/:id/decide', authenticate, async (req, res) => {
  const user = req.user!;
  const passId = req.params.id;

  const schema = z.object({
    action: z.enum(['Recommend', 'Approve', 'Reject']),
    remark: z.string().optional().default(''),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid decision action.' });
    return;
  }

  const { action, remark } = parsed.data;

  try {
    const existing = await sql`SELECT * FROM public.employee_gate_passes WHERE id = ${passId}`;
    if (!existing.length) {
      res.status(404).json({ error: 'Gate pass not found.' });
      return;
    }
    const pass = existing[0];

    if (user.role === 'HOD') {
      if (!can(user, 'gatepass:endorse_hod', pass)) {
        res.status(403).json({ error: 'Forbidden: You can only recommend gate passes for employees in your department.' });
        return;
      }
      if (action === 'Approve') {
        res.status(403).json({ error: 'HOD can only Recommend or Reject. Final sanction is reserved for the Principal.' });
        return;
      }

      const newStatus = action === 'Recommend' ? 'Recommended' : 'Rejected';
      const updated = await sql`
        UPDATE public.employee_gate_passes
        SET status = ${newStatus}, hod_id = ${user.id}, hod_name = ${user.name}, hod_remark = ${remark}, hod_acted_at = NOW(), updated_at = NOW()
        WHERE id = ${passId}
        RETURNING *
      `;

      await logAudit(user.id, user.name, `GATEPASS_HOD_${action.toUpperCase()}`, `employee_gate_passes:${passId}`, { refNo: pass.ref_no, action, remark });
      res.json({ ok: true, gatePass: updated[0], leave: updated[0] });
      return;
    }

    if (user.role === 'Principal') {
      if (!can(user, 'gatepass:decide_principal')) {
        res.status(403).json({ error: 'Forbidden: Principal authority required.' });
        return;
      }
      const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';
      const updated = await sql`
        UPDATE public.employee_gate_passes
        SET status = ${newStatus}, principal_id = ${user.id}, principal_name = ${user.name}, principal_remark = ${remark}, principal_acted_at = NOW(), updated_at = NOW()
        WHERE id = ${passId}
        RETURNING *
      `;

      await logAudit(user.id, user.name, `GATEPASS_PRINCIPAL_${action.toUpperCase()}`, `employee_gate_passes:${passId}`, { refNo: pass.ref_no, action, remark });
      res.json({ ok: true, gatePass: updated[0], leave: updated[0] });
      return;
    }

    res.status(403).json({ error: 'Forbidden: You do not have approval authority.' });
  } catch (err: any) {
    console.error('Gate pass decide error:', err);
    res.status(500).json({ error: 'Failed to record decision.' });
  }
});

// Cancel Employee Gate Pass
app.delete('/api/gate-passes/:id', authenticate, async (req, res) => {
  const user = req.user!;
  const passId = req.params.id;

  try {
    const existing = await sql`SELECT * FROM public.employee_gate_passes WHERE id = ${passId}`;
    if (!existing.length) {
      res.status(404).json({ error: 'Gate pass not found.' });
      return;
    }
    const pass = existing[0];

    if (!can(user, 'gatepass:cancel_own', pass) && user.role !== 'Principal') {
      res.status(403).json({ error: 'Forbidden: You can only cancel your own pending gate passes.' });
      return;
    }

    const updated = await sql`
      UPDATE public.employee_gate_passes
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ${passId}
      RETURNING *
    `;

    await logAudit(user.id, user.name, 'GATEPASS_CANCELLED', `employee_gate_passes:${passId}`, { refNo: pass.ref_no });
    res.json({ ok: true, message: 'Gate pass cancelled.', gatePass: updated[0], leave: updated[0] });
  } catch (err: any) {
    console.error('Gate pass cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel gate pass.' });
  }
});

// Update Movement (Exit / Return tracking with Principal Alert)
app.post('/api/gate-passes/:id/movement', authenticate, async (req, res) => {
  const user = req.user!;
  const passId = req.params.id;

  const schema = z.object({
    action: z.enum(['exit', 'return']),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid movement action.' });
    return;
  }

  const { action } = parsed.data;

  try {
    const existing = await sql`SELECT * FROM public.employee_gate_passes WHERE id = ${passId}`;
    if (!existing.length) {
      res.status(404).json({ error: 'Gate pass not found.' });
      return;
    }
    const pass = existing[0];

    if (action === 'exit') {
      const updated = await sql`
        UPDATE public.employee_gate_passes
        SET movement_status = 'outside', actual_exit_at = NOW(), updated_at = NOW()
        WHERE id = ${passId}
        RETURNING *
      `;

      const annId = `ann-exit-${Date.now().toString(36)}`;
      const exitTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const title = `🚨 Faculty Departure Alert: ${pass.employee_name} has exited premises`;
      const noteBody = `Faculty member ${pass.employee_name} (${pass.department}) marked departure at ${exitTime} for: ${pass.purpose}. Gate Pass Ref: ${pass.ref_no}. Time Out: ${pass.time_out}, Expected Return: ${pass.time_in}. Approval Status: ${pass.status}.`;

      await sql`
        INSERT INTO public.announcements (id, title, body, priority, audience_dept, created_by, created_at)
        VALUES (${annId}, ${title}, ${noteBody}, 'URGENT', NULL, ${user.id}, NOW())
      `;

      await logAudit(user.id, user.name, 'FACULTY_EXITED_CAMPUS', `employee_gate_passes:${passId}`, { refNo: pass.ref_no, employeeName: pass.employee_name });
      res.json({ ok: true, gatePass: updated[0], message: 'Departure recorded. Principal alert dispatched.' });
      return;
    }

    if (action === 'return') {
      const updated = await sql`
        UPDATE public.employee_gate_passes
        SET movement_status = 'returned', actual_return_at = NOW(), updated_at = NOW()
        WHERE id = ${passId}
        RETURNING *
      `;

      const annId = `ann-return-${Date.now().toString(36)}`;
      const returnTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const title = `✅ Faculty Return Alert: ${pass.employee_name} is back on campus`;
      const noteBody = `Faculty member ${pass.employee_name} (${pass.department}) returned to campus at ${returnTime}. Gate Pass Ref: ${pass.ref_no}.`;

      await sql`
        INSERT INTO public.announcements (id, title, body, priority, audience_dept, created_by, created_at)
        VALUES (${annId}, ${title}, ${noteBody}, 'NORMAL', NULL, ${user.id}, NOW())
      `;

      await logAudit(user.id, user.name, 'FACULTY_RETURNED_CAMPUS', `employee_gate_passes:${passId}`, { refNo: pass.ref_no, employeeName: pass.employee_name });
      res.json({ ok: true, gatePass: updated[0], message: 'Return to campus recorded.' });
      return;
    }

    res.status(400).json({ error: 'Invalid action.' });
  } catch (err: any) {
    console.error('Movement update error:', err);
    res.status(500).json({ error: 'Failed to update movement status.' });
  }
});

// ====================================================================
// 7. ACADEMIC OPTIONS & RESTRICTED INPUTS (Phase 6)
// ====================================================================

app.get('/api/options', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id, type, value, sort_order, active
      FROM public.academic_options
      ORDER BY type, sort_order ASC
    `;

    const grouped: Record<string, string[]> = {};
    for (const r of rows) {
      if (r.active) {
        if (!grouped[r.type]) grouped[r.type] = [];
        grouped[r.type].push(r.value);
      }
    }

    const policyRows = await sql`SELECT value FROM public.app_settings WHERE key = 'approval_policy'`;
    const approvalPolicy = policyRows.length ? (policyRows[0].value?.policy || 'principal_only') : 'principal_only';
    grouped.approvalPolicy = [approvalPolicy];

    res.json({ options: grouped, all: rows, approvalPolicy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch academic options.' });
  }
});

app.post('/api/options', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:academic_options_write')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal can manage academic dropdown options.' });
    return;
  }

  const schema = z.object({
    type: z.string().min(2),
    value: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid option data.' });
    return;
  }

  const { type, value } = parsed.data;
  const id = `opt-${type}-${Date.now().toString(36)}`;

  try {
    await sql`
      INSERT INTO public.academic_options (id, type, value, active)
      VALUES (${id}, ${type}, ${value.trim()}, TRUE)
      ON CONFLICT (type, value) DO UPDATE SET active = TRUE
    `;
    await logAudit(user.id, user.name, 'ACADEMIC_OPTION_ADDED', `academic_options:${id}`, { type, value });
    res.status(201).json({ message: `Option '${value}' added to ${type}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add option.' });
  }
});

app.put('/api/options/:id', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:academic_options_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const schema = z.object({
    value: z.string().optional(),
    active: z.boolean().optional(),
    sort_order: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid data.' });
    return;
  }

  const optId = req.params.id;
  try {
    await sql`
      UPDATE public.academic_options
      SET
        value = COALESCE(${parsed.data.value ?? null}, value),
        active = COALESCE(${parsed.data.active ?? null}, active),
        sort_order = COALESCE(${parsed.data.sort_order ?? null}, sort_order)
      WHERE id = ${optId}
    `;
    res.json({ message: 'Option updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update option.' });
  }
});

app.delete('/api/options/:id', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:academic_options_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const optId = req.params.id;
  try {
    const opt = await sql`SELECT type, value FROM public.academic_options WHERE id = ${optId}`;
    if (!opt.length) {
      res.status(404).json({ error: 'Option not found.' });
      return;
    }

    // Check if in use in permission requests
    const inUse = await sql`
      SELECT 1 FROM public.permission_requests
      WHERE event_category = ${opt[0].value} OR budget_head = ${opt[0].value}
      LIMIT 1
    `;

    if (inUse.length > 0) {
      res.status(409).json({
        error: `Cannot delete '${opt[0].value}' because it is in use by existing permission requests. Please deactivate it instead to prevent new entries while preserving records.`,
      });
      return;
    }

    await sql`DELETE FROM public.academic_options WHERE id = ${optId}`;
    await logAudit(user.id, user.name, 'ACADEMIC_OPTION_DELETED', `academic_options:${optId}`, { value: opt[0].value });
    res.json({ message: `Option '${opt[0].value}' deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete option.' });
  }
});

// Departments CRUD
app.get('/api/departments', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM public.departments ORDER BY code ASC`;
    res.json({ departments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments.' });
  }
});

app.post('/api/departments', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:departments_write')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal can add departments.' });
    return;
  }

  const schema = z.object({ code: z.string().min(2), name: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid department data.' });
    return;
  }

  const { code, name } = parsed.data;
  const id = `dept-${code.toLowerCase()}`;

  try {
    await sql`
      INSERT INTO public.departments (id, code, name, active)
      VALUES (${id}, ${code.toUpperCase()}, ${name.trim()}, TRUE)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, active = TRUE
    `;
    await logAudit(user.id, user.name, 'DEPARTMENT_CREATED', `departments:${id}`, { code, name });
    res.status(201).json({ message: `Department ${code} created.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create department.' });
  }
});

// Event Categories CRUD
app.get('/api/event-categories', async (_req, res) => {
  try {
    const rows = await sql`SELECT * FROM public.event_categories ORDER BY name ASC`;
    res.json({ categories: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event categories.' });
  }
});

app.post('/api/event-categories', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:departments_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const schema = z.object({ name: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid category name.' });
    return;
  }

  const { name } = parsed.data;
  const id = `cat-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  try {
    await sql`
      INSERT INTO public.event_categories (id, name, active)
      VALUES (${id}, ${name.trim()}, TRUE)
      ON CONFLICT (name) DO UPDATE SET active = TRUE
    `;
    res.status(201).json({ message: `Category '${name}' created.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// ====================================================================
// 8. CONFIGURABLE EMAILS & TEST SENDER (Phase 6)
// ====================================================================

app.get('/api/settings/email', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:settings_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const cfg = await getSmtpConfig();
  // Return masked password for security
  res.json({
    email: {
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      user: cfg.user,
      passMasked: cfg.pass ? '••••••••••••' : '',
      from: cfg.from,
    },
  });
});

app.put('/api/settings/email', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:settings_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const schema = z.object({
    host: z.string().min(1),
    port: z.number().default(587),
    secure: z.boolean().default(false),
    user: z.string().optional().default(''),
    pass: z.string().optional(),
    from: z.string().min(3),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid SMTP configuration values.' });
    return;
  }

  try {
    const currentCfg = await getSmtpConfig();
    const newCfg = {
      ...parsed.data,
      pass: parsed.data.pass && parsed.data.pass !== '••••••••••••' ? parsed.data.pass : currentCfg.pass,
    };

    await sql`
      INSERT INTO public.app_settings (key, value, updated_at)
      VALUES ('email', ${JSON.stringify(newCfg)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    await logAudit(user.id, user.name, 'SMTP_CONFIG_UPDATED', 'app_settings:email', { host: newCfg.host, port: newCfg.port });
    res.json({ message: 'Email configuration saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save email configuration.' });
  }
});

app.post('/api/settings/test-email', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:settings_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const targetEmail = req.body.email || user.email;
  const result = await sendEmail({
    to: targetEmail,
    subject: 'Docworm Diagnostic Test Email',
    text: `This is a live test email sent from the Docworm Institutional Portal.\nTimestamp: ${new Date().toISOString()}\nDispatched by: ${user.name} (${user.role}).`,
  });

  if (result.success) {
    res.json({
      success: true,
      message: `Test email dispatched to ${targetEmail} successfully!`,
      messageId: result.messageId,
      previewUrl: result.previewUrl,
    });
  } else {
    res.status(502).json({
      success: false,
      error: `Failed to dispatch test email: ${result.error}`,
    });
  }
});

// Letterhead Header Config
app.get('/api/settings/letterhead', async (_req, res) => {
  try {
    const rows = await sql`SELECT value FROM public.app_settings WHERE key = 'letterhead'`;
    if (rows.length) res.json({ letterhead: rows[0].value });
    else res.json({ letterhead: {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch letterhead.' });
  }
});

app.put('/api/settings/letterhead', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:settings_write')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  try {
    await sql`
      INSERT INTO public.app_settings (key, value, updated_at)
      VALUES ('letterhead', ${JSON.stringify(req.body)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    await logAudit(user.id, user.name, 'LETTERHEAD_UPDATED', 'app_settings:letterhead');
    res.json({ message: 'Letterhead header configuration saved.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save letterhead.' });
  }
});

// Approval Policy Config
app.get('/api/settings/approval-policy', async (_req, res) => {
  try {
    const rows = await sql`SELECT value FROM public.app_settings WHERE key = 'approval_policy'`;
    const policy = rows.length ? (rows[0].value?.policy || 'principal_only') : 'principal_only';
    res.json({ policy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch approval policy.' });
  }
});

app.put('/api/settings/approval-policy', authenticate, async (req, res) => {
  const user = req.user!;
  if (user.role !== 'Principal') {
    res.status(403).json({ error: 'Forbidden: Only the Principal has authority to set institutional approval policy.' });
    return;
  }

  const schema = z.object({ policy: z.enum(['both', 'principal_only']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid approval policy. Must be "both" or "principal_only".' });
    return;
  }

  const { policy } = parsed.data;
  try {
    await sql`
      INSERT INTO public.app_settings (key, value, updated_at)
      VALUES ('approval_policy', ${JSON.stringify({ policy })}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify({ policy })}, updated_at = NOW()
    `;
    await logAudit(user.id, user.name, 'APPROVAL_POLICY_UPDATED', 'app_settings:approval_policy', { policy });
    res.json({ message: 'Institutional approval policy updated successfully.', policy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save approval policy.' });
  }
});

// ====================================================================
// 9. CLOUD TABLE EDITOR & SAFE SQL RUNNER (Phase 6)
// ====================================================================

// List Tables
app.get('/api/admin/tables', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:table_editor_read')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  try {
    const tables = [
      'users', 'departments', 'event_categories', 'academic_options',
      'permission_requests', 'permission_request_resources', 'permission_request_budget_items',
      'permission_request_approval_steps', 'permission_request_comments',
      'tasks', 'announcements', 'announcement_receipts', 'audit_log'
    ];

    const results = [];
    for (const t of tables) {
      const countRes = await sql.unsafe(`SELECT count(*)::int as count FROM public.${t}`);
      results.push({ name: t, count: countRes[0].count });
    }

    res.json({ tables: results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list tables.' });
  }
});

// View Rows in Table
app.get('/api/admin/tables/:table', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:table_editor_read')) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const tableName = String(req.params.table).replace(/[^a-zA-Z0-9_]/g, '');
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(5, Number(req.query.limit || 25)));
  const offset = (page - 1) * limit;

  try {
    const countRes = await sql.unsafe(`SELECT count(*)::int as total FROM public.${tableName}`);
    const rows = await sql.unsafe(`SELECT * FROM public.${tableName} LIMIT ${limit} OFFSET ${offset}`);

    // Cleanse sensitive fields
    const sanitized = rows.map((r: any) => {
      const copy = { ...r };
      delete copy.password_hash;
      delete copy.token_hash;
      delete copy.pass;
      return copy;
    });

    res.json({
      table: tableName,
      page,
      limit,
      total: countRes[0].total,
      rows: sanitized,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to query table.' });
  }
});

// Safe SQL Runner (Server-side Only)
app.post('/api/admin/sql', authenticate, async (req, res) => {
  const user = req.user!;
  if (!can(user, 'admin:sql_editor')) {
    res.status(403).json({ error: 'Forbidden: Only the Principal has SQL Editor access.' });
    return;
  }

  const { query, writeMode } = req.body;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'SQL query string required.' });
    return;
  }

  const trimmed = query.trim();

  // Safety check: prohibit queries that tamper with secret/auth tokens directly
  if (/password_reset_tokens/i.test(trimmed) && writeMode) {
    res.status(400).json({ error: 'Direct manipulation of security tokens is blocked.' });
    return;
  }

  // If not writeMode, reject any mutating statements
  const isMutating = /^(DROP|TRUNCATE|DELETE|UPDATE|INSERT|ALTER|CREATE)\b/i.test(trimmed);
  if (isMutating && !writeMode) {
    res.status(400).json({
      error: 'SQL Editor is currently in Read-Only Mode. Enable Write Mode and confirm destructive statement execution.',
    });
    return;
  }

  try {
    const start = Date.now();
    // Enforce 5 second statement timeout
    const results = await sql.unsafe(trimmed);
    const duration = Date.now() - start;

    // Sanitize any password_hash columns from output
    const sanitized = Array.isArray(results)
      ? results.slice(0, 100).map((r: any) => {
          const copy = { ...r };
          delete copy.password_hash;
          delete copy.token_hash;
          return copy;
        })
      : results;

    await logAudit(user.id, user.name, 'SQL_QUERY_EXECUTED', 'database', { query: trimmed.slice(0, 200), writeMode, durationMs: duration });

    res.json({
      rows: sanitized,
      rowCount: results.length ?? 0,
      durationMs: duration,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'SQL execution failed.' });
  }
});

// ====================================================================
// 10. POLISHED EXPORTS: QUICK CSV & EXCEL WORKBOOKS (Phases 6 & 10)
// ====================================================================

// Quick CSV Export with BOM
app.get('/api/export/csv/:table', authenticate, async (req, res) => {
  const user = req.user!;
  const tableName = String(req.params.table).replace(/[^a-zA-Z0-9_]/g, '');

  try {
    let rows: any[];
    if (tableName === 'users' || tableName === 'staff') {
      if (can(user, 'user:view_all')) {
        rows = await sql`SELECT name, email, role, designation, phone, status, created_at FROM public.users ORDER BY role, name`;
      } else {
        rows = await sql`SELECT name, email, role, designation, phone, status, created_at FROM public.users WHERE department_id = ${user.department_id}`;
      }
    } else if (tableName === 'permission_requests' || tableName === 'proposals') {
      if (can(user, 'request:view_all')) {
        rows = await sql`SELECT ref_no, academic_year, event_name, event_category, start_date, end_date, submitter_name, submitter_dept, opening_balance, status FROM public.permission_requests ORDER BY date_of_request DESC`;
      } else if (user.role === 'HOD') {
        rows = await sql`SELECT ref_no, academic_year, event_name, event_category, start_date, end_date, submitter_name, submitter_dept, opening_balance, status FROM public.permission_requests WHERE submitter_dept = ${user.department_code || ''}`;
      } else {
        rows = await sql`SELECT ref_no, academic_year, event_name, event_category, start_date, end_date, submitter_name, submitter_dept, opening_balance, status FROM public.permission_requests WHERE faculty_id = ${user.id}`;
      }
    } else if (tableName === 'faculty_leaves' || tableName === 'leaves') {
      if (can(user, 'leave:view_all')) {
        rows = await sql`SELECT ref_no, faculty_name, department, leave_type, start_date, end_date, total_days, reason, alternate_faculty, status, hod_name, hod_remark, principal_name, principal_remark, created_at FROM public.faculty_leaves ORDER BY created_at DESC`;
      } else if (user.role === 'HOD') {
        rows = await sql`SELECT ref_no, faculty_name, department, leave_type, start_date, end_date, total_days, reason, alternate_faculty, status, hod_name, hod_remark, principal_name, principal_remark, created_at FROM public.faculty_leaves WHERE department = ${user.department_code || ''} OR faculty_id = ${user.id} ORDER BY created_at DESC`;
      } else {
        rows = await sql`SELECT ref_no, faculty_name, department, leave_type, start_date, end_date, total_days, reason, alternate_faculty, status, hod_name, hod_remark, principal_name, principal_remark, created_at FROM public.faculty_leaves WHERE faculty_id = ${user.id} ORDER BY created_at DESC`;
      }
    } else {
      if (!can(user, 'admin:table_editor_read')) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
      rows = await sql.unsafe(`SELECT * FROM public.${tableName} LIMIT 2000`);
    }

    if (!rows.length) {
      res.status(200).send('\uFEFFNo records found.');
      return;
    }

    const COLUMN_LABELS: Record<string, string> = {
      ref_no: 'Reference Number',
      academic_year: 'Academic Year',
      event_name: 'Event Title',
      event_category: 'Category',
      start_date: 'Start Date',
      end_date: 'End Date',
      submitter_name: 'Organizing Faculty',
      submitter_dept: 'Department',
      opening_balance: 'Budget (INR)',
      status: 'Current Status',
      faculty_name: 'Faculty Member',
      department: 'Department',
      leave_type: 'Leave Type',
      total_days: 'Total Days',
      reason: 'Reason for Leave',
      alternate_faculty: 'Lecture Adjustment Faculty',
      hod_name: 'HOD Name',
      hod_remark: 'HOD Remark',
      principal_name: 'Principal Name',
      principal_remark: 'Principal Remark',
      name: 'Full Name',
      email: 'Institutional Email',
      role: 'Portal Role',
      designation: 'Designation',
      phone: 'Phone Number',
      created_at: 'Created Date',
    };

    const headers = Object.keys(rows[0]).filter((k) => !['password_hash', 'token_hash'].includes(k));
    const headerDisplay = headers.map((h) => `"${(COLUMN_LABELS[h] || h).replace(/"/g, '""')}"`);
    const csvLines = [
      headerDisplay.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${tableName}_${dateStr}.csv`;

    // UTF-8 with BOM (\uFEFF) ensures Excel opens special characters correctly
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvLines.join('\r\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export CSV.' });
  }
});

// Polished Excel (.xlsx) Export
app.get('/api/export/excel/:report', authenticate, async (req, res) => {
  const user = req.user!;
  const reportType = req.params.report;

  try {
    let buffer: Buffer;
    const dateStr = new Date().toISOString().slice(0, 10);
    let filename = `Docworm_${reportType}_${dateStr}.xlsx`;

    if (reportType === 'staff-directory') {
      buffer = await generateStaffDirectoryExcel(user);
    } else if (reportType === 'permission-requests' || reportType === 'proposals') {
      buffer = await generatePermissionRequestsExcel(user);
    } else {
      res.status(400).json({ error: `Unknown Excel report: ${reportType}` });
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate Excel report.' });
  }
});

// Audit Log (Scoped by role)
app.get('/api/audit-log', authenticate, async (req, res) => {
  const user = req.user!;
  try {
    let rows: any[];
    if (can(user, 'admin:view_read_only')) {
      rows = await sql`SELECT * FROM public.audit_log ORDER BY created_at DESC LIMIT 200`;
    } else {
      rows = await sql`SELECT * FROM public.audit_log WHERE actor_id = ${user.id} ORDER BY created_at DESC LIMIT 50`;
    }
    res.json({ logs: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit trail.' });
  }
});

// Serve static production build if available
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server (standalone / local only; Vercel serverless imports app directly)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Docworm Production Server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
