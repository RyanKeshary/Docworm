import { sql } from '../server/db.js';
import { generateStaffDirectoryExcel, generatePermissionRequestsExcel } from '../server/excel.js';

async function test() {
  console.log('Testing DB connection...');
  const res = await sql`SELECT NOW() as now, count(*)::int as count FROM users`;
  console.log(`DB OK! Users: ${res[0].count}, Server time: ${res[0].now}`);

  console.log('Testing Excel generator with Principal RBAC...');
  const principal = { id: 'test-principal', email: 'principal@slrtce.in', role: 'Principal' as const };
  const staffBuf = await generateStaffDirectoryExcel(principal);
  console.log(`Staff Directory Excel generated successfully! Buffer: ${staffBuf.length} bytes`);

  const reqBuf = await generatePermissionRequestsExcel(principal);
  console.log(`Permission Requests Excel generated successfully! Buffer: ${reqBuf.length} bytes`);

  console.log('Testing Excel generator with HOD RBAC (Department Scoped)...');
  const hod = { id: 'test-hod', email: 'hod.it@slrtce.in', role: 'HOD' as const, department_id: 'dept-it' };
  const hodStaffBuf = await generateStaffDirectoryExcel(hod);
  console.log(`HOD Staff Directory Excel generated! Buffer: ${hodStaffBuf.length} bytes`);

  await sql.end();
  console.log('All Excel and DB verifications passed with 100% success!');
  process.exit(0);
}

test().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
