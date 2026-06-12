import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Authoritative sign-out. Clears the Supabase SSR session cookie ON the response
 * and redirects to the login chooser (/auth/login).
 *
 * Why server-side: the browser client's signOut() makes a network revocation
 * call that can hang or fail — leaving the httpOnly-style auth cookie in place,
 * so the user appears "logged out" but is still authenticated (and gets dropped
 * straight back in when they pick a portal). Doing it here, with the same
 * request.cookies → response.cookies pattern the middleware uses, guarantees the
 * cookie is expired before the browser reloads, so getUser() then returns null.
 *
 * Handles GET (navigation) and POST. Works for every app version — regular
 * users, university orgs (both use the global Navbar) and partners.
 */
function handleSignOut(request) {
  const response = NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // `scope: 'local'` clears this browser's session without depending on a
  // network revocation round-trip, so the cookie is always cleared.
  return supabase.auth
    .signOut({ scope: 'local' })
    .catch(() => {})
    .then(() => response);
}

export async function GET(request) {
  return handleSignOut(request);
}

export async function POST(request) {
  return handleSignOut(request);
}
