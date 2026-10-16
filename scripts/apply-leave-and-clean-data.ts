import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const sql = postgres(connectionString);

async function run() {
  console.log('🚀 Running 0007_faculty_leaves migration...');
  const migrationPath = path.join(root, 'supabase', 'migrations', '0007_faculty_leaves.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await sql.unsafe(migrationSql);
  console.log('✅ Faculty leaves table created successfully.');

  console.log('🧹 Purging all dummy proposals, tasks, announcements, and mock data...');

  // 1. Clear permission requests and cascade children
  await sql`TRUNCATE TABLE public.permission_requests CASCADE`;
  console.log('✅ Cleared public.permission_requests and child tables (resources, budgets, approval steps, completions, etc.)');

  // 2. Clear announcements & receipts
  await sql`TRUNCATE TABLE public.announcements CASCADE`;
  console.log('✅ Cleared public.announcements and receipts');

  // 3. Clear tasks
  await sql`TRUNCATE TABLE public.tasks CASCADE`;
  console.log('✅ Cleared public.tasks and task updates/assignees');

  // 4. Clear faculty leaves (clean state)
  await sql`TRUNCATE TABLE public.faculty_leaves CASCADE`;
  console.log('✅ Cleared public.faculty_leaves (clean start)');

  // 5. Clear audit log
  await sql`TRUNCATE TABLE public.audit_log CASCADE`;
  console.log('✅ Cleared public.audit_log');

  // 6. Reset reference counters
  await sql`TRUNCATE TABLE public.ref_counters CASCADE`;
  console.log('✅ Reset ref_counters');

  // 7. Verify users
  const users = await sql`SELECT id, name, email, role, department_id, status FROM public.users ORDER BY role`;
  console.log(`\n👥 Preserved System Users (${users.length}):`);
  for (const u of users) {
    console.log(`- ${u.role}: ${u.name} (${u.email}) [dept: ${u.department_id}]`);
  }

  console.log('\n🎉 ALL DUMMY DATA CLEARED & LEAVE SYSTEM MIGRATION APPLIED!');
  await sql.end();
}

run().catch((err) => {
  console.error('❌ Error applying migration and data clean:', err);
  process.exit(1);
});
