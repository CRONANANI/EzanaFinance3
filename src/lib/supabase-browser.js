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
import { processLock } from '@supabase/auth-js';

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
// Auth lock: use Supabase's OWN in-memory `processLock`. This is the lock done
// right — the successor to a chain of failed attempts:
//   • default navigator Web Locks → acquired-but-not-released across our
//     full-page (window.location.assign) redirects → deadlock, login hung
//     forever on "Verifying…".
//   • no-op lock → zero serialization → autoRefreshToken raced verify().
//   • naive inline promise-chain → serialized correctly, but had NO escape
//     valve: if ONE fn() hung (e.g. GoTrue's post-verify internal work), the
//     chain never advanced and every later call — including verify() — queued
//     behind it until the 12s wrapper fired ("Verification timed out").
// Supabase's processLock is an in-memory, per-name chain that HONORS the
// acquireTimeout: a waiter that can't get its turn within the timeout proceeds
// (throws ProcessLockAcquireTimeoutError) rather than wedging forever, so a
// hung link can't strand later calls. It is NOT the navigator lock.
export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: { flowType: 'pkce', lock: processLock },
});

export function createClient() {
  return supabase;
}
