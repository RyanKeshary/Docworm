import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) : undefined);
const anon = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) : undefined);

export const isSupabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!url || !anon) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  if (!client) {
    client = createClient(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'docworm-auth' },
    });
  }
  return client;
}
