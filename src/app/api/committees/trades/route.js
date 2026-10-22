import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getOverseenTradeFeed } from '@/lib/congress/committee-data';
import { COMMITTEE_SECTORS, COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';
import { SECTORS } from '@/lib/congress/policy-sector-map';

/**
 * GET /api/committees/trades: Card 7 of the Committee Assignments page. The
 * window summary (trades, buys, sells, distinct members, unmapped tickers)
 * and a paged feed of trades members disclosed in sectors their committees
 * oversee. Amounts are disclosure ranges, as filed. A trade in an overseen
 * sector is a disclosure pattern, not evidence of wrongdoing.
 *
 * ?committee=HSIF&sector=defense&side=buy|sell&party=D|R|I&chamber=house&page=1
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Periodic Transaction Reports; congress-legislators project';
const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' };
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const cachedFeed = unstable_cache(
  async (argsJson) => getOverseenTradeFeed(getAdminClient(), JSON.parse(argsJson)),
  ['committees-trades-v1'],
  { revalidate: 900, tags: ['committees-trades'] },
);

export async function GET(request) {
  const rl = await checkRateLimit(`committees:trades:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const sp = new URL(request.url).searchParams;
  const committee = (sp.get('committee') || '').toUpperCase();
  const sector = sp.get('sector') || '';
  const side = sp.get('side') || '';
  const party = (sp.get('party') || '').toUpperCase();
  const chamber = (sp.get('chamber') || '').toLowerCase();
  const page = Math.min(Math.max(1, Number(sp.get('page')) || 1), 200);
  const args = {
    committee: COMMITTEE_SECTORS[committee] ? committee : null,
    sector: SECTORS[sector] ? sector : null,
    side: side === 'buy' || side === 'sell' ? side : null,
    party: ['D', 'R', 'I'].includes(party) ? party : null,
    chamber: ['house', 'senate', 'joint'].includes(chamber) ? chamber : null,
    page,
  };

  const empty = {
    ok: true,
    source: SOURCE,
    note: COMMITTEE_SECTOR_NOTE,
    window: null,
    summary: { trades: 0, buys: 0, sells: 0, members: 0, unmapped: 0 },
    rows: [],
    page: 1,
    pages: 1,
  };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const data = await cachedFeed(JSON.stringify(args));
    return NextResponse.json(
      { ok: true, source: SOURCE, note: COMMITTEE_SECTOR_NOTE, ...data },
      { headers: CACHE },
    );
  } catch (e) {
    console.error('[committees] trades:', e?.message || e);
    return NextResponse.json(
      { ...empty, ok: false, error: 'Could not load the trade window.' },
      { status: 503 },
    );
  }
}
