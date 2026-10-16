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
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const sql = postgres(connectionString);

async function inspectAndClean() {
  console.log('--- Current DB Counts ---');
  const tables = [
    'users',
    'permission_requests',
    'permission_request_resources',
    'permission_request_budget_items',
    'permission_request_po_mappings',
    'permission_request_approval_steps',
    'permission_request_comments',
    'permission_request_attachments',
    'permission_request_completions',
    'tasks',
    'task_assignees',
    'task_updates',
    'announcements',
    'announcement_receipts',
    'audit_log',
    'push_subscriptions',
    'password_reset_tokens',
    'ref_counters'
  ];

  for (const t of tables) {
    try {
      const res = await sql.unsafe(`SELECT count(*) as cnt FROM public.${t}`);
      console.log(`Table ${t}: ${res[0].cnt} rows`);
    } catch (err: any) {
      console.log(`Table ${t}: does not exist or error: ${err.message}`);
    }
  }

  const users = await sql`SELECT id, name, email, role, department_id FROM public.users ORDER BY email`;
  console.log('\n--- Current Users in DB ---');
  for (const u of users) {
    console.log(`- ${u.role}: ${u.name} (${u.email}) [dept: ${u.department_id}]`);
  }

  await sql.end();
}

inspectAndClean();
