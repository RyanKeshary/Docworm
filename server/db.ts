// Database Connection & Query Utilities
// Uses postgres.js with SSL, connection pooling, and parameterized queries.

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load .env if present
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.qxubecsjbazkhhexgwxo:golumolu1234@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
if (!process.env.DATABASE_URL) {
  console.warn('NOTICE: Using default institutional Supabase database connection pool.');
}

export const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export async function checkDbHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await sql`SELECT 1 as health_check`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function logAudit(
  actorId: string | null,
  actorName: string,
  action: string,
  target: string,
  meta: Record<string, unknown> = {}
) {
  try {
    await sql`
      INSERT INTO public.audit_log (actor_id, actor_name, action, target, meta)
      VALUES (${actorId}, ${actorName}, ${action}, ${target}, ${JSON.stringify(meta)})
    `;
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
