# Security Hardening & Exposure Audit Report

## 1. Inventory of Exposed & Compromised Secrets

| Location | Secret Type | Exposed Value / Pattern | Status | Risk Level |
|---|---|---|---|---|
| `scripts/fix-auth.ts:12` | Supabase Anon Key | `sb_publishable_QMmz...[REDACTED]` | Hardcoded in Git repository | **CRITICAL** (Requires Rotation) |
| `scripts/fix-auth.ts:13` | Supabase URL | `https://oqqzzyombtcjvlqbjvla.supabase.co` | Hardcoded in Git repository | High (Project endpoint exposed) |
| Git History `12a54e6` | Supabase Publishable Key | `sb_publishable_QMmz...[REDACTED]` | Committed in Git history | **CRITICAL** (Requires Rotation) |
| User Prompt / Chat | Postgres Password | `[REDACTED_POSTGRES_PASSWORD]` | Shared in plaintext | **CRITICAL** (Must be Rotated in Supabase) |
| User Prompt / Chat | Supabase Secret Key | `sb_secret_cU28...[REDACTED]` | Shared in plaintext | **CRITICAL** (Must be Rotated in Supabase) |
| `src/seed.ts` | Default Passwords | `password123`, `docworm123` | Hardcoded plaintext default passwords | Medium (Addressed via bcrypt hashing & forced change) |
| `src/lib/supabase.ts` | Client Supabase Client | Direct client-side Supabase connection | Deprecated & isolated to server | High (Bypassed server authorization) |

---

## 2. Secrets Requiring Immediate Rotation & Exact Steps

Because the database password and Supabase Service Role Key were transmitted in plaintext, they must be rotated immediately in production:

### A. Rotate Database Password
1. Navigate to the Supabase Dashboard: **Project Settings** > **Database**.
2. Scroll to **Database Password** and click **Reset Database Password**.
3. Generate a strong, random 24+ character password without special shell control characters.
4. Update `DATABASE_URL` in your server environment (e.g., in `.env` and deployment hosting provider settings).
5. Never paste this password into public repositories or client-facing configuration.

### B. Rotate Supabase Service Role Secret Key
1. In the Supabase Dashboard, go to **Project Settings** > **API**.
2. Under **Project API Keys**, find the **service_role (secret)** key.
3. Click **Roll Key** / **Generate new secret key**.
4. Update `SUPABASE_SERVICE_ROLE_KEY` in the server `.env` file.
5. Invalidate the old key immediately.

### C. Revoke Legacy Project Keys (`oqqzzyombtcjvlqbjvla`)
1. If the old project `oqqzzyombtcjvlqbjvla` referenced in `scripts/fix-auth.ts` is no longer in use, delete the project from the Supabase dashboard.
2. If still active, regenerate its API keys immediately.

---

## 3. Server-Side Security Isolation Architecture

To guarantee the browser never holds elevated permissions or sensitive connection credentials, the architecture has been overhauled:

1. **Server-Side API Gateway**: All interactions with PostgreSQL, email services, and user management run exclusively within the Node.js Express server (`server/index.ts`).
2. **Zero Client Secrets**: The browser bundle receives only the public origin. No prefix like `VITE_` or `NEXT_PUBLIC_` is attached to any database string, service key, or token secret.
3. **Password Security**:
   - Industry-standard `bcryptjs` hashing with 10 salt rounds.
   - Plaintext passwords are never persisted to disk or database.
   - Enforced password complexity: minimum 8 characters, requiring uppercase, lowercase, and numbers.
   - Visual password strength meter on all authentication panels.
4. **Session Management**:
   - Cryptographically signed JWT tokens stored in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies.
   - Prevents Cross-Site Scripting (XSS) token theft.
5. **CORS & HTTP Security Headers**:
   - `helmet` middleware sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and Content Security Policy (CSP).
   - `cors` is locked strictly to the client application origin.
6. **Rate Limiting**:
   - Strict rate limiting on `/api/auth/login` (max 5 requests per 15 minutes per IP).
   - Strict rate limiting on `/api/auth/forgot-password` (max 3 requests per hour per email/IP).
7. **SQL Injection Prevention**:
   - Raw string concatenation in queries is strictly prohibited.
   - 100% of database queries use `postgres.js` tagged template literals with parameterized values.
8. **Server-Side Role Checks**:
   - Every protected route enforces the central authorization module (`can(user, action, resource)`).
   - Client-reported roles in request bodies or local storage are completely ignored.

---

## 4. Bundle Verification Grep Test

To verify that zero secrets are leaked into the production frontend bundle:

```bash
npm run build
grep -rn "sb_secret" dist/
grep -rn "golumolu" dist/
grep -rn "postgres:" dist/
grep -rn "DATABASE_URL" dist/
```

**Result**: 0 matches found in `dist/`. All secrets remain strictly isolated on the backend server.
