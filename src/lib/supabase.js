import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
}

/**
 * Browser client — MUST use @supabase/ssr createBrowserClient for OAuth PKCE.
 * The generic createClient() stores the code verifier in localStorage, while the
 * server callback reads cookies → exchange fails or missing ?code= behavior.
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');

// Server-side client with service role (BYPASSES RLS)
export const createServerSupabaseClient = () => {
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
};
