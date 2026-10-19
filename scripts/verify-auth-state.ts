import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import fs from 'fs';

for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const sql = postgres(process.env.DATABASE_URL!);

async function test() {
  const users = await sql`SELECT id, name, email, role, password_hash, two_factor_enabled, failed_login_attempts, locked_until FROM public.users`;
  let ok = 0;
  for (const u of users) {
    const match = await bcrypt.compare('password@67', u.password_hash);
    if (!match) {
      console.error('Mismatch for', u.email);
    } else {
      ok++;
    }
  }
  console.log(`✅ ${ok} / ${users.length} accounts verified with password@67!`);
  const with2fa = users.filter((u) => u.two_factor_enabled);
  console.log(`Accounts with 2FA enabled: ${with2fa.length}`);
  const locked = users.filter((u) => u.locked_until !== null || u.failed_login_attempts > 0);
  console.log(`Accounts with active lockouts or failed attempts: ${locked.length}`);

  await sql.end();
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
