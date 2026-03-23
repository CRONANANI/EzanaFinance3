/**
 * Server-only Supabase client with service role (bypasses RLS).
 * Do NOT import from client components — use `@/lib/supabase` (browser) there.
 */
import { createClient } from '@supabase/supabase-js';

export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set!');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
