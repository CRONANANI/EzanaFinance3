import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { canonicalEntity } from '@/lib/lobbying/normalize';
import { normalizeQuarter, PERIOD_KEYS } from '@/lib/lobbying/period';

/**
 * GET /api/lobbying/summary?year=&period=  — period-scoped stat-card numbers:
 * disclosed spend (sum of lump filing amounts), filing count, distinct
 * registrants/clients, and distinct revolving-door lobbyists. Reads the
 * lobbying_filings cache (Supabase-first, cache-only aggregate). Honest zeros
 * pre-ingestion. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:summary:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || 2025;
  const periodRaw = (searchParams.get('period') || 'year').toLowerCase();
  const period = PERIOD_KEYS.includes(periodRaw) ? periodRaw : 'year';
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 90, 1), 365);

  const empty = {
    ok: true,
    source: SOURCE,
    year,
    period,
    totalSpend: 0,
    registrants: 0,
    clients: 0,
    filings: 0,
    revolvingDoorLobbyists: 0,
  };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    /* Paged. One select is capped server-side at 5,000 rows, which silently
       cut 2026 (16,345 filings) to 5,000: the cards showed $90M of $633M in
       spend and about a third of registrants and clients. Count first, then
       fetch every page concurrently, the getContractRollups pattern. */
    const PAGE = 1000;
    const { count, error: countErr } = await admin
      .from('lobbying_filings')
      .select('uuid', { count: 'exact', head: true })
      .eq('filing_year', year);
    if (countErr || !count) return NextResponse.json(empty);
    const pages = await Promise.all(
      Array.from({ length: Math.ceil(Math.min(count, 100000) / PAGE) }, (_, i) =>
        admin
          .from('lobbying_filings')
          .select('registrant_name,client_name,amount,synced_at,filing_period,dt_posted,lobbyists')
          .eq('filing_year', year)
          .order('uuid', { ascending: true })
          .range(i * PAGE, i * PAGE + PAGE - 1),
      ),
    );
    if (pages.some((pg) => pg.error)) return NextResponse.json(empty);
    const data = pages.flatMap((pg) => pg.data || []);
    if (!data.length) return NextResponse.json(empty);

    const rangeCutoff = period === 'range' ? Date.now() - days * 86400000 : null;
    const quarter = ['q1', 'q2', 'q3', 'q4'].includes(period) ? period : null;
    const inPeriod = (r) => {
      if (quarter) return normalizeQuarter(r.filing_period) === quarter;
      if (rangeCutoff != null) {
        const t = Date.parse(r.dt_posted);
        return !Number.isNaN(t) && t >= rangeCutoff;
      }
      return true;
    };

    const registrants = new Set();
    const clients = new Set();
    const revolvers = new Set();
    let totalSpend = 0;
    let filings = 0;
    let syncedAt = null;
    for (const r of data) {
      if (r.synced_at && (!syncedAt || r.synced_at > syncedAt)) syncedAt = r.synced_at;
      if (!inPeriod(r)) continue;
      filings += 1;
      if (r.registrant_name) registrants.add(canonicalEntity(r.registrant_name).key);
      if (r.client_name) clients.add(canonicalEntity(r.client_name).key);
      totalSpend += Number(r.amount) || 0;
      for (const l of Array.isArray(r.lobbyists) ? r.lobbyists : []) {
        if (l?.revolvingDoor && l.name) revolvers.add(l.name);
      }
    }
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      origin: 'cache',
      syncedAt,
      year,
      period,
      totalSpend,
      registrants: registrants.size,
      clients: clients.size,
      filings,
      revolvingDoorLobbyists: revolvers.size,
    });
  } catch {
    return NextResponse.json(empty);
  }
}
