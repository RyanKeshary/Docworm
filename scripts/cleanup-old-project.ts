// ONE TIME cleanup: removes all Docworm data from the OLD shared Supabase project.
// Leaves every fest table, user, and file untouched.
// Run:  OLD_DATABASE_URL="postgresql://..." npx tsx scripts/cleanup-old-project.ts
// Refuses to run without OLD_DATABASE_URL explicitly set, so it can never hit the new project.
import postgres from 'postgres';

const CS = process.env.OLD_DATABASE_URL || '';
if (!CS) {
  console.error('Set OLD_DATABASE_URL explicitly. Refusing to run without it.');
  process.exit(1);
}
const sql = postgres(CS, { ssl: 'require', max: 1 });

const STAFF = [
  'principal@slrtce.in', 'dean.swdc@slrtce.in', 'hod.it@slrtce.in',
  'hod.extc@slrtce.in', 'hod.ecs@slrtce.in', 'hod.has@slrtce.in',
  'hod.cmpn@slrtce.in', 'hod.mech@slrtce.in', 'hod.civil@slrtce.in',
  'p.salvi@slrtce.in', 't.mhatre@slrtce.in', 'l.fernandes@slrtce.in',
  'docworm.probe@slrtce.in', 'test.docworm.probe@slrtce.in',
];

async function main() {
  console.log('Removing Docworm storage bucket (objects if any)...');
  try {
    const objs = await sql`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = 'docworm-attachments'`;
    console.log('  objects in bucket:', objs[0].n);
    if (objs[0].n === 0) {
      await sql`DELETE FROM storage.buckets WHERE id = 'docworm-attachments'`;
      console.log('  bucket deleted');
    } else {
      console.log('  SKIPPED: bucket has files, direct deletes are blocked. Delete them in dashboard, Storage, docworm-attachments.');
    }
  } catch (e) {
    console.log('  SKIPPED storage cleanup (blocked):', (e as Error).message);
  }
  await sql`DROP POLICY IF EXISTS "docworm upload" ON storage.objects`;
  await sql`DROP POLICY IF EXISTS "docworm read" ON storage.objects`;
  await sql`DROP POLICY IF EXISTS "docworm delete" ON storage.objects`;

  console.log('Dropping Docworm tables...');
  await sql`DROP TABLE IF EXISTS
    public.docworm_task_updates, public.docworm_task_assignees, public.docworm_tasks,
    public.docworm_completion_reports, public.docworm_attachments, public.docworm_comments,
    public.docworm_approval_steps, public.docworm_po_mappings, public.docworm_budget_items,
    public.docworm_resources, public.docworm_proposals, public.docworm_profiles,
    public.docworm_notifications, public.docworm_audit_logs, public.docworm_settings,
    public.docworm_ref_counters CASCADE`;

  console.log('Dropping Docworm functions...');
  await sql`DROP FUNCTION IF EXISTS public.docworm_next_ref_number(TEXT)`;
  await sql`DROP FUNCTION IF EXISTS public.docworm_my_role()`;

  console.log('Clearing Docworm migration records...');
  await sql`DELETE FROM public._migrations WHERE name IN ('0011_docworm_schema.sql','0012_docworm_directory.sql','0013_docworm_options.sql','0014_docworm_no_iic.sql')`;

  console.log('Deleting Docworm auth users and their auto-created fest profiles...');
  for (const email of STAFF) {
    await sql`DELETE FROM public.profiles WHERE lower(email) = ${email.toLowerCase()}`;
    await sql`DELETE FROM auth.users WHERE lower(email) = ${email.toLowerCase()}`;
    console.log(`  removed ${email}`);
  }

  const left = await sql`SELECT count(*)::int AS n FROM auth.users WHERE email LIKE '%slrtce.in'`;
  console.log('Remaining slrtce.in auth users (fest):', left[0].n);
  await sql.end();
  console.log('Old project cleanup complete. Fest data untouched.');
}

main().catch(async (e) => { console.error('Cleanup failed:', (e as Error).message); try { await sql.end(); } catch { /* noop */ } process.exit(1); });
