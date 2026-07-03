import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/auth/mfa/verify  { factorId, challengeId, code } → { ok: true }
 *
 * Server-side MFA verify — the crux of the fix. mfa.verify runs on an SSR client
 * bound to the caller's REQUEST cookies; on success the @supabase/ssr cookie
 * adapter's setAll() fires with the NEW aal2 session, which we write onto the
 * RESPONSE as Set-Cookie. The browser receives the elevated session purely via
 * Set-Cookie — the browser Supabase SDK (and its wedge-prone auth lock) is never
 * involved. A full-page reload then re-reads the cookie and middleware sees aal2.
 *
 * On a bad code we surface the REAL Supabase error (4xx), never a generic
 * timeout. Auth is taken ONLY from the caller's session cookies.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function withCookies(res, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

export async function POST(request) {
  const rl = await checkRateLimit(`mfa:verify:${getClientIp(request)}`, { limit: 20 });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const factorId = body?.factorId;
  const challengeId = body?.challengeId;
  const code = body?.code;
  if (
    !factorId ||
    typeof factorId !== 'string' ||
    !challengeId ||
    typeof challengeId !== 'string' ||
    typeof code !== 'string' ||
    !/^\d{6}$/.test(code)
  ) {
    return NextResponse.json(
      { error: 'factorId, challengeId and a 6-digit code are required.' },
      { status: 400 },
    );
  }

  const cookiesToSet = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list) {
          cookiesToSet.push(...list);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error || !data?.access_token) {
    // Surface the real Supabase message (e.g. "Invalid TOTP code entered").
    return withCookies(
      NextResponse.json(
        { error: error?.message || 'That code did not verify. Check the code and try again.' },
        { status: 400 },
      ),
      cookiesToSet,
    );
  }

  // Success: cookiesToSet now holds the new aal2 session cookies from the SSR
  // adapter — write them onto the response so the browser gets aal2 on reload.
  return withCookies(NextResponse.json({ ok: true }), cookiesToSet);
}
