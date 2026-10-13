-- Docworm 0005: realtime publication for live updates.
-- The app subscribes to these tables so dashboards, lists, approvals,
-- tasks, comments, and notifications update without a page refresh.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.docworm_proposals,
  public.docworm_resources,
  public.docworm_approval_steps,
  public.docworm_comments,
  public.docworm_tasks,
  public.docworm_task_updates,
  public.docworm_task_assignees,
  public.docworm_notifications,
  public.docworm_completion_reports;
