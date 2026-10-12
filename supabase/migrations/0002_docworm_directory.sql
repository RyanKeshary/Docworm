-- Docworm 0012: staff directory must be readable by all authenticated staff
-- so assignee names, HOD lists, and reviewer pickers resolve for every role.
-- Phone and email stay limited to what the app displays; RLS still blocks anon.

DROP POLICY IF EXISTS "profiles self read" ON public.docworm_profiles;
CREATE POLICY "profiles directory read" ON public.docworm_profiles
  FOR SELECT TO authenticated USING (TRUE);
