// Seeds the live Supabase backend for Docworm using direct SQL.
// Run from docworm/:  npx tsx scripts/seed-supabase.ts
// Env in docworm/.env: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY.
// Re-runnable: existing rows are updated, nothing is duplicated.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { SEED_AUDIT, SEED_COMMENTS, SEED_NOTIFICATIONS, SEED_PROPOSALS, SEED_TASKS, SEED_USERS } from '../src/seed';
import { DEFAULT_OPTIONS } from '../src/config';

function loadEnv(): void {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, '..', '.env'),
    path.join(here, '..', '..', '.env'),
  ];
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const CS = process.env.DATABASE_URL || '';
if (!CS) { console.error('Missing DATABASE_URL.'); process.exit(1); }
const sql = postgres(CS, { ssl: 'require', max: 1 });
const PASSWORD = 'docworm123';
const idMap = new Map<string, string>();

async function ensureIdentity(id: string, email: string): Promise<void> {
  const has = await sql`SELECT 1 FROM auth.identities WHERE user_id = ${id} AND provider = 'email'`;
  if (!has.length) {
    await sql`
      INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), ${id}, ${id}, ${JSON.stringify({ sub: id, email })}, 'email', NOW(), NOW(), NOW())
      ON CONFLICT (provider, provider_id) DO NOTHING`;
  }
}

async function ensureAuthUser(email: string, name: string): Promise<string> {
  const existing = await sql`SELECT id FROM auth.users WHERE lower(email) = ${email.toLowerCase()}`;
  if (existing.length) {
    await sql`UPDATE auth.users SET encrypted_password = crypt(${PASSWORD}, gen_salt('bf', 10)), email_confirmed_at = COALESCE(email_confirmed_at, NOW()), updated_at = NOW() WHERE id = ${existing[0].id}`;
    await ensureIdentity(existing[0].id as string, email);
    return existing[0].id as string;
  }
  // Create via the public signup API: rows created by GoTrue itself log in
  // reliably, while hand-inserted auth rows hit a GoTrue 500 on this project.
  // New projects rate limit signups, so retry with backoff.
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  let lastErr = '';
  for (const wait of [2000, 8000, 20000, 45000, 90000]) {
    const r = await fetch(`${base}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD, data: { name } }),
    });
    const text = await r.text();
    if (r.ok) {
      await new Promise((res) => setTimeout(res, 2000));
      return (JSON.parse(text).user.id as string);
    }
    lastErr = `${r.status} ${text.slice(0, 160)}`;
    console.log(`  signup ${email} hit ${r.status}, waiting ${wait / 1000}s...`);
    await new Promise((res) => setTimeout(res, wait));
    const again = await sql`SELECT id FROM auth.users WHERE lower(email) = ${email.toLowerCase()}`;
    if (again.length) return again[0].id as string;
  }
  throw new Error(`signup ${email} failed: ${lastErr}`);
}

async function main() {
  console.log('Creating auth users and profiles...');
  for (const u of SEED_USERS) {
    const id = await ensureAuthUser(u.email, u.name);
    idMap.set(u.id, id);
    await sql`
      INSERT INTO public.docworm_profiles (id, email, name, designation, department, phone, role, must_change_password)
      VALUES (${id}, ${u.email}, ${u.name}, ${u.designation}, ${u.department}, ${u.phone}, ${u.role}, TRUE)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, designation = EXCLUDED.designation, department = EXCLUDED.department, phone = EXCLUDED.phone, role = EXCLUDED.role`;
    console.log(`  ${u.role} ${u.email}`);
  }
  const mapId = (old: string) => idMap.get(old) ?? null;

  console.log('Seeding proposals...');
  for (const p of SEED_PROPOSALS) {
    await sql`
      INSERT INTO public.docworm_proposals (id, ref_no, academic_year, date_of_request, event_name, event_category, organizing_body, start_date, end_date, start_time, end_time, purpose, audience, departments, years, participants, has_budget, budget_head, opening_balance, budget_justification, submitter_id, submitter_name, submitter_dept, status, updated_at)
      VALUES (${p.id}, ${p.refNo}, ${p.academicYear}, ${p.dateOfRequest}, ${p.eventName}, ${p.eventCategory}, ${p.organizingBody}, ${p.startDate}, ${p.endDate}, ${p.startTime}, ${p.endTime}, ${p.purpose}, ${p.audience}, ${p.departments}, ${p.years}, ${p.participants}, ${p.hasBudget}, ${p.budgetHead}, ${p.openingBalance}, ${p.budgetJustification}, ${mapId(p.submitterId)}, ${p.submitterName}, ${p.submitterDept}, ${p.status}, NOW())
      ON CONFLICT (id) DO UPDATE SET ref_no = EXCLUDED.ref_no, status = EXCLUDED.status, updated_at = NOW()`;
    await sql`DELETE FROM public.docworm_resources WHERE proposal_id = ${p.id}`;
    await sql`DELETE FROM public.docworm_budget_items WHERE proposal_id = ${p.id}`;
    await sql`DELETE FROM public.docworm_po_mappings WHERE proposal_id = ${p.id}`;
    await sql`DELETE FROM public.docworm_approval_steps WHERE proposal_id = ${p.id}`;
    for (const r of p.resources) {
      await sql`INSERT INTO public.docworm_resources (id, proposal_id, resource_type, room_no, owner_dept, date, start_time, end_time, status, decided_by, decided_at, remark) VALUES (${r.id}, ${p.id}, ${r.resourceType}, ${r.roomNo}, ${r.ownerDept}, ${r.date}, ${r.startTime}, ${r.endTime}, ${r.status}, ${r.decidedBy ?? ''}, ${r.decidedAt ?? ''}, ${r.remark ?? ''}) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, decided_by = EXCLUDED.decided_by, decided_at = EXCLUDED.decided_at, remark = EXCLUDED.remark`;
    }
    for (const b of p.budgetItems) {
      await sql`INSERT INTO public.docworm_budget_items (id, proposal_id, item, category, quantity, unit_cost) VALUES (${b.id}, ${p.id}, ${b.item}, ${b.category}, ${b.quantity}, ${b.unitCost}) ON CONFLICT (id) DO UPDATE SET item = EXCLUDED.item, category = EXCLUDED.category, quantity = EXCLUDED.quantity, unit_cost = EXCLUDED.unit_cost`;
    }
    for (const m of p.poMappings) {
      await sql`INSERT INTO public.docworm_po_mappings (proposal_id, po, explanation) VALUES (${p.id}, ${m.po}, ${m.explanation}) ON CONFLICT (proposal_id, po) DO UPDATE SET explanation = EXCLUDED.explanation`;
    }
    let order = 0;
    for (const s of p.approvalChain) {
      await sql`INSERT INTO public.docworm_approval_steps (id, proposal_id, step_order, role, user_id, user_name, action, acted_at, remark) VALUES (${s.id}, ${p.id}, ${order++}, ${s.role}, ${mapId(s.userId)}, ${s.userName}, ${s.action}, ${s.actedAt ?? ''}, ${s.remark ?? ''}) ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, acted_at = EXCLUDED.acted_at, remark = EXCLUDED.remark, user_id = EXCLUDED.user_id, user_name = EXCLUDED.user_name`;
    }
    console.log(`  ${p.refNo}`);
  }

  console.log('Seeding tasks...');
  for (const t of SEED_TASKS) {
    await sql`
      INSERT INTO public.docworm_tasks (id, title, description, task_type, priority, assigned_by, assigned_by_name, assigned_date, due_date, completion_date, status, extend_reason)
      VALUES (${t.id}, ${t.title}, ${t.description}, ${t.taskType}, ${t.priority}, ${mapId(t.assignedBy)}, ${t.assignedByName}, ${t.assignedDate}, ${t.dueDate}, ${t.completionDate ?? null}, ${t.status}, ${t.extendReason ?? ''})
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, due_date = EXCLUDED.due_date, completion_date = EXCLUDED.completion_date`;
    await sql`DELETE FROM public.docworm_task_assignees WHERE task_id = ${t.id}`;
    for (const a of t.assignedTo) {
      const uid = mapId(a);
      if (uid) await sql`INSERT INTO public.docworm_task_assignees (task_id, user_id) VALUES (${t.id}, ${uid}) ON CONFLICT DO NOTHING`;
    }
    for (const u of t.updates) {
      await sql`INSERT INTO public.docworm_task_updates (id, task_id, text, user_id, user_name, status_after) VALUES (${u.id}, ${t.id}, ${u.text}, ${mapId(u.userId)}, ${u.userName}, ${u.statusAfter ?? ''}) ON CONFLICT (id) DO NOTHING`;
    }
  }

  console.log('Seeding comments, notifications, audit, settings...');
  for (const c of SEED_COMMENTS) {
    await sql`INSERT INTO public.docworm_comments (id, proposal_id, user_id, user_name, text) VALUES (${c.id}, ${c.proposalId}, ${mapId(c.userId)}, ${c.userName}, ${c.text}) ON CONFLICT (id) DO NOTHING`;
  }
  for (const n of SEED_NOTIFICATIONS) {
    const uid = mapId(n.userId);
    if (uid) await sql`INSERT INTO public.docworm_notifications (id, user_id, title, body, link, read) VALUES (${n.id}, ${uid}, ${n.title}, ${n.body}, ${n.link}, ${n.read}) ON CONFLICT (id) DO NOTHING`;
  }
  for (const a of SEED_AUDIT) {
    await sql`INSERT INTO public.docworm_audit_logs (id, actor_id, actor_name, action, entity, entity_id) VALUES (${a.id}, ${mapId(a.actorId)}, ${a.actorName}, ${a.action}, ${a.entity}, ${a.entityId}) ON CONFLICT (id) DO NOTHING`;
  }
  await sql`
    INSERT INTO public.docworm_settings (id, options, letterhead, updated_at)
    VALUES (1, ${JSON.stringify(DEFAULT_OPTIONS)}, ${JSON.stringify({ collegeName: 'Shree L.R. Tiwari College of Engineering', address: 'Shree L.R. Tiwari College of Engineering, Mira Road (East), Thane 401107', phone: '+91 22 2812 1234', email: 'office@slrtce.in' })}, NOW())
    ON CONFLICT (id) DO UPDATE SET options = EXCLUDED.options, letterhead = EXCLUDED.letterhead, updated_at = NOW()`;
  await sql`
    INSERT INTO public.docworm_ref_counters (academic_year, last_number)
    VALUES ('2026-27', 8)
    ON CONFLICT (academic_year) DO UPDATE SET last_number = GREATEST(public.docworm_ref_counters.last_number, 8)`;

  await sql.end();
  console.log('Done. All demo passwords are docworm123 (must change on first login).');
}

main().catch(async (e) => {
  console.error('Seed failed:', e.message ?? e, '| table:', (e as Record<string, unknown>).table_name ?? (e as Record<string, unknown>).table, '| schema:', (e as Record<string, unknown>).schema_name ?? (e as Record<string, unknown>).schema, '| code:', (e as Record<string, unknown>).code);
  try { await sql.end(); } catch { /* noop */ } process.exit(1);
});
