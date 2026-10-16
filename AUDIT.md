# System Audit Report (Docworm)

## 1. Stack Identification
- **Frontend Framework**: React 19 (`react`, `react-dom`) + TypeScript 5.7
- **Routing**: `react-router-dom` v7.1.3 (Browser router with role-based navigation)
- **Styling**: TailwindCSS v3.4 + PostCSS, custom CSS tokens (`src/index.css`)
- **Backend / API**: Express 4 server (`server/`) with TypeScript runtime via `tsx`
- **Database**: PostgreSQL 17 (hosted on Supabase, AWS AP-Southeast-2)
- **Database Client / Driver**: `postgres` (postgres.js v3.4.9) with tagged template literals (parameterized queries)
- **Authentication**: JWT tokens in secure `httpOnly` + `SameSite=Lax` cookies; bcryptjs (10 rounds) for password hashing
- **Security**: `helmet` (security headers), `cors` (origin locked), `express-rate-limit` (auth endpoints), `zod` (server-side input validation)
- **Email Library**: `nodemailer` (configurable SMTP + test account support)
- **Web Push**: `web-push` (VAPID key pair, service worker push notifications)
- **Document / Report Generation**: `exceljs` (server-side styled `.xlsx`), CSV streaming, `jspdf` / `docx` (client letterhead exports)
- **Hosting / Deployment Target**: Vercel (`vercel.json`) / Node production server

---

## 2. All Pages & Routes

### Frontend Routes
| Path | Component | Purpose & Access Level |
|---|---|---|
| `/login` | `Login` | Dual-mode login & faculty registration with forgot password flow |
| `/` | `PermissionPortal` | Main institutional permission requests & approval workflow |
| `/requests` | `PermissionPortal` | Filterable list of institutional permission requests |
| `/proposals` | `PermissionPortal` | Proposal listing, approval timeline, decision modals |
| `/faculty` | `FacultyPanel` | Faculty coordinator portal & request submission |
| `/notifications` | `NotificationsCenter` | In-app alerts, read tracking, broadcast center |
| `/settings` | `SettingsPage` | System administration, staff directory, academic options, DB tools |

### Backend API Endpoints (`/api/*`)
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Live database connectivity status, uptime, server time |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Secure password verification, JWT cookie issuance |
| `POST` | `/api/auth/register` | Public (Rate-limited) | Faculty registration submitted for Principal approval |
| `POST` | `/api/auth/logout` | Authenticated | Clears session cookie and invalidates session |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated user profile & permissions |
| `POST` | `/api/auth/forgot-password` | Public (Rate-limited) | Generic response; generates hashed token and sends reset email |
| `POST` | `/api/auth/reset-password` | Public (Rate-limited) | Validates token hash, updates password hash, invalidates sessions |
| `POST` | `/api/auth/change-password` | Authenticated | Verifies current password and updates hash |
| `GET` | `/api/profile` | Authenticated | Gets current user profile |
| `PUT` | `/api/profile` | Authenticated | Updates own name, phone, designation, photo |
| `GET` | `/api/users` | Principal, Dean, HOD | Staff directory (scoped by RBAC: HOD sees own dept) |
| `PUT` | `/api/users/:id` | Principal only | Updates staff profile, role, department, designation, status |
| `POST` | `/api/users/:id/approve` | Principal only | Approves pending faculty registration |
| `POST` | `/api/users/:id/reject` | Principal only | Rejects pending faculty registration |
| `DELETE` | `/api/users/:id` | Principal only | Terminates/removes staff account (Principal protected) |
| `GET` | `/api/permission-requests` | Authenticated | Scoped listing of permission requests (Principal/Dean: all; HOD: dept; Faculty: own) |
| `POST` | `/api/permission-requests` | Faculty, HOD | Creates new permission request |
| `GET` | `/api/permission-requests/:id` | Authenticated | Retrieves single request detail |
| `PUT` | `/api/permission-requests/:id` | Authenticated | Updates request (own draft or status change) |
| `POST` | `/api/permission-requests/:id/decide` | Principal, HOD (chain) | Approves, denies, or requests changes; audit-logged |
| `GET` | `/api/announcements` | Authenticated | Announcement history |
| `POST` | `/api/announcements` | Principal only | Broadcasts announcement via Email, Web Push, In-App bell |
| `POST` | `/api/announcements/:id/read` | Authenticated | Marks announcement receipt as read |
| `POST` | `/api/push/subscribe` | Authenticated | Stores browser push subscription |
| `GET` | `/api/options` | Authenticated | Dynamic academic options and restricted dropdown values |
| `PUT` | `/api/options` | Principal only | CRUD operations for restricted dropdowns |
| `GET` | `/api/departments` | Authenticated | Active college departments list |
| `POST` | `/api/departments` | Principal only | Add new department |
| `PUT` | `/api/departments/:id` | Principal only | Rename or deactivate department |
| `GET` | `/api/event-categories` | Authenticated | Active event categories list |
| `POST` | `/api/event-categories` | Principal only | Add event category |
| `PUT` | `/api/event-categories/:id` | Principal only | Rename or deactivate event category |
| `GET` | `/api/admin/tables` | Principal only | Lists all database tables with row counts |
| `GET` | `/api/admin/tables/:table` | Principal only | Cloud Table Editor: paginated rows, search, sort |
| `POST` | `/api/admin/tables/:table` | Principal only | Cloud Table Editor: insert row |
| `PUT` | `/api/admin/tables/:table/:id` | Principal only | Cloud Table Editor: update row |
| `DELETE` | `/api/admin/tables/:table/:id` | Principal only | Cloud Table Editor: delete row |
| `POST` | `/api/admin/sql` | Principal only | Safe SQL runner (read-only default, confirmation for write) |
| `GET` | `/api/export/csv/:table` | Authenticated (RBAC) | Quick CSV export with BOM, escaped quotes |
| `GET` | `/api/export/excel/:report` | Authenticated (RBAC) | Server-side formatted `.xlsx` workbook |
| `POST` | `/api/settings/test-email` | Principal only | Dispatches test email with status report |

---

## 3. Database Tables
1. `users`: Master institutional profiles with password hashes, roles, status, and department relation (Principal `department_id = NULL`).
2. `departments`: College departments (`IT`, `CMPN`, `EXTC`, `ECS`, `MECH`, `CIVIL`, `HAS`, etc.).
3. `event_categories`: Standardized categories (`Technical`, `Cultural`, `Sports`, `Workshop`, `Seminar`, etc.).
4. `academic_options`: Restricted dropdown values (`years`, `semesters`, `programs`, `designations`, `budgetHeads`, etc.).
5. `permission_requests`: Institutional permission request parent record.
6. `permission_request_resources`: Classroom, lab, auditorium room allocations and clash tracking.
7. `permission_request_budget_items`: Itemized budget requests and expenses.
8. `permission_request_po_mappings`: Program Outcome (PO1-PO12) mappings.
9. `permission_request_approval_steps`: Sequential review chain (`Submitter` -> `HOD` -> `Dean` -> `Principal`).
10. `permission_request_comments`: Official remarks, queries, and endorsement notes.
11. `permission_request_attachments`: Attached brochures, schedules, and circulars.
12. `permission_request_completions`: Post-event completion evidence and participant statistics.
13. `tasks`: Action items, deadlines, priorities, assignees.
14. `task_assignees`: Many-to-many relationship linking tasks to assigned staff.
15. `task_updates`: Progress updates and status logs on tasks.
16. `announcements`: Principal broadcasts with priority, department scope, and body.
17. `announcement_receipts`: Per-user delivery and read timestamp log.
18. `push_subscriptions`: W3C Web Push notification endpoints and crypto keys.
19. `password_reset_tokens`: Cryptographic SHA-256 token hashes with 60-minute expiry.
20. `app_settings`: Key-value JSON storage for email sender, SMTP configuration, letterhead header.
21. `audit_log`: System-wide audit trail of decisions, permissions, and administrative changes.

---

## 4. Mock / Seed / Hardcoded Data Locations
- `src/seed.ts`: Contained `SEED_USERS` with hardcoded plain text passwords (`password123`).
- `src/config.ts`: Contained `DEFAULT_OPTIONS` with hardcoded arrays used when localStorage was uninitialized.
- `src/pages/pages1.tsx` & `src/pages/pages3.tsx`: Hardcoded department lists and mock fallbacks.
- `src/store.tsx`: `uid()` generator using `Math.random().toString(36)`.
- All production paths have been updated to query PostgreSQL directly via `/api/*`. Mock data is strictly restricted to an optional developer seed script (`npm run seed:dev`).

---

## 5. Client Environment & Secret Exposure Audit
- **Exposed Secret**: `scripts/fix-auth.ts` contained hardcoded `sb_publishable_...[REDACTED]` and reference URL.
- **Client Supabase Client**: `src/lib/supabase.ts` read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, allowing the browser direct table access.
- **Client Plaintext Passwords**: `src/store.tsx` stored user credentials and passwords in browser `localStorage`.
- **Resolution**:
  - All direct database connections, service role keys, SMTP passwords, and JWT secrets have been isolated server-side.
  - The client interacts solely with the secure `/api/*` endpoints via httpOnly cookies.
  - No secret environment variable carries a `VITE_` prefix.

---

## 6. Database Connectivity Root Cause Analysis
1. **IPv6-Only Direct Host**: The Supabase direct database connection `db.qxubecsjbazkhhexgwxo.supabase.co:5432` resolves exclusively to an IPv6 address (`2406:da1c:10e4:6400:4e4:95c4:71e:646f`). On systems without an active IPv6 internet gateway, Node.js `getaddrinfo` fails with `ENOTFOUND`.
2. **Supabase Connection Pooling**: Supabase provides IPv4 compatibility through its connection pooler. The project is hosted in AWS region `ap-southeast-2`. The verified working connection string uses `aws-0-ap-southeast-2.pooler.supabase.com:5432` with username `postgres.qxubecsjbazkhhexgwxo`.
3. **Password Trailing Character**: The connection string originally provided contained a trailing shell prompt character `$` (`golumolu1234$`), whereas the real password is `golumolu1234`. Once adjusted to use the pooler and correct password, connection was verified 100%.

---

## 7. Local Mitigation Tools Audit
- **Purge Fake Data**: Retained and wired to remove legacy demo records from both local storage and database.
- **Cloud Table Editor**: Upgraded from an external Supabase link to an integrated, in-app Table Editor with search, pagination, inline CRUD, and CSV export.
- **SQL Editor**: Upgraded to an integrated server-side query runner with read-only protection by default and safety confirmation modals for write queries.
