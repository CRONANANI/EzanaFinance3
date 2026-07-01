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
// In-memory, self-releasing serialization lock.
//
// Why not the default navigator Web Locks lock: it was being acquired and NOT
// released across our full-page (window.location.assign) auth redirects, which
// deadlocked mfa.verify()/getUser() → login hung forever on "Verifying…".
//
// Why not a no-op lock (lock: (_n,_t,fn)=>fn()): with zero serialization, a
// background autoRefreshToken can run concurrently with mfa.challenge()/verify(),
// racing over the session and stalling the verify → "Verification timed out."
//
// This promise-chain lock serializes auth calls within the tab (fixing the race)
// but ALWAYS releases when each call settles (fixing the deadlock). It is
// functionally what Supabase's own processLock does, implemented inline so it
// doesn't depend on a specific export path.
let lockChain = Promise.resolve();
const processLock = (_name, _acquireTimeout, fn) => {
  const run = lockChain.then(() => fn());
  // Keep the chain alive regardless of success/failure, without leaking rejections.
  lockChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: { flowType: 'pkce', lock: processLock },
});

export function createClient() {
  return supabase;
}
