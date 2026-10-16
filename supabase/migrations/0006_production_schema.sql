-- ====================================================================
-- Docworm Production Schema Migration (0006)
-- Conforms to production specifications with strict typing, foreign keys,
-- indexes, RBAC compatibility, and Principal department neutrality.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EVENT CATEGORIES
CREATE TABLE IF NOT EXISTS public.event_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACADEMIC OPTIONS (Restricted dropdown lists)
CREATE TABLE IF NOT EXISTS public.academic_options (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_academic_option_type_value UNIQUE(type, value)
);

-- 4. USERS (Master Staff Accounts)
-- Note: Principal ALWAYS has department_id = NULL.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Principal', 'Dean', 'HOD', 'Faculty')),
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  phone TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_approval', 'rejected', 'terminated')),
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PERMISSION REQUESTS (Proposals)
CREATE TABLE IF NOT EXISTS public.permission_requests (
  id TEXT PRIMARY KEY,
  ref_no TEXT NOT NULL UNIQUE,
  academic_year TEXT NOT NULL,
  date_of_request DATE NOT NULL DEFAULT CURRENT_DATE,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  organizing_body TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  audience TEXT[] NOT NULL DEFAULT '{}',
  departments TEXT[] NOT NULL DEFAULT '{}',
  years TEXT[] NOT NULL DEFAULT '{}',
  participants INTEGER NOT NULL DEFAULT 0,
  has_budget BOOLEAN NOT NULL DEFAULT FALSE,
  budget_head TEXT NOT NULL DEFAULT '',
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  budget_justification TEXT NOT NULL DEFAULT '',
  faculty_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitter_name TEXT NOT NULL,
  submitter_dept TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Changes Requested', 'Withdrawn', 'Completed')),
  decided_by TEXT NOT NULL DEFAULT '',
  decided_at TIMESTAMPTZ,
  decision_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PERMISSION REQUEST RESOURCES (Classroom, Lab, Auditorium Allocation)
CREATE TABLE IF NOT EXISTS public.permission_request_resources (
  id TEXT PRIMARY KEY,
  permission_request_id TEXT NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  room_no TEXT NOT NULL DEFAULT '',
  owner_dept TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  decided_by TEXT NOT NULL DEFAULT '',
  decided_at TIMESTAMPTZ,
  remark TEXT NOT NULL DEFAULT ''
);

-- 7. BUDGET ITEMS
CREATE TABLE IF NOT EXISTS public.permission_request_budget_items (
  id TEXT PRIMARY KEY,
  permission_request_id TEXT NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0
);

-- 8. PROGRAM OUTCOME (PO) MAPPINGS
CREATE TABLE IF NOT EXISTS public.permission_request_po_mappings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  permission_request_id TEXT NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  po TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  UNIQUE(permission_request_id, po)
);

-- 9. APPROVAL CHAIN STEPS (Submitter -> HOD -> Dean -> Principal)
CREATE TABLE IF NOT EXISTS public.permission_request_approval_steps (
  id TEXT PRIMARY KEY,
  permission_request_id TEXT NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'Pending' CHECK (action IN ('Pending', 'Approved', 'Rejected', 'Changes Requested')),
  acted_at TIMESTAMPTZ,
  remark TEXT NOT NULL DEFAULT ''
);

-- 10. COMMENTS & REVIEW NOTES
CREATE TABLE IF NOT EXISTS public.permission_request_comments (
  id TEXT PRIMARY KEY,
  permission_request_id TEXT NOT NULL REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.permission_request_attachments (
  id TEXT PRIMARY KEY,
  permission_request_id TEXT REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  task_id TEXT,
  name TEXT NOT NULL,
  size_text TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. COMPLETION REPORTS
CREATE TABLE IF NOT EXISTS public.permission_request_completions (
  permission_request_id TEXT PRIMARY KEY REFERENCES public.permission_requests(id) ON DELETE CASCADE,
  done BOOLEAN NOT NULL DEFAULT TRUE,
  actual_date DATE,
  actual_participants TEXT NOT NULL DEFAULT '',
  actual_expenditure TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  photos TEXT[] NOT NULL DEFAULT '{}',
  pos_achieved TEXT[] NOT NULL DEFAULT '{}',
  reason_if_not_done TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  submitted_by TEXT NOT NULL DEFAULT ''
);

-- 13. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by_name TEXT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Overdue', 'Cancelled')),
  extend_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TASK ASSIGNEES
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- 15. TASK UPDATES
CREATE TABLE IF NOT EXISTS public.task_updates (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  status_after TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. ANNOUNCEMENTS (Principal -> Faculty Broadcasts)
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  audience_dept TEXT, -- NULL means all faculty across all departments
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. ANNOUNCEMENT RECEIPTS
CREATE TABLE IF NOT EXISTS public.announcement_receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  announcement_id TEXT NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivered_via TEXT NOT NULL, -- 'email', 'push', 'in_app'
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (announcement_id, user_id, delivered_via)
);

-- 18. PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. RUNNING REFERENCE NUMBER COUNTER
CREATE TABLE IF NOT EXISTS public.ref_counters (
  academic_year TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Atomic ref number increment function
CREATE OR REPLACE FUNCTION public.next_ref_number(p_year TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE v INTEGER;
BEGIN
  INSERT INTO public.ref_counters(academic_year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (academic_year) DO UPDATE SET last_number = public.ref_counters.last_number + 1
  RETURNING last_number INTO v;
  RETURN v;
END;
$$;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

CREATE INDEX IF NOT EXISTS idx_perm_status ON public.permission_requests(status);
CREATE INDEX IF NOT EXISTS idx_perm_year ON public.permission_requests(academic_year);
CREATE INDEX IF NOT EXISTS idx_perm_faculty ON public.permission_requests(faculty_id);
CREATE INDEX IF NOT EXISTS idx_perm_start ON public.permission_requests(start_date);

CREATE INDEX IF NOT EXISTS idx_resources_perm ON public.permission_request_resources(permission_request_id);
CREATE INDEX IF NOT EXISTS idx_steps_perm ON public.permission_request_approval_steps(permission_request_id, step_order);
CREATE INDEX IF NOT EXISTS idx_comments_perm ON public.permission_request_comments(permission_request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON public.announcement_receipts(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pw_reset_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);
