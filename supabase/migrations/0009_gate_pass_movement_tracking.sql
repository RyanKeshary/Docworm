-- ====================================================================
-- Docworm Migration (0009): Dynamic Faculty Presence & Gate Pass Tracking
-- Adds movement tracking (inside, outside, returned) and exit/return timestamps
-- ====================================================================

ALTER TABLE public.employee_gate_passes
ADD COLUMN IF NOT EXISTS movement_status TEXT NOT NULL DEFAULT 'inside'
  CHECK (movement_status IN ('inside', 'outside', 'returned')),
ADD COLUMN IF NOT EXISTS actual_exit_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_return_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gate_passes_movement ON public.employee_gate_passes(movement_status);
