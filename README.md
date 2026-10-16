# Docworm: Enterprise College Permission & Task Management System

Docworm is a full-stack, enterprise-grade institutional workflow and permission governance application designed for engineering colleges (SLRTCE). It digitizes paper-based permission letters, approvals, budget clearances, seminar hall scheduling, and task delegation with strict Role-Based Access Control (RBAC).

---

## 🏛️ System Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, Lucide Icons.
- **Backend API Server**: Node.js, Express 5, TypeScript (`server/index.ts`).
- **Database**: PostgreSQL (Supabase Cloud) accessed via connection pooler with SSL.
- **Security**: JWT in httpOnly `SameSite=Lax` cookies, bcrypt password hashing, parameterized SQL queries, rate limiting, and Helmet security headers.
- **Reporting**: ExcelJS for pixel-perfect server-generated `.xlsx` workbooks, and UTF-8 BOM CSV streaming.
- **Notifications**: Multi-channel distribution via Nodemailer (SMTP), W3C Web Push with VAPID keys, and in-app Notification Center.

---

## 🔐 Mandatory RBAC Matrix

Docworm strictly enforces this matrix on the server (`server/rbac.ts`) and across the UI:

| Capability | Principal | Dean | HOD | Faculty |
|---|---|---|---|---|
| **View all data & departments** | ✅ Yes | ✅ Yes (read-only) | ❌ No | ❌ No |
| **View staff & system data** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **View department data** | ✅ Yes | ✅ Yes | ✅ Own dept only | ❌ Own records only |
| **Sanction/Approve/Deny/Revert** | ✅ Yes | ❌ No (403) | 🟡 Dept endorsement | ❌ No |
| **Add / Edit / Terminate Staff** | ✅ Yes | ❌ No (403) | ❌ No | ❌ No |
| **Edit own profile** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Edit OTHER staff profiles** | ✅ Yes | ❌ No (403) | ❌ No | ❌ No |
| **Submit permission requests** | Optional | ❌ No | ✅ Yes (own) | ✅ Yes |
| **Broadcast announcements** | ✅ Yes | ❌ No (403) | ❌ No | ❌ No |
| **Admin Tools (SQL/Table Editor)**| ✅ Yes | 🟡 Audit Log only | ❌ No | ❌ No |

> **Note on Principal Department**: As mandated by institutional neutrality, Principal accounts have `department_id = NULL` across all tables, forms, and validation rules.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.x (tested on Node v20/v24)
- PostgreSQL database (e.g. Supabase instance)

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Database Connection (Server-side only)
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require

# Server Configuration
PORT=3001
JWT_SECRET=your-secure-jwt-secret-here
APP_URL=http://localhost:5173

# Initial Principal Bootstrap Credentials
INITIAL_PRINCIPAL_EMAIL=principal@slrtce.in
INITIAL_PRINCIPAL_PASSWORD=ChangeMePrincipal2026!

# SMTP Configuration (Optional in dev, uses Ethereal catcher if empty)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=approvals@slrtce.in
SMTP_PASS=your-app-password
MAIL_FROM="Docworm Approvals <approvals@slrtce.in>"

# Web Push Keys (VAPID)
VAPID_PUBLIC_KEY=BOm-AduQhF99l8bF_e7B3L9lS1fEwV_tV3XzC0E8lYq3hZ9J7L4W2k7L1N8M0K7P3Q1R5T6V8W9X0Y1Z2A3B4C5
VAPID_PRIVATE_KEY=oJSKqUB2j-j8r_qDk6N9mX1vY3wZ5a7b8c9d0e1f2g3
VAPID_SUBJECT=mailto:admin@slrtce.in
```

### 3. Database Migration & Bootstrap
Run the migration script to apply the 22 production tables, followed by the bootstrap script:
```bash
# Apply SQL migrations
npm run db:migrate

# Bootstrap institution (departments, categories, academic options, and first Principal account)
npm run bootstrap
```

*(Optional)* Seed development accounts for testing:
```bash
npm run seed:dev
```

### 4. Running the Application
Launch both backend API server and frontend client concurrently:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API Server: `http://localhost:3001`
- Health Check: `http://localhost:3001/api/health`

---

## 🧪 Testing & Verification

Run the automated RBAC matrix verification test suite (49 automated unit tests):
```bash
npm test
```

Build the production frontend bundle and typecheck:
```bash
npm run build
```

Verify zero secret leakage in client artifacts:
```bash
# Must return 0 matches
grep -rn "sb_secret" dist/
```

---

## 👥 Default Accounts (from `seed:dev`)

All passwords for dev accounts are `Docworm@2026!`:

| Role | Email | Scope |
|---|---|---|
| **Principal** | `principal@slrtce.in` | Master administrator, final sanction, staff management |
| **Dean** | `dean@slrtce.in` | Read-only across all departments |
| **HOD IT** | `hod.it@slrtce.in` | IT department proposals, room approvals |
| **HOD EXTC** | `hod.extc@slrtce.in` | EXTC department proposals |
| **Faculty (IT)** | `prof.sharma@slrtce.in` | Personal proposals and tasks |
| **Faculty (EXTC)**| `prof.patil@slrtce.in` | Personal proposals and tasks |

---

## 🚢 Production Deployment

1. **Backend Server**: Deploy `server/index.ts` to any Node.js container or PaaS (Render, Railway, Fly.io, AWS ECS) with environment variables from `.env`.
2. **Frontend Client**: The frontend is built into `dist/` with `npm run build` and can be served via Nginx, Vercel, or static CDN.
3. **Database**: Supabase PostgreSQL with pooled connections enabled on port 5432.
4. **Health Probe**: Point uptime monitoring tools to `GET /api/health`.
