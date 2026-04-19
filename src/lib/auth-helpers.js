/**
 * Auth helpers for API routes.
 *
 *   getAuthUser(request)
 *     Returns the Supabase auth user (or null) — used when the handler only
 *     needs the user id and will talk to the DB via supabaseAdmin.
 *
 *   getAuthContext(request)
 *     Returns { user, supabase } where `supabase` is a request-scoped client
 *     bound to the user's JWT. Use this for user-scoped CRUD on tables with
 *     RLS policies (like user_watchlists) — it works without the service-
 *     role key, and RLS transparently enforces "users can only touch their
 *     own rows".
 *
 *     This is the preferred helper for anything user-owned. It removes a
 *     class of production incidents where a missing SUPABASE_SERVICE_ROLE_KEY
 *     caused every user-scoped write to silently fail.
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

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

export async function getAuthUser(request) {
  try {
    const token = extractBearerToken(request);
    if (token) {
      const supabase = buildBearerClient(token);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) return user;
    }

    const supabase = buildCookieClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;

    return null;
  } catch {
    return null;
  }
}

/**
 * Return `{ user, supabase }` where `supabase` is a Supabase client bound to
 * the caller's auth context. RLS policies on the target tables enforce
 * ownership; no service-role key is required.
 *
 * Returns `{ user: null, supabase: null }` if the request is not
 * authenticated.
 */
export async function getAuthContext(request) {
  try {
    const token = extractBearerToken(request);
    if (token) {
      const supabase = buildBearerClient(token);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) return { user, supabase };
    }

    const supabase = buildCookieClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return { user, supabase };

    return { user: null, supabase: null };
  } catch {
    return { user: null, supabase: null };
  }
}
