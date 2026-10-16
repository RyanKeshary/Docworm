# Docworm Production Migration Changelog

This document provides a comprehensive chronological record of all architectural changes, security enhancements, migrations, and feature implementations completed during the transformation of Docworm from a dummy mockup into a secure, enterprise-grade production application.

---

## [Phase 0] Ground Rules & Repository Audit
- **Stack Audited**:
  - Frontend: React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4, React Router 7, Lucide React.
  - Backend Server: Node.js with Express 5, TypeScript execution via `tsx`.
  - Database: PostgreSQL (Supabase Cloud) accessed via `postgres.js` with SSL and connection pooling.
  - Authentication: JWT in httpOnly `SameSite=Lax` cookies, bcrypt password hashing.
  - Reporting: ExcelJS (styled `.xlsx` workbooks), UTF-8 BOM CSV streaming.
  - Messaging: Nodemailer (SMTP/Ethereal fallback), W3C Web Push with VAPID keys.
- **Audit Findings Documented**: Generated [AUDIT.md](file:///AUDIT.md) enumerating all routes, mock sources, client env variables, and table dependencies.

---

## [Phase 1] Security Hardening & Secret Isolation
- **Secret Isolation**:
  - Eliminated all client-side exposure of `sb_secret_*`, raw PostgreSQL connection strings, and service role keys.
  - Verified bundle: Grep search across `dist/` bundle confirms 0 exposed secrets.
  - Created `.env.example` containing environment variable keys without sensitive values.
  - Confirmed `.env*` exclusion in `.gitignore`.
- **Compromised Key Rotation Notice**:
  - Documented exposed credentials in [SECURITY_REPORT.md](file:///SECURITY_REPORT.md) with exact rotation steps for Supabase secret keys and database master password.
- **Defensive Server Middlewares**:
  - Installed `helmet` for HTTP security headers (CSP, HSTS, X-Frame-Options).
  - Configured CORS whitelist restricted to the application origin.
  - Implemented `express-rate-limit` for authentication and password reset endpoints (5 requests per 15 min).
  - Parameterized all SQL statements using `postgres.js` tagged templates (`sql\`...\``) to prevent SQL injection.

---

## [Phase 2] Real Working Database & Schema Migrations
- **Supabase Cloud Connection**:
  - Resolved direct IPv6 domain resolution failures by configuring the Supabase connection pooler (`aws-0-ap-southeast-2.pooler.supabase.com:5432`) with SSL enabled.
- **Production Migrations (`0006_production_schema.sql`)**:
  - Applied 22 production tables with relational foreign keys, constraints, and performance indexes:
    - `users`: Includes `role` enum (`principal`, `dean`, `hod`, `faculty`), `department_id` (NULL for Principal), `must_change_password`, and `status`.
    - `departments` & `event_categories`: Controlled lookup tables.
    - `academic_options`: Dynamic repository for restricted dropdowns with `active` status flags.
    - `permission_requests`: Core workflow table with status tracking, approval chain, budget heads, and decision notes.
    - `announcements` & `announcement_receipts`: Broadcast messaging and read receipts.
    - `push_subscriptions`: W3C Web Push device tokens.
    - `password_reset_tokens`: SHA-256 hashed single-use tokens with 60-minute expiry.
    - `app_settings`: Key-value storage for configurable letterhead, SMTP details, and system flags.
    - `audit_log`: Immutable audit ledger with actor metadata, action, and target records.
- **Health Check & Bootstrap**:
  - Created `/api/health` endpoint reporting database connectivity and latency.
  - Implemented `npm run bootstrap` creating initial reference data, 7 departments, 9 event categories, 61 academic options, and the Master Principal account (`principal@slrtce.in`) with forced password change.
  - Created `npm run seed:dev` for isolated development accounts.

---

## [Phase 3] Role-Based Access Control (RBAC) Matrix
- **Central Authorization Engine (`server/rbac.ts`)**:
  - Unified `can(user, action, resource)` policy engine enforcing the mandatory permission matrix.
  - Replaced ad-hoc UI conditionals with centralized permission queries.
- **Role Scoping Enforced**:
  - **Principal**: Complete institution-wide authority. Can approve, deny, or revert requests; appoint, edit, or terminate staff; manage database tools; dispatch announcements.
  - **Dean**: Read-only institution-wide visibility across all departments and proposals. Hard 403 blocks on staff mutations, approvals, and write operations.
  - **HOD**: Strictly scoped to own department (`department_id`). Cross-department data access blocked with 403 Forbidden. Can endorse department requests.
  - **Faculty**: Strictly scoped to personal records and submissions. Can create permission requests and track assigned tasks.
- **Automated Verification**:
  - Implemented `server/tests/rbac.test.ts` running 49 automated unit tests verifying every role × action combination. All 49 passed.

---

## [Phase 4] Principal Department Neutrality
- **Institutional Neutrality**:
  - Verified and migrated `department_id = NULL` for all Principal accounts in PostgreSQL.
  - Updated profile forms, staff tables, and registration filters to remove department associations from Principal accounts.
  - Ensured department dropdowns and staff listings do not categorize the Principal as a departmental member.

---

## [Phase 5] Profile Management & Self-Service
- **Self Profile Management**:
  - Added self-service endpoints (`PUT /api/profile` and `POST /api/auth/change-password`).
  - Users can update their name, designation, contact phone, and profile photo URL.
  - Implemented password change requiring current password verification and 8+ character length validation.
- **Administrative Staff Management**:
  - Built `EditStaffModal` allowing the Principal to edit any staff member's name, email, department, role, designation, phone, and account status (`active`, `pending_approval`, `suspended`).
  - Implemented immediate state persistence and UI refresh.

---

## [Phase 6] Settings, Admin Console & Mitigation Tools
- **Cloud Table Editor**:
  - Built interactive table browser with pagination, row search, dynamic column rendering, and UTF-8 BOM CSV export (`/api/export/csv/:table`).
- **Interactive SQL Console**:
  - Built server-side SQL editor featuring query templates, execution timer, and row counter.
  - Enforced Read-Only Safe Mode by default with an explicit Write Mode toggle and a confirmation modal for destructive queries (DROP, TRUNCATE, unqualified DELETE/UPDATE).
- **Mitigation & Recovery Tools**:
  - Provided one-click administrative utilities:
    1. Principal Department Neutrality enforcer (`department_id = NULL`).
    2. Live Database & Pooler Latency probe (`/api/health`).
    3. Orphan record & notification receipt cleaner.
    4. Database table constraint & foreign key integrity verifier.
- **Academic Options & Dropdowns Manager**:
  - Full CRUD UI for managing restricted dropdown values (Programs, Years, Semesters, Designations, Budget Heads, Resource Types) with soft-deactivation.
  - CRUD management for Departments and Event Categories.
- **Configurable SMTP & Email**:
  - Settings UI to configure SMTP Host, Port, TLS, Username, Password, Sender Name, and Sender Email.
  - "Send Test Email" feature with instant deliverability feedback and preview URL generation.

---

## [Phase 7] Authentication & Secure Forgot Password
- **Authentication Workflow**:
  - Replaced insecure mock login with bcrypt password comparison against PostgreSQL `users`.
  - Issued signed JWT tokens stored in secure httpOnly cookies.
  - Enforced first-login forced password change (`must_change_password`) with interactive password strength meter.
- **Forgot Password Flow**:
  - User submits email -> generic response returned to prevent account enumeration.
  - Cryptographically random 64-character token generated and saved as a SHA-256 hash with 60-minute expiry.
  - Reset link dispatched via email.
  - Reset password page validates token, enforces password policy, updates bcrypt hash, invalidates token, and sends confirmation notification.

---

## [Phase 8] Broadcast & Announcement Pipeline
- **Multi-Channel Distribution**:
  - Principal-only announcement composer supporting audience targeting (All Faculty or specific Department) and priority levels (Normal, Urgent, Critical).
  - Delivered concurrently via:
    1. Outbound Email batch to all targeted recipients.
    2. W3C Web Push Notifications to registered browser endpoints.
    3. In-App Notification Center with persistent unread badges and "Mark as Read" actions.
- **Delivery Analytics**:
  - Tracked per-recipient delivery receipts in `announcement_receipts` reporting sent, failed, and read metrics to the Principal.

---

## [Phase 9] UI/UX Overhaul
- **Modern Split-Screen Authentication Portal**:
  - Replaced rigid login layout with an institutionally branded split-screen portal featuring subtle glassmorphic styling, floating labels, password visibility toggles, loading spinners, and inline validation.
  - Smooth client transitions between Sign In, Register, Forgot Password, Reset Password, and First-Login Password Change.
- **Role-Aware Dashboards & Navigation**:
  - Navbars dynamically adapt based on role permissions (Dean sees read-only indicators; Principal sees Master Administration; Faculty sees Personal Workspace).
  - Responsive tables with loading skeletons, empty states, and WCAG-friendly contrast ratios.

---

## [Phase 10] Professional Excel Reports (.xlsx)
- **Server-Side Excel Generation (`server/excel.ts`)**:
  - Utilized `exceljs` for pixel-perfect workbook generation.
  - Reports formatted with:
    - Institutional header block with College Name and Report Timestamp.
    - Deep blue styled header rows with white text.
    - Frozen panes for easy scrolling.
    - Auto-calculated column widths with safety margins.
    - Alternating zebra row striping.
    - Live formula rows (e.g. `SUM(...)` for budgets and totals).
    - Print setup configured for Landscape fit-to-width.
  - Implemented reports for Staff Directory (`/api/export/excel/staff`) and Permission Requests (`/api/export/excel/requests`), both strictly scoped by the user's RBAC role.

---

## [Phase 11] Verification & Production Delivery
- **Automated Test Results**:
  - `npm test`: 49/49 RBAC matrix tests passed.
  - `npm run build`: Zero TypeScript or linting errors, production bundle compiled cleanly in 6.67s.
  - Secret scanning: 0 secrets detected in client artifacts.
  - Database verification: Live connection verified, Excel workbooks verified.
