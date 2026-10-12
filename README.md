# Docworm, Digital Permission and Task System for SLRTCE

Docworm replaces paper permission letters in an engineering college with a digital approval and task management system. The principal is the main admin.

- Frontend: React 19, React Router, Tailwind CSS, Lucide icons, Inter font
- Backend: Supabase (Postgres with Row Level Security, Auth, Storage, Edge Functions). Without env keys the app falls back to a local demo data layer.
- Hosting: Vercel (CDN, SPA rewrites, security headers, see `vercel.json`)
- Product name Docworm appears in: sidebar wordmark, login page, browser tab title, exported file headers, and this README

## Quick start (demo mode, no backend)

```bash
cd docworm
npm install
npm run dev
```

Open `http://localhost:5174`. Production build: `npm run build`, preview: `npm run preview`.

## Production setup (Supabase + Vercel)

The live backend is already migrated and seeded. To reproduce from scratch:

```bash
# 1. Apply database migrations (schema, RLS, storage bucket, ref counter)
npm run db:migrate
# Needs DATABASE_URL in docworm/.env (Supabase dashboard, Project Settings, Database).

# 2. Create auth users, profiles, and seed proposals/tasks
npm run seed:supabase
# Needs SUPABASE_URL and SUPABASE_ANON_KEY in docworm/.env.

# 3. Point the frontend at Supabase
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase dashboard, Project Settings, API.

# 4. Deploy the notify edge function (email on notifications)
# Install the Supabase CLI, then:
supabase functions deploy notify --project-ref <ref>
supabase secrets set RESEND_API_KEY=... MAIL_FROM="Docworm <office@slrtce.in>" APP_URL=https://your-app.vercel.app
# Without RESEND_API_KEY the function logs and skips sending, in-app notifications still work.

# 5. Deploy hosting (Vercel, recommended)
# - Import the repo in Vercel, set Root Directory to docworm
# - Build command: npm run build, Output: dist
# - Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
# - vercel.json already handles SPA rewrites, asset caching, and security headers
```

Why Vercel over alternatives: the app is a static Vite SPA, so it needs CDN hosting with SPA fallback, not a Node server. Vercel gives that plus preview deploys per change and free SSL. Supabase hosts all stateful parts (DB, auth, files). Render or Netlify work too, but Vercel pairs best with the existing Next.js project already deployed there.

## Demo accounts

All demo passwords are `docworm123`.

| Role | Email | Scope |
|---|---|---|
| Principal | principal@slrtce.in | sees everything, final approver, assigns tasks |
| Dean | dean.swdc@slrtce.in | submits, reviews SWDC routed proposals |
| HOD IT | hod.it@slrtce.in | own dept plus room requests for IT rooms |
| HOD EXTC | hod.extc@slrtce.in | same for EXTC |
| HOD ECS | hod.ecs@slrtce.in | same for ECS |
| HOD HAS | hod.has@slrtce.in | same for HAS |
| Faculty | p.salvi@slrtce.in | Technical Coordinator, IT, submitter of hackathon |

Dev-only role switcher: in local demo mode only, click the dashed Dev menu button at the bottom of the sidebar to impersonate any user. It is hidden automatically when Supabase is configured.

## Backend model (Supabase)

- `src/lib/supabase.ts`: client singleton, `isSupabaseConfigured` flag. With env keys set the app runs in Supabase mode, otherwise local demo mode.
- `src/lib/backend.ts`: row mappers plus all reads and writes against `docworm_*` tables, atomic ref numbers via `docworm_next_ref_number`, storage upload with 10 MB and MIME checks, signed download URLs.
- `src/store.tsx`: same `useData` API in both modes. Supabase mode loads the workspace after sign in, writes optimistically to UI state and syncs changed rows in the background, surfaces sync problems in a banner instead of blocking.
- Auth: Supabase email and password, role read from `docworm_profiles` (never trusted from the client), lockout after 5 failed attempts, `must_change_password` flag set on seeded accounts.
- RLS: principal sees everything, staff see own submissions plus items in their approval steps, HODs can decide room rows for their department, tasks visible to principal, assigner, and assignees, notifications strictly own.
- Storage: private `docworm-attachments` bucket, per user folders, signed URLs with 1 hour expiry.
- Email: `supabase/functions/notify` invoked fire and forget after each notification insert. Needs `RESEND_API_KEY` to actually send, otherwise logs.

## Load handling for real staff usage

- Database indexes on every hot filter (status, year, date, department array, assignee, notification user and read state).
- Atomic ref counter so concurrent submits never collide.
- Lists render in pages of 50 with Show more, board columns capped at 20, server fetches capped (500 proposals, 300 notifications) with newest first ordering.
- Writes persist only changed rows, notifications and email hooks never block the UI.
- Connection pooling via Supabase pooler, stateless frontend on Vercel CDN.
- Before go live: run `npm run build`, click through principal and faculty logins, and re-run `npm run seed:supabase` any time to restore demo data (it is idempotent).

## What is seeded

- Shree L.R. Tiwari College of Engineering, Mira Road context
- Internal Hackathon on 29 to 30 Aug 2026 with 5 resource rows to HODs of HAS, IT, EXTC, ECS, signed by Technical Coordinator, HOD IT, Dean SWDC
- 8 proposals across statuses: Draft, Submitted, Under Review, Approved, Rejected, Changes Requested, Completed
- 15 tasks across Not Started, In Progress, Completed, Overdue
- Comments, notifications, audit log entries

Reset anytime: Settings (Principal) then Reset demo data. This clears localStorage keys prefixed `docworm:`.

## Feature map

- Proposals: 5 step form (Basics, Resources, Budget, PO Mapping, Review) with progress bar, draft auto-save to localStorage, ref format SLRTCE/CELL OR DEPT/CATEGORY/number, repeatable resource rows split per HOD, budget toggle with auto totals and negative balance guard, PO1 to PO12 checklist with hover full names, Preview as letter with PDF and DOCX download. Organizing body options: Department, Student Council, SWDC, NSS, DLLE, R&D Cell, T&P Cell, Other. Audience options: Students, Staff, Both, External participants, Alumni, Other (with free text input when Other is picked). Dashboard greets the principal as Principal Sir.
- Approvals: Draft, Submitted, Under Review, Approved, Rejected, Changes Requested, Withdrawn, Completed. Chain Submitter, HOD, Dean (optional), Principal. Approve, Reject (remark mandatory), Request Changes (remark mandatory). Bulk approve with checkboxes (Principal). Room sub-request approve per HOD. Audit log, notifications with bell count, comment thread, visual timeline
- Completion reports: auto pending after event date, Done or Not Done with mandatory reason, completeness indicator, principal Pending reports list with overdue highlight and Send reminder. Every single report exports individually (CSV, XLSX, PDF, Print) from its proposal page and from Reports, plus bulk export of all submitted reports.
- Tasks: Principal assigns to HOD, Dean, Faculty. Types from fixed dropdown, priority, due date, auto Overdue, table plus board views, filters, status updates, progress comments, reassign via new assignment, extend with logged reason, cancel, assignment and due soon and overdue notifications
- Dashboards: compact uneven stat strip (no three card row), clickable tiles open slide-over panel, clickable rows open detail, charts for dept and status with click to filter, clash detection, global search, role scoped views
- Exports: every list has CSV, XLSX, PDF, Print respecting filters and column selection. Detail pages add formal letter PDF and DOCX. Principal bulk export by date range, dept, status plus approved letters batch. Analytics export per academic year
- Settings (Principal): users, dropdown options central config (`src/config.ts` plus persisted override), academic year, letterhead, audit log

## Data layer and demo mode

Without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the app runs fully offline: all persistence lives in `src/store.tsx` (localStorage) and seed in `src/seed.ts`. Types in `src/types.ts`. Option lists in `src/config.ts`. The dev role switcher only appears in this mode.

## Design rules compliance

- Primary purple #6D4AFF, dark #5B3FD1, tints only for hover and selected. Flat solid colors, no gradients
- Status badges only: green approved, amber pending, red rejected, gray draft. Rest stays purple and neutral
- Lucide icons only, no emojis. No em dashes in copy, code, or labels. Inter throughout, 8px spacing, 8 to 12px radius, 1px borders, soft shadows
- Sidebar plus top bar with search, bell, user menu. Collapsible on desktop, drawer on mobile. Tables collapse to stacked cards
- No three feature cards in a row anywhere. Dashboard uses uneven stat strip and mixed grid

## Scripts

- `npm run dev`: start Vite dev server on port 5174
- `npm run build`: type check then production build to `dist/`
- `npm run preview`: preview the production build
- `npm run seed:supabase`: create auth users, profiles, and seed data in Supabase (idempotent)
