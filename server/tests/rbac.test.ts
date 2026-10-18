// Automated Test Suite for RBAC Matrix (Phase 3)
// Verifies each capability across each institutional role (Principal, Dean, HOD, Faculty)
// Run with: npm test

import { can, type AuthUser } from '../rbac';

const principal: AuthUser = {
  id: 'u-prin',
  name: 'Dr. Suresh Ukarande',
  email: 'principal@slrtce.in',
  role: 'Principal',
  department_id: null, // Principal has department_id = NULL
  status: 'active',
};

const dean: AuthUser = {
  id: 'u-dean',
  name: 'Dr. Smita Patil',
  email: 'dean@slrtce.in',
  role: 'Dean',
  department_id: 'dept-has',
  department_code: 'HAS',
  status: 'active',
};

const hodIt: AuthUser = {
  id: 'u-hod-it',
  name: 'Dr. Vinayak Shinde',
  email: 'hod.it@slrtce.in',
  role: 'HOD',
  department_id: 'dept-it',
  department_code: 'IT',
  status: 'active',
};

const facultyIt: AuthUser = {
  id: 'u-fac-it',
  name: 'Prof. Anjali Sharma',
  email: 'prof.sharma@slrtce.in',
  role: 'Faculty',
  department_id: 'dept-it',
  department_code: 'IT',
  status: 'active',
};

const facultyExtc: AuthUser = {
  id: 'u-fac-extc',
  name: 'Prof. Rahul Verma',
  email: 'prof.verma@slrtce.in',
  role: 'Faculty',
  department_id: 'dept-extc',
  department_code: 'EXTC',
  status: 'active',
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

console.log('🧪 Starting RBAC Matrix Automated Verification...\n');

// 1. View all data, all departments
console.log('--- 1. View all data, all departments ---');
assert(can(principal, 'request:view_all') === true, 'Principal can view all data across departments');
assert(can(dean, 'request:view_all') === true, 'Dean can view all data (read-only) across departments');
assert(can(hodIt, 'request:view_all') === false, 'HOD CANNOT view data from other departments');
assert(can(facultyIt, 'request:view_all') === false, 'Faculty CANNOT view all data');

// 2. View all HODs & system data
console.log('\n--- 2. View all HODs & system data ---');
assert(can(principal, 'user:view_all') === true, 'Principal can view all staff');
assert(can(dean, 'user:view_all') === true, 'Dean can view all staff');
assert(can(hodIt, 'user:view_all') === false, 'HOD CANNOT view system-wide staff directory');
assert(can(facultyIt, 'user:view_all') === false, 'Faculty CANNOT view system-wide staff directory');

// 3. View own department data vs cross-department
console.log('\n--- 3. Department Data Scoping ---');
const itRequest = { id: 'req-it', submitter_dept: 'IT', faculty_id: facultyIt.id };
const extcRequest = { id: 'req-extc', submitter_dept: 'EXTC', faculty_id: 'other' };

assert(can(hodIt, 'request:view_dept', itRequest) === true, 'HOD can view IT department requests');
assert(can(hodIt, 'request:view_dept', extcRequest) === false, 'HOD CANNOT view EXTC requests (cross-department blocked)');
assert(can(facultyIt, 'request:view_dept', itRequest) === false, 'Faculty cannot view general department requests (own only)');
assert(can(facultyIt, 'request:view_own', itRequest) === true, 'Faculty CAN view own request');

// 4. Approve / deny / revert pending permission requests
console.log('\n--- 4. Final Sanction / Decision Authority ---');
assert(can(principal, 'request:decide_principal') === true, 'Principal can approve, deny, or revert pending requests');
assert(can(dean, 'request:decide_principal') === false, 'Dean CANNOT approve/deny/revert pending requests (403)');
assert(can(hodIt, 'request:decide_principal') === false, 'HOD CANNOT make final principal sanction (403)');
assert(can(facultyIt, 'request:decide_principal') === false, 'Faculty CANNOT approve requests (403)');

// HOD endorse in chain
assert(can(hodIt, 'request:endorse_hod', itRequest) === true, 'HOD can endorse IT requests in chain');
assert(can(hodIt, 'request:endorse_hod', extcRequest) === false, 'HOD cannot endorse non-department requests');

// 5. Add / edit / remove / terminate staff
console.log('\n--- 5. Staff Management & Termination ---');
assert(can(principal, 'user:create') === true, 'Principal can add staff');
assert(can(principal, 'user:delete') === true, 'Principal can remove/terminate staff');
assert(can(dean, 'user:create') === false, 'Dean CANNOT add staff (403)');
assert(can(dean, 'user:delete') === false, 'Dean CANNOT remove staff (403)');
assert(can(hodIt, 'user:create') === false, 'HOD CANNOT add staff (403)');
assert(can(hodIt, 'user:delete') === false, 'HOD CANNOT remove staff (403)');
assert(can(facultyIt, 'user:create') === false, 'Faculty CANNOT add staff (403)');
assert(can(facultyIt, 'user:delete') === false, 'Faculty CANNOT remove staff (403)');

// 6. Edit own profile vs OTHER staff profiles
console.log('\n--- 6. Profile Editing Scoping ---');
assert(can(principal, 'user:edit_own', principal) === true, 'Principal can edit own profile');
assert(can(dean, 'user:edit_own', dean) === true, 'Dean can edit own profile');
assert(can(hodIt, 'user:edit_own', hodIt) === true, 'HOD can edit own profile');
assert(can(facultyIt, 'user:edit_own', facultyIt) === true, 'Faculty can edit own profile');

assert(can(principal, 'user:edit_other', facultyIt) === true, 'Principal CAN edit other staff profiles');
assert(can(dean, 'user:edit_other', facultyIt) === false, 'Dean CANNOT edit other staff profiles (403)');
assert(can(hodIt, 'user:edit_other', facultyIt) === false, 'HOD CANNOT edit other staff profiles (403)');
assert(can(facultyIt, 'user:edit_other', hodIt) === false, 'Faculty CANNOT edit other staff profiles (403)');

// 7. Submit permission requests
console.log('\n--- 7. Permission Request Submission ---');
assert(can(facultyIt, 'request:create') === true, 'Faculty CAN submit permission requests');
assert(can(hodIt, 'request:create') === true, 'HOD CAN submit own permission requests');
assert(can(dean, 'request:create') === false, 'Dean CANNOT submit event requests (recommending authority)');

// 8. Broadcast / Announcements
console.log('\n--- 8. Announcements & Broadcasts ---');
assert(can(principal, 'announcement:create') === true, 'Principal CAN send announcements/broadcasts');
assert(can(dean, 'announcement:create') === false, 'Dean CANNOT send broadcasts (403)');
assert(can(hodIt, 'announcement:create') === false, 'HOD CANNOT send broadcasts (403)');
assert(can(facultyIt, 'announcement:create') === false, 'Faculty CANNOT send broadcasts (403)');

// 9. Settings & Admin Tools (Phase 6)
console.log('\n--- 9. Settings & Admin Tools ---');
assert(can(principal, 'admin:sql_editor') === true, 'Principal CAN use SQL Editor');
assert(can(principal, 'admin:table_editor_write') === true, 'Principal CAN write in Table Editor');
assert(can(principal, 'admin:academic_options_write') === true, 'Principal CAN edit Academic Options');
assert(can(dean, 'admin:sql_editor') === false, 'Dean CANNOT access SQL Editor (403)');
assert(can(dean, 'admin:table_editor_write') === false, 'Dean CANNOT write in Table Editor (403)');
assert(can(dean, 'admin:view_read_only') === true, 'Dean CAN view audit logs / analytics read-only');
assert(can(hodIt, 'admin:table_editor_read') === false, 'HOD CANNOT view Table Editor (403)');
// 10. Faculty Leaves
console.log('\n--- 10. Faculty Leaves RBAC ---');
const itLeave = { id: 'leave-1', faculty_id: facultyIt.id, department: 'IT', department_code: 'IT', status: 'Pending' };
const extcLeave = { id: 'leave-2', faculty_id: 'other', department: 'EXTC', department_code: 'EXTC', status: 'Pending' };

assert(can(facultyIt, 'leave:create') === true, 'Faculty CAN apply for leave');
assert(can(facultyIt, 'leave:view_own', itLeave) === true, 'Faculty CAN view own leave');
assert(can(facultyIt, 'leave:cancel_own', itLeave) === true, 'Faculty CAN cancel pending leave');
assert(can(facultyIt, 'leave:view_all') === false, 'Faculty CANNOT view all leaves');

assert(can(hodIt, 'leave:view_dept', itLeave) === true, 'HOD CAN view department faculty leave');
assert(can(hodIt, 'leave:view_dept', extcLeave) === false, 'HOD CANNOT view other department faculty leave');
assert(can(hodIt, 'leave:endorse_hod', itLeave) === true, 'HOD CAN recommend department faculty leave');
assert(can(hodIt, 'leave:endorse_hod', extcLeave) === false, 'HOD CANNOT recommend other department faculty leave');
assert(can(hodIt, 'leave:decide_principal') === false, 'HOD CANNOT grant final principal sanction (403)');

assert(can(principal, 'leave:view_all') === true, 'Principal CAN view all leaves');
assert(can(principal, 'leave:decide_principal') === true, 'Principal CAN grant final sanction for leaves');
assert(can(dean, 'leave:view_all') === true, 'Dean CAN view all leaves (read-only oversight)');
assert(can(dean, 'leave:decide_principal') === false, 'Dean CANNOT grant final sanction for leaves (403)');

// 10b. Employee Gate Passes RBAC
console.log('\n--- 10b. Employee Gate Passes RBAC ---');
const itPass = { id: 'pass-1', employee_id: facultyIt.id, department: 'IT', department_code: 'IT', status: 'Pending' };
const extcPass = { id: 'pass-2', employee_id: 'other', department: 'EXTC', department_code: 'EXTC', status: 'Pending' };

assert(can(facultyIt, 'gatepass:create') === true, 'Faculty CAN request gate pass');
assert(can(facultyIt, 'gatepass:view_own', itPass) === true, 'Faculty CAN view own gate pass');
assert(can(facultyIt, 'gatepass:cancel_own', itPass) === true, 'Faculty CAN cancel pending gate pass');
assert(can(facultyIt, 'gatepass:view_all') === false, 'Faculty CANNOT view all gate passes');

assert(can(hodIt, 'gatepass:view_dept', itPass) === true, 'HOD CAN view department gate pass');
assert(can(hodIt, 'gatepass:view_dept', extcPass) === false, 'HOD CANNOT view other department gate pass');
assert(can(hodIt, 'gatepass:endorse_hod', itPass) === true, 'HOD CAN recommend department gate pass');
assert(can(hodIt, 'gatepass:endorse_hod', extcPass) === false, 'HOD CANNOT recommend other department gate pass');
assert(can(hodIt, 'gatepass:decide_principal') === false, 'HOD CANNOT grant final principal sanction for gate pass (403)');

assert(can(principal, 'gatepass:view_all') === true, 'Principal CAN view all gate passes');
assert(can(principal, 'gatepass:decide_principal') === true, 'Principal CAN grant final sanction for gate pass');
assert(can(dean, 'gatepass:view_all') === true, 'Dean CAN view all gate passes (read-only oversight)');
assert(can(dean, 'gatepass:decide_principal') === false, 'Dean CANNOT grant final sanction for gate pass (403)');

// 11. Hierarchical User Creation RBAC
console.log('\n--- 11. Hierarchical User Creation ---');
assert(can(principal, 'user:create', { role: 'Dean' }) === true, 'Principal CAN add Dean');
assert(can(principal, 'user:create', { role: 'HOD' }) === true, 'Principal CAN add HOD');
assert(can(principal, 'user:create', { role: 'Faculty' }) === true, 'Principal CAN add Faculty');
assert(can(principal, 'user:create', { role: 'Office Admin' }) === true, 'Principal CAN add Office Admin');

assert(can(dean, 'user:create', { role: 'HOD' }) === true, 'Dean CAN add HOD');
assert(can(dean, 'user:create', { role: 'Faculty' }) === true, 'Dean CAN add Faculty');
assert(can(dean, 'user:create', { role: 'Office Admin' }) === true, 'Dean CAN add Office Admin');
assert(can(dean, 'user:create', { role: 'Dean' }) === false, 'Dean CANNOT add Dean');
assert(can(dean, 'user:create', { role: 'Principal' }) === false, 'Dean CANNOT add Principal');

assert(can(hodIt, 'user:create', { role: 'Faculty' }) === true, 'HOD CAN add Faculty');
assert(can(hodIt, 'user:create', { role: 'HOD' }) === false, 'HOD CANNOT add HOD');
assert(can(hodIt, 'user:create', { role: 'Dean' }) === false, 'HOD CANNOT add Dean');
assert(can(hodIt, 'user:create', { role: 'Principal' }) === false, 'HOD CANNOT add Principal');

assert(can(facultyIt, 'user:create', { role: 'Faculty' }) === false, 'Faculty CANNOT add Faculty');
assert(can(facultyIt, 'user:create', { role: 'HOD' }) === false, 'Faculty CANNOT add HOD');

// 12. Faculty Registration Approvals (HOD, Dean, Principal)
console.log('\n--- 12. Faculty Registration Approvals ---');
assert(can(principal, 'user:approve_registration', facultyIt) === true, 'Principal CAN approve any faculty registration');
assert(can(dean, 'user:approve_registration', facultyIt) === true, 'Dean CAN approve faculty registrations');
assert(can(hodIt, 'user:approve_registration', facultyIt) === true, 'HOD CAN approve IT department faculty registration');
assert(can(hodIt, 'user:approve_registration', facultyExtc) === false, 'HOD CANNOT approve other department faculty registration');
assert(can(facultyIt, 'user:approve_registration', facultyIt) === false, 'Faculty CANNOT approve registrations (403)');

console.log(`\n=================================================`);
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`=================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All RBAC tests passed successfully!');
  process.exit(0);
}
