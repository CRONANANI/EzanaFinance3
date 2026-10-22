import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getCommitteeTickerMatrix } from '@/lib/congress/committee-data';
import { COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';

/**
 * GET /api/committees/matrix: Card 8 of the Committee Assignments page.
 * hub_committee_ticker_stats over the mapped committees and the tickers of
 * the sectors they oversee: seats, members holding the ticker (open
 * positions inferred from disclosures), holder names, buyers and sellers
 * since 180 days. Counts and names only; the payload carries no dollar
 * values, so the UI cannot show one.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Periodic Transaction Reports; congress-legislators project';
const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const cachedMatrix = unstable_cache(
  async () => getCommitteeTickerMatrix(getAdminClient()),
  ['committees-matrix-v1'],
  { revalidate: 900, tags: ['committees-matrix'] },
);

export async function GET(request) {
  const rl = await checkRateLimit(`committees:matrix:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const empty = {
    ok: true,
    source: SOURCE,
    note: COMMITTEE_SECTOR_NOTE,
    sinceDays: 180,
    committees: [],
    cells: [],
  };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const data = await cachedMatrix();
    return NextResponse.json(
      { ok: true, source: SOURCE, note: COMMITTEE_SECTOR_NOTE, ...data },
      { headers: CACHE },
    );
  } catch (e) {
    console.error('[committees] matrix:', e?.message || e);
    return NextResponse.json(
      { ...empty, ok: false, error: 'Could not load the holdings matrix.' },
      { status: 503 },
    );
  }
}
