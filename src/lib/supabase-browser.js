/**
 * Browser-only Supabase client — PKCE / OAuth code verifier is stored in cookies.
 *
 * This file MUST stay separate from server-only helpers. Importing `createBrowserClient`
 * from the same module as `createServerSupabaseClient` caused Node/API routes to evaluate
 * `createBrowserClient` without `window`, producing broken storage and
 * "PKCE code verifier not found in storage" on the real client.
 *
 * Renamed from `src/lib/supabase.js` to disambiguate from the `src/lib/supabase/`
 * server facade directory (Node module resolution picks the file before the
 * directory, which broke every server-side `import { ... } from '@/lib/supabase'`).
 * Server callers import from `'@/lib/supabase'` (resolves to `supabase/index.js`);
 * browser callers import from `'@/lib/supabase-browser'`.
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)',
  );
}

// Single shared browser client. Creating more than one GoTrueClient on the
// same storage key makes Supabase's Web Locks auth lock deadlock, which hangs
// signInWithPassword()/getUser() indefinitely (the login button gets stuck on
// "Signing in…") — and the held lock survives client-side navigation, so it
// also wedges every later sign-in in the same tab. The factory therefore
// returns the one shared instance instead of constructing a new client.
//
// No-op auth lock: bypass the navigator Web Locks API entirely. The default
// navigator lock can be acquired-but-not-released across our full-page
// (window.location.assign) auth redirects — e.g. during MFA — deadlocking
// mfa.verify()/getUser() so login hangs on "Verifying…". Running the callback
// without a lock is safe because we use the single shared client instance
// above: there is no multi-instance race for the lock to guard.
const noopLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: { flowType: 'pkce', lock: noopLock },
});

export function createClient() {
  return supabase;
}
