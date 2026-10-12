// Recreates one SQL-created auth user via the GoTrue signup API (proven working),
// then re-points all Docworm rows to the new ID. Run: npx tsx scripts/fix-auth.ts
import fs from 'fs';
import postgres from 'postgres';
import { SEED_COMMENTS, SEED_NOTIFICATIONS, SEED_PROPOSALS, SEED_TASKS, SEED_USERS, SEED_AUDIT } from '../src/seed';

for (const line of fs.readFileSync('../.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = postgres(process.env.DATABASE_URL || '', { ssl: 'require', max: 1 });
const ANON = 'sb_publishable_QMmz5ZNtmwnZssxC6KnH1g_zoRZ6FIr';
const BASE = 'https://oqqzzyombtcjvlqbjvla.supabase.co';

async function api(path: string, body: unknown) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
}

const TARGETS = SEED_USERS.map((u) => u.id);

async function fixOne(oldSeedId: string): Promise<void> {
  const seedUser = SEED_USERS.find((u) => u.id === oldSeedId)!;
  const old = await sql`SELECT id FROM auth.users WHERE lower(email) = ${seedUser.email.toLowerCase()}`;
  const oldId = old[0]?.id as string | undefined;
  console.log(`${seedUser.email}: old id ${oldId ?? '(none)'}`);
  if (oldId) {
    await sql`DELETE FROM auth.users WHERE id = ${oldId}`;
  }
  const created = await api('/auth/v1/signup', {
    email: seedUser.email, password: 'docworm123', data: { name: seedUser.name },
  });
  const newId = created.user.id as string;
  await sql`
    INSERT INTO public.docworm_profiles (id, email, name, designation, department, phone, role, must_change_password)
    VALUES (${newId}, ${seedUser.email}, ${seedUser.name}, ${seedUser.designation}, ${seedUser.department}, ${seedUser.phone}, ${seedUser.role}, TRUE)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role`;
  for (const p of SEED_PROPOSALS.filter((x) => x.submitterId === oldSeedId)) {
    await sql`UPDATE public.docworm_proposals SET submitter_id = ${newId} WHERE id = ${p.id}`;
  }
  for (const p of SEED_PROPOSALS) {
    for (const s of p.approvalChain.filter((x) => x.userId === oldSeedId)) {
      await sql`UPDATE public.docworm_approval_steps SET user_id = ${newId} WHERE id = ${s.id}`;
    }
  }
  for (const c of SEED_COMMENTS.filter((x) => x.userId === oldSeedId)) {
    await sql`UPDATE public.docworm_comments SET user_id = ${newId} WHERE id = ${c.id}`;
  }
  for (const n of SEED_NOTIFICATIONS.filter((x) => x.userId === oldSeedId)) {
    await sql`UPDATE public.docworm_notifications SET user_id = ${newId} WHERE id = ${n.id}`;
  }
  for (const a of SEED_AUDIT.filter((x) => x.actorId === oldSeedId)) {
    await sql`UPDATE public.docworm_audit_logs SET actor_id = ${newId} WHERE id = ${a.id}`;
  }
  for (const t of SEED_TASKS) {
    if (t.assignedTo.includes(oldSeedId)) {
      await sql`INSERT INTO public.docworm_task_assignees (task_id, user_id) VALUES (${t.id}, ${newId}) ON CONFLICT DO NOTHING`;
    }
    if (t.assignedBy === oldSeedId) {
      await sql`UPDATE public.docworm_tasks SET assigned_by = ${newId} WHERE id = ${t.id}`;
    }
    for (const u of t.updates.filter((x) => x.userId === oldSeedId)) {
      await sql`UPDATE public.docworm_task_updates SET user_id = ${newId} WHERE id = ${u.id}`;
    }
  }
  console.log(`  recreated as ${newId}`);
}

async function main() {
  for (const id of TARGETS) {
    if (id === 'u-hod-it') { console.log('hod.it already fixed, skipping'); continue; }
    await fixOne(id);
  }
  // Remove probe accounts created during debugging.
  await sql`DELETE FROM auth.users WHERE email IN ('docworm.probe@slrtce.in', 'test.docworm.probe@slrtce.in')`;
  await sql`DELETE FROM public.profiles WHERE email IN ('docworm.probe@slrtce.in', 'test.docworm.probe@slrtce.in')`;
  console.log('probe accounts removed');
  await sql.end();
}

main().catch(async (e) => { console.error('FAILED:', (e as Error).message); try { await sql.end(); } catch { /* noop */ } process.exit(1); });
