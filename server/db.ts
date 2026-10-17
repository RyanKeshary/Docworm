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

let connectionString = process.env.DATABASE_URL || 'postgresql://postgres.qxubecsjbazkhhexgwxo:golumolu1234@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
if (!process.env.DATABASE_URL) {
  console.warn('NOTICE: Using default institutional Supabase database connection pool.');
}

// In serverless environments (Vercel) connecting to Supabase pooler, ensure transaction mode (port 6543)
if (process.env.VERCEL && connectionString.includes('pooler.supabase.com:5432')) {
  connectionString = connectionString.replace(':5432', ':6543');
}

export const sql = postgres(connectionString, {
  prepare: false, // Mandatory for Supabase transaction pooler & serverless execution
  ssl: { rejectUnauthorized: false },
  max: process.env.VERCEL ? 3 : 10,
  idle_timeout: 20,
  connect_timeout: 25,
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
