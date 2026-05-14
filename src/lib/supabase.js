/**
 * Browser-only Supabase client — PKCE / OAuth code verifier is stored in cookies.
 *
 * This file MUST stay separate from server-only helpers. Importing `createBrowserClient`
 * from the same module as `createServerSupabaseClient` caused Node/API routes to evaluate
 * `createBrowserClient` without `window`, producing broken storage and
 * "PKCE code verifier not found in storage" on the real client.
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)',
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
}

/** Shared singleton — same instance as OAuth start and /auth/callback exchange. */
export const supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Transitional server facade exports.
 *
 * Why this exists:
 * - Historically `@/lib/supabase` was the browser client module (this file).
 * - Phase 2 introduced a server facade at `src/lib/supabase/index.js`.
 * - In production bundling, imports like `@/lib/supabase` can resolve here first
 *   (file) instead of `src/lib/supabase/index.js` (directory index), which caused
 *   "Attempted import error: getAdminClient/requireUser/getUserClient..." failures.
 *
 * These lazy wrappers keep legacy browser imports working while exposing the new
 * server APIs from the same specifier until import paths are fully disentangled.
 */
function loadServerModule(path) {
  if (typeof window !== 'undefined') {
    throw new Error(`Server-only Supabase helper used in browser: ${path}`);
  }
  // Intentionally lazy to avoid pulling server-only modules into client bundle.
  // eslint-disable-next-line no-eval
  const req = eval('require');
  return req(path);
}

export function getAdminClient() {
  const { getServerSupabase } = loadServerModule('./supabase/server');
  return getServerSupabase();
}

export function getUserClient() {
  const { createServerSupabase } = loadServerModule('./supabase-server');
  return createServerSupabase();
}

export async function requireUser(request) {
  const { getAuthContext } = loadServerModule('./auth-helpers');
  const { user, supabase: client } = await getAuthContext(request);
  if (!user || !client) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return { user, client };
}

export async function getCurrentUser(request) {
  const { getAuthUser } = loadServerModule('./auth-helpers');
  return getAuthUser(request);
}

export function getServerSupabase() {
  const { getServerSupabase: fn } = loadServerModule('./supabase/server');
  return fn();
}

export async function getAuthUser(request) {
  const { getAuthUser: fn } = loadServerModule('./auth-helpers');
  return fn(request);
}
