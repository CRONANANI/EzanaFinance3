/**
 * Claim an approved API key from the one-time link (/ezana-api/claim).
 *   GET  ?token=   whether the link is valid, used or expired (does not use it)
 *   POST { token } generate the key, activate it, return it once
 * Rate limited per IP. The token is never logged.
 */
import { NextResponse } from 'next/server';
import { getAdminClient, getAuthUser } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { claimKey, claimState, IssueError } from '@/lib/ezana-api/issue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`ezana-api:claim:check:${getClientIp(request)}`, { limit: 20 });
  if (!rl.success) return rateLimitResponse(rl);
  const token = new URL(request.url).searchParams.get('token');
  const st = await claimState(getAdminClient(), token);
  return NextResponse.json(
    { state: st.state, tier: st.key?.tier || null, name: st.key?.name || null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request) {
  const rl = await checkRateLimit(`ezana-api:claim:${getClientIp(request)}`, {
    limit: 10,
    window: '1 h',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const body = await request.json().catch(() => ({}));
  const user = await getAuthUser(request).catch(() => null);
  try {
    const out = await claimKey(getAdminClient(), body?.token, user?.id || null);
    return NextResponse.json(
      { ok: true, key: out.raw, prefix: out.prefix, tier: out.tier },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof IssueError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[ezana-api claim]', e?.message || e);
    return NextResponse.json({ error: 'Could not claim the key.' }, { status: 500 });
  }
}
