// Applies docworm/supabase/migrations to the Docworm Supabase project.
// Usage from docworm/:  node scripts/apply-migrations.mjs
// Env: DATABASE_URL (or PGHOST/PGUSER/etc). Reads docworm/.env if present.
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

for (const envFile of [path.join(root, '.env')]) {
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  console.error('Missing DATABASE_URL. Set it in docworm/.env (Supabase dashboard, Project Settings, Database).');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require', max: 1 });

async function run() {
  console.log('Connecting to database...');
  try {
    const res = await sql`SELECT NOW()`;
    console.log('Connected! Server time:', res[0].now);

    const migrationsDir = path.join(root, 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error('No migrations directory found:', migrationsDir);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    console.log(`Found ${files.length} migration files.`);

    await sql`
      CREATE TABLE IF NOT EXISTS public._migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const existing = await sql`SELECT name FROM public._migrations WHERE name = ${file}`;
      if (existing.length > 0 && !process.argv.includes('--force')) {
        console.log(`  [SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(`  [APPLYING] ${file}...`);
      const content = fs.readFileSync(filePath, 'utf-8');
      await sql.unsafe(content);
      await sql`
        INSERT INTO public._migrations (name, applied_at)
        VALUES (${file}, NOW())
        ON CONFLICT (name) DO UPDATE SET applied_at = NOW()
      `;
      console.log(`  [DONE] ${file}`);
    }

    console.log('All migrations applied successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
