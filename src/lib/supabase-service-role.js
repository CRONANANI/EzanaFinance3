/**
 * Server-only Supabase client with service role (bypasses RLS).
 * Do NOT import from client components — use `@/lib/supabase` (browser) there.
 */
import { createClient } from '@supabase/supabase-js';

/**
 * @returns {boolean} True when the service-role client can be created (both URL + key are set).
 * Use this in API routes to return a 503 with a clear JSON body instead of an opaque PostgREST error.
 */
export function isServerSupabaseConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url || !serviceRoleKey) {
    console.error(
      'createServerSupabaseClient: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing'
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
