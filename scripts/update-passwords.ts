import bcrypt from 'bcryptjs';
import { sql } from '../server/db.js';

async function updatePasswords() {
  const defaultPassword = 'password@67';
  const hash = await bcrypt.hash(defaultPassword, 10);
  console.log(`Hashing '${defaultPassword}' -> ${hash.slice(0, 25)}...`);

  // Clear any existing 2FA OTP codes
  try {
    await sql`DELETE FROM public.auth_otp_codes`;
    console.log('Cleared pending auth_otp_codes.');
  } catch (e: any) {
    console.log('auth_otp_codes table note:', e.message);
  }

  const updated = await sql`
    UPDATE public.users
    SET password_hash = ${hash},
        two_factor_enabled = FALSE,
        two_factor_secret = NULL,
        two_factor_backup_codes = '{}',
        failed_login_attempts = 0,
        locked_until = NULL,
        must_change_password = FALSE,
        status = 'active'
    RETURNING id, name, email, role, department_id, status, two_factor_enabled;
  `;

  console.log(`Successfully updated ${updated.length} users with password '${defaultPassword}' and 2FA disabled:`);
  for (const u of updated) {
    console.log(` - [${u.role}] ${u.name} (${u.email}) | 2FA: ${u.two_factor_enabled}`);
  }

  await sql.end();
}

updatePasswords().catch((err) => {
  console.error('Error updating passwords:', err);
  process.exit(1);
});
