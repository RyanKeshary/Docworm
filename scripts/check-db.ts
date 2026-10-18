import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

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

  const reqs = await sql`SELECT id, ref_no, event_name, status, submitter_name FROM public.permission_requests`;
  console.log('\n--- Permission Requests ---', JSON.stringify(reqs, null, 2));

  const steps = await sql`SELECT id, permission_request_id, step_order, role, action, remark FROM public.permission_request_approval_steps ORDER BY step_order`;
  console.log('\n--- Approval Steps ---', JSON.stringify(steps, null, 2));

  const cons = await sql`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
  `;
  console.log('\n--- Constraints on public.users ---', JSON.stringify(cons, null, 2));

  await sql.end();
}

inspectAndClean();
