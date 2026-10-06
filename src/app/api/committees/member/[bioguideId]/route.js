import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getMemberCommittees } from '@/lib/congress/committee-data';
import { COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';

/**
 * GET /api/committees/member/[bioguideId]: the member's committees and
 * subcommittees, plus their disclosed trades over the last 24 months in
 * sectors those committees oversee. Tickers the sector map cannot place are
 * counted as unmapped, never guessed.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };
const ID_RE = /^[A-Z]\d{6}$/;

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`committees:member:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);

  const bioguideId = String(params?.bioguideId || '').toUpperCase();
  if (!ID_RE.test(bioguideId)) {
    return NextResponse.json({ ok: false, error: 'Unknown member.' }, { status: 400 });
  }
  try {
    const data = await getMemberCommittees(getAdminClient(), bioguideId);
    return NextResponse.json(
      { ok: true, note: COMMITTEE_SECTOR_NOTE, ...data },
      { headers: CACHE },
    );
  } catch (e) {
    console.error('[committees] member:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load committees.' }, { status: 500 });
  }
}
