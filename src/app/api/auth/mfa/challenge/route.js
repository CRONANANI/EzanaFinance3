import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/auth/mfa/challenge  { factorId } → { challengeId }
 *
 * Server-side MFA challenge. The browser Supabase SDK's auth-lock/promise layer
 * is what wedged the MFA step-up (challenge → race → stranded promise), even
 * though Supabase's own /auth/v1 API returns 200 in milliseconds. This route
 * calls mfa.challenge on an SSR client bound to the caller's REQUEST cookies —
 * no browser SDK, no processLock — so it can't wedge.
 *
 * Auth is taken ONLY from the caller's session cookies (never a body user id).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function withCookies(res, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

export async function POST(request) {
  const rl = await checkRateLimit(`mfa:challenge:${getClientIp(request)}`, { limit: 20 });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const factorId = body?.factorId;
  if (!factorId || typeof factorId !== 'string') {
    return NextResponse.json({ error: 'A valid factorId is required.' }, { status: 400 });
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

  // Auth is derived from the session cookies only.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error || !data?.id) {
    return withCookies(
      NextResponse.json(
        { error: error?.message || 'Could not start verification.' },
        { status: 400 },
      ),
      cookiesToSet,
    );
  }

  return withCookies(NextResponse.json({ challengeId: data.id }), cookiesToSet);
}
