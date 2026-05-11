/**
 * Canonical Supabase client surface for API routes.
 *
 * This module replaces the five legacy entry points that grew up over time:
 *   - lib/auth-helpers.js          → getAuthUser, getAuthContext
 *   - lib/supabase-server.js       → createServerSupabase
 *   - lib/supabase-service-role.js → createServerSupabaseClient, isServerSupabaseConfigured
 *   - lib/supabase/server.js       → getServerSupabase, getAuthUser
 *   - lib/plaid.js                 → supabaseAdmin
 *
 * It exposes three primitives — `getAdminClient`, `getUserClient`,
 * `requireUser` — and re-exports the legacy names so existing imports
 * keep working during the gradual migration.
 *
 * Usage in a route:
 *
 *   import { requireUser, getAdminClient } from '@/lib/supabase';
 *
 *   export async function GET(request) {
 *     const { user, client } = await requireUser(request);
 *     // user-scoped query with RLS:
 *     const { data } = await client.from('foo').select('*');
 *     // service-role query (bypasses RLS):
 *     const admin = getAdminClient();
 *     ...
 *   }
 */

import { getServerSupabase as _getServerSupabase } from './server';
import { createServerSupabase as _createServerSupabase } from '../supabase-server';
import { getAuthContext as _getAuthContext, getAuthUser as _getAuthUser } from '../auth-helpers';

/**
 * Returns the singleton service-role Supabase client (bypasses RLS).
 * Throws if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.
 */
export function getAdminClient() {
  return _getServerSupabase();
}

/**
 * Returns a cookie-scoped Supabase client bound to the current request's
 * auth context. Use for user-scoped CRUD where RLS enforces ownership.
 */
export function getUserClient() {
  return _createServerSupabase();
}

/**
 * Authenticate the request via bearer token or cookie session. Returns
 * `{ user, client }` where `client` is bound to that user's JWT.
 * Throws `Error('Unauthorized')` if the request is not authenticated —
 * callers should let this bubble to a 401 handler or catch it explicitly.
 */
export async function requireUser(request) {
  const { user, supabase } = await _getAuthContext(request);
  if (!user || !supabase) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return { user, client: supabase };
}

/**
 * Lower-level helper for handlers that only need the user id (and will
 * talk to the DB via getAdminClient). Returns the Supabase auth user or
 * null — does NOT throw on missing auth.
 */
export async function getCurrentUser(request) {
  return _getAuthUser(request);
}

// Re-export the legacy entry points so existing imports keep working.
export { _getServerSupabase as getServerSupabase };
export { _getAuthUser as getAuthUser };
