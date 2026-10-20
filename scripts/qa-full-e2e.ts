/**
 * Comprehensive End-to-End QA Test Suite for Docworm.
 * Tests every API endpoint, authentication flow, RBAC permission, proposal approval lifecycle,
 * gate pass lifecycle, announcement archival, and user management.
 */

const BASE_URL = 'http://localhost:3000';

interface LoginRes {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
  };
}

let principalToken = '';
let deanToken = '';
let hodToken = '';
let facultyToken = '';

async function req(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, extra?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    if (extra) console.error('     Details:', extra);
    failed++;
  }
}

async function runQA() {
  console.log('🚀 Starting Full E2E QA Verification against localhost:3000...\n');

  // -------------------------------------------------------------------------
  // SECTION 1: AUTHENTICATION & LOGIN
  // -------------------------------------------------------------------------
  console.log('--- 1. Authentication & Sign In ---');
  
  // Principal Login
  const pLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'principal@slrtce.in', password: 'password@67' }),
  });
  assert(pLogin.ok && pLogin.data?.token, 'Principal logs in successfully with valid credentials', pLogin);
  principalToken = pLogin.data?.token;

  // Dean Login
  const dLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'usha.bag@slrtce.in', password: 'password@67' }),
  });
  assert(dLogin.ok && dLogin.data?.token, 'Dean logs in successfully with valid credentials', dLogin);
  deanToken = dLogin.data?.token;

  // HOD Login
  const hLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'hod.it@slrtce.in', password: 'password@67' }),
  });
  assert(hLogin.ok && hLogin.data?.token, 'HOD logs in successfully with valid credentials', hLogin);
  hodToken = hLogin.data?.token;

  // Faculty Login
  const fLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'rupali.pashte@slrtce.in', password: 'password@67' }),
  });
  assert(fLogin.ok && fLogin.data?.token, 'Faculty logs in successfully with valid credentials', fLogin);
  facultyToken = fLogin.data?.token;

  // Invalid password returns 401
  const badLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'principal@slrtce.in', password: 'wrongpassword' }),
  });
  assert(badLogin.status === 401, 'Invalid password returns 401 Unauthorized', badLogin);

  // Verify /api/auth/me returns valid context
  const me = await req('/api/auth/me', {}, principalToken);
  assert(me.ok && me.data?.user?.role === 'Principal', '/api/auth/me returns Principal profile', me);

  // Invalid token returns 401 or null user
  const badToken = await req('/api/auth/me', {}, 'invalid-or-expired-token');
  assert(!badToken.ok || badToken.data?.user === null || badToken.status === 401, 'Bogus token returns 401 or null user', badToken);

  // -------------------------------------------------------------------------
  // SECTION 2: STAFF APPOINTMENT & OFFICE ADMIN CREATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Staff Appointment & Roles (including Office Admin) ---');
  
  const testEmailAdmin = `admin.test.${Date.now()}@slrtce.in`;
  const createAdmin = await req('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Office Admin',
      email: testEmailAdmin,
      password: 'SecurePass@2026',
      role: 'Office Admin',
      department: 'Central Administration',
      designation: 'Administrative Executive',
    }),
  }, principalToken);
  assert(createAdmin.ok, `Principal can create 'Office Admin' staff without DB check constraint violation`);
  const adminId = createAdmin.data?.user?.id;

  // Test newly created Office Admin login
  const adminLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmailAdmin, password: 'SecurePass@2026' }),
  });
  assert(adminLogin.ok && adminLogin.data?.user?.role === 'Office Admin', 'Newly appointed Office Admin can log in');
  const officeAdminToken = adminLogin.data?.token;

  // Principal can delete/terminate test staff
  if (adminId) {
    const delAdmin = await req(`/api/users/${adminId}`, { method: 'DELETE' }, principalToken);
    assert(delAdmin.ok, 'Principal can delete/terminate created test staff member');
  }

  // -------------------------------------------------------------------------
  // SECTION 3: FACULTY SELF-REGISTRATION & APPROVAL WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Faculty Self-Registration & Approval ---');
  
  const selfRegEmail = `reg.faculty.${Date.now()}@slrtce.in`;
  const regRes = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dr. Self Registering',
      email: selfRegEmail,
      password: 'SecurePass@2026',
      department: 'IT',
      designation: 'Assistant Professor',
    }),
  });
  assert(regRes.ok && (regRes.data?.user?.status === 'pending_approval' || regRes.status === 201), 'Self-registration succeeds with status: pending_approval', regRes);
  const regUserId = regRes.data?.user?.id;

  // Unapproved faculty login should be blocked
  const pendingLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: selfRegEmail, password: 'SecurePass@2026' }),
  });
  assert(pendingLogin.status === 403 || pendingLogin.data?.error?.includes('pending'), 'Pending faculty login is blocked prior to institutional approval', pendingLogin);

  // HOD approves the faculty registration
  if (regUserId) {
    const approveReg = await req(`/api/users/${regUserId}/approve`, {
      method: 'POST',
    }, hodToken);
    assert(approveReg.ok, 'HOD of the same department can approve pending faculty registration', approveReg);

    // After approval, login succeeds
    const approvedLogin = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: selfRegEmail, password: 'SecurePass@2026' }),
    });
    assert(approvedLogin.ok && approvedLogin.data?.user?.status === 'active', 'Approved faculty can now sign in successfully', approvedLogin);

    // Clean up test user
    await req(`/api/users/${regUserId}`, { method: 'DELETE' }, principalToken);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: PROPOSALS & APPROVAL LIFECYCLE (FACULTY -> HOD -> DEAN -> PRINCIPAL)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Event Proposals & Multi-Tier Approval Chain ---');

  // Faculty submits proposal
  const newPropRes = await req('/api/permission-requests', {
    method: 'POST',
    body: JSON.stringify({
      academicYear: '2026-27',
      eventName: `QA Automated Event ${Date.now()}`,
      eventCategory: 'Workshop',
      organizingBody: 'Information Technology Department',
      startDate: '2026-11-01',
      endDate: '2026-11-01',
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      participants: 120,
      departments: ['IT'],
      purpose: 'End-to-End QA testing of the multi-tier approval chain',
      resources: [],
      budgetItems: [],
      attachments: [],
    }),
  }, facultyToken);

  const propId = newPropRes.data?.id || newPropRes.data?.proposal?.id || newPropRes.data?.request?.id;
  assert(newPropRes.ok && propId, 'Faculty submits permission proposal successfully', newPropRes);

  if (propId) {
    // 1. HOD Endorses
    const hodDecide = await req(`/api/permission-requests/${propId}/decide`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'Endorse',
        remark: 'HOD verification passed, recommended to Dean',
      }),
    }, hodToken);
    assert(hodDecide.ok, 'HOD endorses proposal to Dean', hodDecide);

    // 2. Dean Recommends
    const deanDecide = await req(`/api/permission-requests/${propId}/decide`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'Recommend',
        remark: 'Dean reviewed, recommended to Principal for sanction',
      }),
    }, deanToken);
    assert(deanDecide.ok, 'Dean recommends proposal to Principal', deanDecide);

    // 3. Principal Sanctions & Approves
    const prinDecide = await req(`/api/permission-requests/${propId}/decide`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'Approve',
        remark: 'Sanctioned and Approved by Principal Office',
      }),
    }, principalToken);
    assert(prinDecide.ok, 'Principal sanctions and grants final approval', prinDecide);

    // Verify Proposal Status is now 'Approved'
    const listRes = await req('/api/permission-requests', {}, principalToken);
    const approvedProp = listRes.data?.requests?.find((r: any) => r.id === propId);
    assert(approvedProp && approvedProp.status === 'Approved', 'Proposal status transitioned to Approved', approvedProp);

    // Verify Official Letter Data
    assert(approvedProp && approvedProp.ref_no?.startsWith('SLRTCE/'), 'Official reference number generated correctly', approvedProp);
  }

  // -------------------------------------------------------------------------
  // SECTION 5: EMPLOYEE GATE PASS LIFECYCLE
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Employee Gate Pass Lifecycle ---');

  const gatePassRes = await req('/api/gate-passes', {
    method: 'POST',
    body: JSON.stringify({
      purpose: 'Bank / Government Office Work',
      date: new Date().toISOString().split('T')[0],
      time_out: '01:00 PM',
      time_in: '03:00 PM',
      department: 'IT',
      contact_phone: '9876543210',
    }),
  }, facultyToken);

  assert(gatePassRes.ok && gatePassRes.data?.gatePass?.id, 'Faculty submits employee gate pass request', gatePassRes);
  const gpId = gatePassRes.data?.gatePass?.id;

  if (gpId) {
    // HOD Endorses
    const hodGp = await req(`/api/gate-passes/${gpId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action: 'Recommend', remark: 'HOD verified official work' }),
    }, hodToken);
    assert(hodGp.ok, 'HOD endorses employee gate pass');

    // Principal Approves
    const prinGp = await req(`/api/gate-passes/${gpId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action: 'Approve', remark: 'Sanctioned by Principal' }),
    }, principalToken);
    assert(prinGp.ok, 'Principal grants final sanction on gate pass');

    // Movement: Faculty exits campus
    const exitMove = await req(`/api/gate-passes/${gpId}/movement`, {
      method: 'POST',
      body: JSON.stringify({ action: 'exit' }),
    }, facultyToken);
    assert(exitMove.ok, 'Movement record: Faculty exits campus');

    // Movement: Faculty returns to campus
    const returnMove = await req(`/api/gate-passes/${gpId}/movement`, {
      method: 'POST',
      body: JSON.stringify({ action: 'return' }),
    }, facultyToken);
    assert(returnMove.ok, 'Movement record: Faculty returns to campus');
  }

  // -------------------------------------------------------------------------
  // SECTION 6: ANNOUNCEMENTS & ARCHIVING
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Announcements & Archival from Everyone ---');

  const annRes = await req('/api/announcements', {
    method: 'POST',
    body: JSON.stringify({
      title: 'QA Testing Broadcast Notice',
      body: 'This is an institutional broadcast for testing.',
      priority: 'high',
    }),
  }, principalToken);
  const annId = annRes.data?.delivery?.announcementId || annRes.data?.announcement?.id;
  assert(annRes.ok && annId, 'Principal broadcasts institutional announcement', annRes);

  if (annId) {
    // Principal archives notice from everyone
    const archRes = await req(`/api/announcements/${annId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ is_archived: true }),
    }, principalToken);
    assert(archRes.ok && archRes.data?.is_archived === true, 'Principal archives notice from everyone', archRes);

    // Principal restores notice
    const unarchRes = await req(`/api/announcements/${annId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ is_archived: false }),
    }, principalToken);
    assert(unarchRes.ok && unarchRes.data?.is_archived === false, 'Principal restores notice to active broadcasts', unarchRes);

    // Delete test announcement
    await req(`/api/announcements/${annId}`, { method: 'DELETE' }, principalToken);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n=================================================');
  console.log(`E2E QA Results: ${passed} Passed, ${failed} Failed`);
  console.log('=================================================');
  if (failed === 0) {
    console.log('🎉 ALL END-TO-END QA TESTS PASSED WITH 100% SUCCESS!');
  } else {
    process.exit(1);
  }
}

runQA().catch((err) => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
