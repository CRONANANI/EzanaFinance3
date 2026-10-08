/**
 * GET /api/datasets/capitol/member?bioguide=X000000
 * One member for the Capitol Watch drawer: identity, committees, four stats,
 * signals involving them, recent trades, inferred holdings that won federal
 * awards, and campaign finance with top donor employers and occupations.
 * Public records; no account needed; rate-limited per address.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { getMemberProfile } from '@/lib/datasets/capitol-hub/data';

export const dynamic = 'force-dynamic';

const BIOGUIDE = /^[A-Z]\d{6}$/;

export async function GET(request) {
  const rl = await checkRateLimit(`capitol-member:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const id = String(new URL(request.url).searchParams.get('bioguide') || '').toUpperCase();
  if (!BIOGUIDE.test(id)) return validationResponse('Unknown member.');
  const profile = await getMemberProfile(id);
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
