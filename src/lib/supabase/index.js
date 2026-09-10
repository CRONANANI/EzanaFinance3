/**
 * Canonical Supabase client surface for API routes.
 *
 * This module replaced the five legacy entry points that grew up over time
 * (auth-helpers.js, supabase-server.js, supabase-service-role.js,
 * plaid.js's supabaseAdmin export). Those modules are gone; every server-side
 * consumer imports from '@/lib/supabase'.
 *
 * The surface is three primitives plus two compatibility helpers:
 *
 *   getAdminClient()      — singleton service-role client (bypasses RLS)
 *   getUserClient()       — cookie-scoped client for the current request
 *   requireUser(request)  — authenticate or throw 401; returns { user, client }
 *   getCurrentUser(req)   — user or null, never throws (alias: getAuthUser)
 *   getAuthContext(req)   — { user, supabase } or { null, null }, never throws
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

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerSupabase as _getServerSupabase } from './server';

/**
 * True when the service-role client can be created (URL + service key set).
 * Use in API routes to return a clear 503 instead of an opaque error when
 * the deployment is missing configuration.
 */
export function isServerSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Returns the singleton service-role Supabase client (bypasses RLS).
 * Throws if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing.
 */
export function getAdminClient() {
  return _getServerSupabase();
}

/**
 * Returns a cookie-scoped Supabase client bound to the current request's
 * auth context (App Router API routes / server components). Use for
 * user-scoped CRUD where RLS enforces ownership.
 */
export function getUserClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              /* ignore — read-only context (e.g. server component render) */
            }
          });
        },
      },
    },
  );
}

// ── request-scoped auth helpers ────────────────────────────────────────────

function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  return null;
}

function buildBearerClient(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function buildCookieClient(request) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    },
  );
}

/**
 * Return `{ user, supabase }` where `supabase` is a Supabase client bound to
 * the caller's auth context (bearer token first, then cookie session). RLS
 * policies on the target tables enforce ownership; no service-role key is
 * required. Returns `{ user: null, supabase: null }` if unauthenticated.
 */
export async function getAuthContext(request) {
  try {
    const token = extractBearerToken(request);
    if (token) {
      const supabase = buildBearerClient(token);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) return { user, supabase };
    }

    const supabase = buildCookieClient(request);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) return { user, supabase };

    return { user: null, supabase: null };
  } catch {
    return { user: null, supabase: null };
  }
}

/**
 * Returns the Supabase auth user for the request (bearer token or cookie
 * session), or null. Never throws. Use when the handler only needs the user
 * id and talks to the DB via getAdminClient().
 */
export async function getAuthUser(request) {
  const { user } = await getAuthContext(request);
  return user;
}

/**
 * Authenticate the request via bearer token or cookie session. Returns
 * `{ user, client }` where `client` is bound to that user's JWT.
 * Throws `Error('Unauthorized')` (with `.status = 401`) if the request is
 * not authenticated — callers should let this bubble to a 401 handler or
 * catch it explicitly.
 */
export async function requireUser(request) {
  const { user, supabase } = await getAuthContext(request);
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
  return getAuthUser(request);
}

export { _getServerSupabase as getServerSupabase };
