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

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function login(email: string, password = 'password@67'): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${await res.text()}`);
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) throw new Error(`No cookie returned for ${email}`);
  const match = setCookie.match(/docworm_session=([^;]+)/);
  if (!match) throw new Error(`No docworm_session found in cookie: ${setCookie}`);
  return match[1];
}

async function runTest() {
  console.log('🧪 Testing Full Faculty Leave End-to-End Workflow...');

  // 1. Faculty Login
  console.log('1. Logging in as Faculty (rupali.pashte@slrtce.in)...');
  const facultyToken = await login('rupali.pashte@slrtce.in');
  console.log('  ✅ Faculty authenticated.');

  // 2. Faculty submits Leave Application
  console.log('2. Submitting Faculty Leave application...');
  const leaveRes = await fetch(`${BASE_URL}/api/leaves`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `docworm_session=${facultyToken}`,
    },
    body: JSON.stringify({
      leave_type: 'Casual Leave',
      start_date: '2026-10-20',
      end_date: '2026-10-21',
      total_days: 2,
      is_half_day: false,
      half_day_session: 'Full Day',
      reason: 'Attending National Education Policy symposium in Mumbai',
      alternate_faculty: 'Prof. Rahul Patil',
      lecture_adjustments: 'BE IT Cloud Computing taken by Prof. Patil (10-11 AM)',
      contact_phone: '+91 98765 43210',
    }),
  });

  if (!leaveRes.ok) throw new Error(`Leave submission failed: ${await leaveRes.text()}`);
  const leaveData = await leaveRes.json();
  const leaveId = leaveData.leave?.id;
  const refNo = leaveData.leave?.ref_no;
  if (!leaveId) throw new Error(`Leave creation failed to return leave ID: ${JSON.stringify(leaveData)}`);
  console.log(`  ✅ Leave application created: ${refNo} (Status: ${leaveData.leave.status})`);

  // Validate that DATABASE_URL targets the same database environment as BASE_URL before proceeding
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required to run and clean up the leave workflow test.');
  }
  const preCheckSql = postgres(process.env.DATABASE_URL);
  const foundLeave = await preCheckSql`SELECT id FROM public.faculty_leaves WHERE id = ${leaveId}`;
  await preCheckSql.end();
  if (foundLeave.length === 0) {
    throw new Error(
      `DATABASE_URL does not match the database environment of BASE_URL (${BASE_URL}). Newly created leave ${leaveId} was not found in DATABASE_URL.`
    );
  }

  // 3. HOD Login & Recommendation
  console.log('3. Logging in as HOD (hod.it@slrtce.in)...');
  const hodToken = await login('hod.it@slrtce.in');
  console.log('  ✅ HOD authenticated.');

  console.log('4. HOD Recommending leave to Principal...');
  const hodDecisionRes = await fetch(`${BASE_URL}/api/leaves/${leaveId}/decide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `docworm_session=${hodToken}`,
    },
    body: JSON.stringify({
      action: 'Recommend',
      remark: 'All lecture substitutions verified with Prof. Patil. Recommended for sanction.',
    }),
  });

  if (!hodDecisionRes.ok) throw new Error(`HOD recommendation failed: ${await hodDecisionRes.text()}`);
  const hodDecisionData = await hodDecisionRes.json();
  console.log(`  ✅ Leave status updated by HOD: ${hodDecisionData.leave.status} (HOD Remark: "${hodDecisionData.leave.hod_remark}")`);

  // 5. Principal Login & Final Sanction
  console.log('5. Logging in as Principal (principal@slrtce.in)...');
  const principalToken = await login('principal@slrtce.in');
  console.log('  ✅ Principal authenticated.');

  console.log('6. Principal Approving & Sanctioning leave...');
  const principalDecisionRes = await fetch(`${BASE_URL}/api/leaves/${leaveId}/decide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `docworm_session=${principalToken}`,
    },
    body: JSON.stringify({
      action: 'Approve',
      remark: 'Sanctioned as Casual Leave (2 Days).',
    }),
  });

  if (!principalDecisionRes.ok) throw new Error(`Principal sanction failed: ${await principalDecisionRes.text()}`);
  const principalDecisionData = await principalDecisionRes.json();
  console.log(`  ✅ Leave final status: ${principalDecisionData.leave.status} (Principal Sanction: "${principalDecisionData.leave.principal_remark}")`);

  // 7. Clean up the test leave row & verify record was deleted
  const sql = postgres(process.env.DATABASE_URL);
  const deleted = await sql`DELETE FROM public.faculty_leaves WHERE id = ${leaveId} RETURNING id`;
  await sql.end();
  if (deleted.length === 0) {
    throw new Error(`Failed to clean up test leave ${leaveId}: record was not found or already deleted in DATABASE_URL.`);
  }
  console.log('7. 🧹 Database cleaned (test leave removed).');

  console.log('🎉 ALL LEAVE WORKFLOW TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Leave workflow test failed:', err);
  process.exit(1);
});
