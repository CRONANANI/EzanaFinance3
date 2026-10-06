import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getCommitteeIndex } from '@/lib/congress/committee-data';
import { COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';

/**
 * GET /api/committees: every current committee (House, Senate, joint) with its
 * subcommittees, seat counts, majority/minority split, chair and ranking
 * member, and the editorial sector map. Also returns the most recent trades
 * members made in sectors their committees oversee (the page's ticker belt).
 * Source: the congress-legislators project, synced daily. Honest empty when
 * the tables have not been filled yet.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'congress-legislators project (House Clerk and Senate records)';
const CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`committees:index:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const empty = {
    ok: true,
    source: SOURCE,
    note: COMMITTEE_SECTOR_NOTE,
    committees: [],
    counts: { committees: 0, subcommittees: 0, seats: 0 },
    syncedAt: null,
    belt: [],
  };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const data = await getCommitteeIndex(getAdminClient());
    return NextResponse.json(
      { ok: true, source: SOURCE, note: COMMITTEE_SECTOR_NOTE, ...data },
      { headers: CACHE },
    );
  } catch (e) {
    console.error('[committees] index:', e?.message || e);
    return NextResponse.json(
      { ...empty, ok: false, error: 'Could not load committees.' },
      { status: 500 },
    );
  }
}
