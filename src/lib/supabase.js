import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)'
  );
}

/**
 * Browser OAuth / PKCE — MUST use `createBrowserClient` from `@supabase/ssr` so the
 * code verifier lives in cookies. `@supabase/supabase-js` `createClient` uses
 * localStorage; the callback then cannot find the verifier → "PKCE code verifier not found".
 */
export function createClient() {
  return createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
}

/** Singleton for components that `import { supabase } from '@/lib/supabase'`. */
export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Server-only: service role (bypasses RLS). Not for browser / OAuth.
 */
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set!');
  }

  return createSupabaseJsClient(
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
