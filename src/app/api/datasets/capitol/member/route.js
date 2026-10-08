/**
 * GET /api/datasets/capitol/member?bioguide=X000000[&part=core|extra]
 * One member for the Capitol Watch drawer.
 *   part=core   identity, committees, stats, recent trades and holdings: the
 *               first paint, four indexed reads
 *   part=extra  campaign finance, top donors, holdings that won awards
 *   (no part)   everything in one body, plus the member's signals among this
 *               week's events (the original shape)
 * The drawer asks for both parts in parallel (and starts them on hover, see
 * prefetch-cache.js); signals come from the events the page already holds.
 * Public records; no account needed; rate-limited per address.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getMemberCore, getMemberExtra, getMemberProfile } from '@/lib/datasets/capitol-hub/data';

export const dynamic = 'force-dynamic';

const BIOGUIDE = /^[A-Z]\d{6}$/;

export async function GET(request) {
  /* Hover prefetch asks for two parts per member, so the allowance is wider. */
  const rl = await checkRateLimit(`capitol-member:${getClientIp(request)}`, {
    limit: 180,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const sp = new URL(request.url).searchParams;
  const id = String(sp.get('bioguide') || '').toUpperCase();
  if (!BIOGUIDE.test(id)) return validationResponse('Unknown member.');
  const part = sp.get('part');
  const profile =
    part === 'core'
      ? await getMemberCore(id)
      : part === 'extra'
        ? await getMemberExtra(id)
        : await getMemberProfile(id);
  if (profile?.error) {
    return NextResponse.json(
      { ok: false, error: 'This member could not be loaded just now.' },
      { status: 503 },
    );
  }
  if (!profile || profile.notFound) {
    return NextResponse.json({ ok: false, error: 'Member not found.' }, { status: 404 });
  }
  return NextResponse.json(
    { ok: true, ...profile },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' } },
  );
}
