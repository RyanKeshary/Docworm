import bcrypt from 'bcryptjs';
import { sql } from '../server/db.js';

async function updatePasswords() {
  const defaultPassword = 'password@67';
  const hash = await bcrypt.hash(defaultPassword, 10);
  console.log(`Hashing '${defaultPassword}' -> ${hash.slice(0, 25)}...`);

  const updated = await sql`
    UPDATE public.users
    SET password_hash = ${hash},
        must_change_password = FALSE,
        status = 'active'
    RETURNING id, name, email, role, department_id, status;
  `;

  console.log(`Successfully updated ${updated.length} users with default password '${defaultPassword}':`);
  for (const u of updated) {
    console.log(` - [${u.role}] ${u.name} (${u.email})`);
  }

  await sql.end();
}

updatePasswords().catch((err) => {
  console.error('Error updating passwords:', err);
  process.exit(1);
});
