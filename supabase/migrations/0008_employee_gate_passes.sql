-- ====================================================================
-- Docworm Migration (0008): Employee Gate Passes Management
-- Exact Format & Workflow: Employee Request -> HOD Endorsement -> Principal Sanction
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.employee_gate_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  department TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT NOT NULL,
  time_out TEXT NOT NULL,
  time_in TEXT NOT NULL,
  contact_phone TEXT NOT NULL DEFAULT '',
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

CREATE INDEX IF NOT EXISTS idx_gate_passes_employee ON public.employee_gate_passes(employee_id);
CREATE INDEX IF NOT EXISTS idx_gate_passes_dept ON public.employee_gate_passes(department);
CREATE INDEX IF NOT EXISTS idx_gate_passes_status ON public.employee_gate_passes(status);
CREATE INDEX IF NOT EXISTS idx_gate_passes_date ON public.employee_gate_passes(date);
CREATE INDEX IF NOT EXISTS idx_gate_passes_created ON public.employee_gate_passes(created_at DESC);
