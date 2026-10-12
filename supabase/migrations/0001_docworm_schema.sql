-- Docworm schema (0011). All tables prefixed docworm_ to coexist with the fest app.
-- Run with: node scripts/apply-migrations.mjs (uses DATABASE_URL, service role bypasses RLS).

-- Profiles: one row per auth user, role drives the whole app. Never trust client role.
CREATE TABLE IF NOT EXISTS public.docworm_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT 'HAS',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'Faculty' CHECK (role IN ('Principal','Dean','HOD','Faculty')),
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic running number per academic year for ref numbers (prevents race on concurrent submit).
CREATE TABLE IF NOT EXISTS public.docworm_ref_counters (
  academic_year TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.docworm_next_ref_number(p_year TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v INTEGER;
BEGIN
  INSERT INTO public.docworm_ref_counters(academic_year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (academic_year) DO UPDATE SET last_number = public.docworm_ref_counters.last_number + 1
  RETURNING last_number INTO v;
  RETURN v;
END;
$$;

-- Proposals (parent row; children in tables below).
CREATE TABLE IF NOT EXISTS public.docworm_proposals (
  id TEXT PRIMARY KEY,
  ref_no TEXT NOT NULL UNIQUE,
  academic_year TEXT NOT NULL,
  date_of_request DATE NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  organizing_body TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  audience TEXT[] NOT NULL DEFAULT '{}',
  departments TEXT[] NOT NULL DEFAULT '{}',
  years TEXT[] NOT NULL DEFAULT '{}',
  participants INTEGER NOT NULL DEFAULT 0,
  has_budget BOOLEAN NOT NULL DEFAULT FALSE,
  budget_head TEXT NOT NULL DEFAULT '',
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  budget_justification TEXT NOT NULL DEFAULT '',
  submitter_id UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  submitter_name TEXT NOT NULL DEFAULT '',
  submitter_dept TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Submitted','Under Review','Approved','Rejected','Changes Requested','Withdrawn','Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_resources (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  room_no TEXT NOT NULL DEFAULT '',
  owner_dept TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  decided_by TEXT NOT NULL DEFAULT '',
  decided_at TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.docworm_budget_items (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
  item TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.docworm_po_mappings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
  po TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  UNIQUE (proposal_id, po)
);

CREATE TABLE IF NOT EXISTS public.docworm_approval_steps (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL,
  user_id UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'Pending' CHECK (action IN ('Pending','Approved','Rejected','Changes Requested')),
  acted_at TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.docworm_comments (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_attachments (
  id TEXT PRIMARY KEY,
  proposal_id TEXT REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
  task_id TEXT,
  name TEXT NOT NULL,
  size_text TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_completion_reports (
  proposal_id TEXT PRIMARY KEY REFERENCES public.docworm_proposals(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.docworm_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  assigned_by UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  assigned_by_name TEXT NOT NULL DEFAULT '',
  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'Not Started'
    CHECK (status IN ('Not Started','In Progress','Completed','Overdue','Cancelled')),
  extend_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_task_assignees (
  task_id TEXT NOT NULL REFERENCES public.docworm_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.docworm_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.docworm_task_updates (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES public.docworm_tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  user_id UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  status_after TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.docworm_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id UUID REFERENCES public.docworm_profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.docworm_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  options JSONB NOT NULL DEFAULT '{}',
  letterhead JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the hot filters (department, status, date, assignee).
CREATE INDEX IF NOT EXISTS docworm_proposals_status_idx ON public.docworm_proposals(status);
CREATE INDEX IF NOT EXISTS docworm_proposals_year_idx ON public.docworm_proposals(academic_year);
CREATE INDEX IF NOT EXISTS docworm_proposals_start_idx ON public.docworm_proposals(start_date);
CREATE INDEX IF NOT EXISTS docworm_proposals_depts_idx ON public.docworm_proposals USING GIN (departments);
CREATE INDEX IF NOT EXISTS docworm_proposals_submitter_idx ON public.docworm_proposals(submitter_id);
CREATE INDEX IF NOT EXISTS docworm_resources_owner_idx ON public.docworm_resources(owner_dept, status);
CREATE INDEX IF NOT EXISTS docworm_resources_proposal_idx ON public.docworm_resources(proposal_id);
CREATE INDEX IF NOT EXISTS docworm_steps_user_idx ON public.docworm_approval_steps(user_id, action);
CREATE INDEX IF NOT EXISTS docworm_comments_proposal_idx ON public.docworm_comments(proposal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS docworm_tasks_status_idx ON public.docworm_tasks(status);
CREATE INDEX IF NOT EXISTS docworm_tasks_due_idx ON public.docworm_tasks(due_date);
CREATE INDEX IF NOT EXISTS docworm_assignees_user_idx ON public.docworm_task_assignees(user_id);
CREATE INDEX IF NOT EXISTS docworm_notifications_user_idx ON public.docworm_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS docworm_audit_entity_idx ON public.docworm_audit_logs(entity_id, created_at DESC);

-- Storage bucket for attachments and report photos.
INSERT INTO storage.buckets (id, name, public)
VALUES ('docworm-attachments', 'docworm-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security. Service role bypasses all of this (used by seed script and edge functions).
ALTER TABLE public.docworm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_completion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docworm_settings ENABLE ROW LEVEL SECURITY;

-- Helper: current user's role from JWT-linked profile.
CREATE OR REPLACE FUNCTION public.docworm_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT role FROM public.docworm_profiles WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS "profiles self read" ON public.docworm_profiles;
CREATE POLICY "profiles self read" ON public.docworm_profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.docworm_my_role() = 'Principal');

DROP POLICY IF EXISTS "profiles principal write" ON public.docworm_profiles;
CREATE POLICY "profiles principal write" ON public.docworm_profiles
  FOR ALL TO authenticated USING (public.docworm_my_role() = 'Principal') WITH CHECK (public.docworm_my_role() = 'Principal');

DROP POLICY IF EXISTS "proposals read" ON public.docworm_proposals;
CREATE POLICY "proposals read" ON public.docworm_proposals
  FOR SELECT TO authenticated USING (
    public.docworm_my_role() = 'Principal'
    OR submitter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "proposals insert" ON public.docworm_proposals;
CREATE POLICY "proposals insert" ON public.docworm_proposals
  FOR INSERT TO authenticated WITH CHECK (submitter_id = auth.uid());

DROP POLICY IF EXISTS "proposals update" ON public.docworm_proposals;
CREATE POLICY "proposals update" ON public.docworm_proposals
  FOR UPDATE TO authenticated USING (
    public.docworm_my_role() = 'Principal'
    OR submitter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = docworm_proposals.id AND s.user_id = auth.uid())
  );

-- Child tables inherit proposal visibility: readable when parent proposal is readable.
DROP POLICY IF EXISTS "resources read" ON public.docworm_resources;
CREATE POLICY "resources read" ON public.docworm_resources
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
      AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = p.id AND s.user_id = auth.uid())))
  );

DROP POLICY IF EXISTS "resources write" ON public.docworm_resources;
CREATE POLICY "resources write" ON public.docworm_resources
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
      AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
      AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
  );

-- HOD room decisions and principal can update any resource row.
DROP POLICY IF EXISTS "resources decide" ON public.docworm_resources;
CREATE POLICY "resources decide" ON public.docworm_resources
  FOR UPDATE TO authenticated USING (
    public.docworm_my_role() = 'Principal'
    OR EXISTS (SELECT 1 FROM public.docworm_profiles pr WHERE pr.id = auth.uid() AND pr.department = docworm_resources.owner_dept)
  );

-- Child rows inherit the parent proposal's visibility. Approval steps stay
-- broadly readable on purpose: the proposals policy itself queries the steps
-- table, so scoping steps by proposal would recurse.
DROP POLICY IF EXISTS "children read" ON public.docworm_budget_items;
CREATE POLICY "children read" ON public.docworm_budget_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = p.id AND s.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "children write" ON public.docworm_budget_items;
CREATE POLICY "children write" ON public.docworm_budget_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
);

DROP POLICY IF EXISTS "po read" ON public.docworm_po_mappings;
CREATE POLICY "po read" ON public.docworm_po_mappings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = p.id AND s.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "po write" ON public.docworm_po_mappings;
CREATE POLICY "po write" ON public.docworm_po_mappings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
);

DROP POLICY IF EXISTS "steps read" ON public.docworm_approval_steps;
CREATE POLICY "steps read" ON public.docworm_approval_steps FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "steps write" ON public.docworm_approval_steps;
CREATE POLICY "steps write" ON public.docworm_approval_steps FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "comments read" ON public.docworm_comments;
CREATE POLICY "comments read" ON public.docworm_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = p.id AND s.user_id = auth.uid())))
);
DROP POLICY IF EXISTS "comments insert" ON public.docworm_comments;
CREATE POLICY "comments insert" ON public.docworm_comments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = p.id AND s.user_id = auth.uid())))
);

DROP POLICY IF EXISTS "attachments read" ON public.docworm_attachments;
CREATE POLICY "attachments read" ON public.docworm_attachments FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "attachments write" ON public.docworm_attachments;
CREATE POLICY "attachments write" ON public.docworm_attachments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "reports all" ON public.docworm_completion_reports;
CREATE POLICY "reports all" ON public.docworm_completion_reports FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.docworm_approval_steps s WHERE s.proposal_id = p.id AND s.user_id = auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.docworm_proposals p WHERE p.id = proposal_id
    AND (public.docworm_my_role() = 'Principal' OR p.submitter_id = auth.uid()))
);

DROP POLICY IF EXISTS "tasks read" ON public.docworm_tasks;
CREATE POLICY "tasks read" ON public.docworm_tasks FOR SELECT TO authenticated USING (
  public.docworm_my_role() = 'Principal' OR assigned_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.docworm_task_assignees a WHERE a.task_id = id AND a.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tasks principal write" ON public.docworm_tasks;
CREATE POLICY "tasks principal write" ON public.docworm_tasks FOR ALL TO authenticated
  USING (public.docworm_my_role() = 'Principal' OR assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.docworm_task_assignees a WHERE a.task_id = docworm_tasks.id AND a.user_id = auth.uid()))
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "assignees all" ON public.docworm_task_assignees;
CREATE POLICY "assignees all" ON public.docworm_task_assignees FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "task updates all" ON public.docworm_task_updates;
CREATE POLICY "task updates all" ON public.docworm_task_updates FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "notifications own" ON public.docworm_notifications;
CREATE POLICY "notifications own" ON public.docworm_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications insert" ON public.docworm_notifications;
CREATE POLICY "notifications insert" ON public.docworm_notifications FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "notifications own update" ON public.docworm_notifications;
CREATE POLICY "notifications own update" ON public.docworm_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "audit read" ON public.docworm_audit_logs;
CREATE POLICY "audit read" ON public.docworm_audit_logs FOR SELECT TO authenticated USING (public.docworm_my_role() = 'Principal' OR actor_id = auth.uid());
DROP POLICY IF EXISTS "audit insert" ON public.docworm_audit_logs;
CREATE POLICY "audit insert" ON public.docworm_audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS "settings read" ON public.docworm_settings;
CREATE POLICY "settings read" ON public.docworm_settings FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "settings principal write" ON public.docworm_settings;
CREATE POLICY "settings principal write" ON public.docworm_settings FOR ALL TO authenticated
  USING (public.docworm_my_role() = 'Principal') WITH CHECK (public.docworm_my_role() = 'Principal');

-- Storage policies: authenticated users can upload and read their college files.
DROP POLICY IF EXISTS "docworm upload" ON storage.objects;
CREATE POLICY "docworm upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'docworm-attachments');
DROP POLICY IF EXISTS "docworm read" ON storage.objects;
CREATE POLICY "docworm read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'docworm-attachments');
DROP POLICY IF EXISTS "docworm delete" ON storage.objects;
CREATE POLICY "docworm delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'docworm-attachments');
