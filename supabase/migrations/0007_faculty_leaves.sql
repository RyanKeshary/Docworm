-- ====================================================================
-- Docworm Migration (0007): Faculty Leaves Management
-- Full workflow: Faculty application -> HOD recommendation -> Principal approval
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.faculty_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no TEXT NOT NULL UNIQUE,
  faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  department TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(4,1) NOT NULL DEFAULT 1,
  is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
  half_day_session TEXT NOT NULL DEFAULT 'Full Day',
  reason TEXT NOT NULL,
  alternate_faculty TEXT NOT NULL DEFAULT '',
  lecture_adjustments TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  attachment_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Recommended', 'Approved', 'Rejected', 'Cancelled')),
  hod_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  hod_name TEXT NOT NULL DEFAULT '',
  hod_remark TEXT NOT NULL DEFAULT '',
  hod_acted_at TIMESTAMPTZ,
  principal_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  principal_name TEXT NOT NULL DEFAULT '',
  principal_remark TEXT NOT NULL DEFAULT '',
  principal_acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_faculty ON public.faculty_leaves(faculty_id);
CREATE INDEX IF NOT EXISTS idx_leaves_dept ON public.faculty_leaves(department);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.faculty_leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_start ON public.faculty_leaves(start_date);
CREATE INDEX IF NOT EXISTS idx_leaves_created ON public.faculty_leaves(created_at DESC);
