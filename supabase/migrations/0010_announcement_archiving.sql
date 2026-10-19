-- ====================================================================
-- Docworm Migration: 0010_announcement_archiving.sql
-- Enables archiving institutional notices/announcements globally.
-- ====================================================================

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_archived ON public.announcements(is_archived);
