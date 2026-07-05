import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { PERIOD_KEYS } from '@/lib/lobbying/period';
import { canonicalEntity } from '@/lib/lobbying/normalize';
import { getPeriodCoverage } from '@/lib/lobbying/coverage';
import { ENTITY_GROUPS } from '@/lib/lobbying/entities';

/**
 * GET /api/lobbying/top-spenders?year=&by=client|registrant&period=  — aggregate
 * lobbying spend ranked by client (org paying) or registrant (firm hired), from
 * the lobbying_filings cache, scoped to a time period.
 *
 * period ∈ year (default, whole year) | ytd | q1|q2|q3|q4 | range (last N days,
 * ?days=90 default). The dollar rule (is_registration=false + amount>0), the
 * period predicate (quarter/last-N-days), issue/entity/min filters, ordering by
 * amount desc, and the row cap are all pushed to the DB — so the biggest
 * spenders are guaranteed in the fetched slice and JS only does canonical
 * grouping + targeting-share tally. Only REAL reported dollars count toward
 * totals — registrations / no-activity reports are excluded so the board
 * reflects actual spend. Supabase-first (cache-only aggregate); honest empty.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:top-spenders:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || 2025;
  const byRaw = searchParams.get('by');
  const by = byRaw === 'registrant' || byRaw === 'firm' ? 'firm' : 'client';
  const nameCol = by === 'firm' ? 'registrant_name' : 'client_name';
  const periodParamRaw = (searchParams.get('period') || 'year').toLowerCase();
  const period = PERIOD_KEYS.includes(periodParamRaw) ? periodParamRaw : 'year';
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 90, 1), 365);
  const issue = (searchParams.get('issue') || '').toLowerCase(); // issue bucket, '' = all
  const entityGroup = (searchParams.get('entityGroup') || '').toLowerCase(); // congress|agencies|whitehouse
  const min = Number(searchParams.get('min')) || 0;
  const groupBuckets = ENTITY_GROUPS[entityGroup] || null;

  const empty = { ok: true, source: SOURCE, year, by, period, spenders: [], coverage: null };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    // coverage for the selected period so the card can flag a partial ranking
    let coverage = null;
    try {
      coverage = await getPeriodCoverage(admin, year, period);
    } catch {
      /* coverage is best-effort */
    }

    const rangeCutoff =
      period === 'range' ? new Date(Date.now() - days * 86400000).toISOString() : null;
    const quarter = ['q1', 'q2', 'q3', 'q4'].includes(period) ? period : null;
    // Apply the period predicate (quarter or last-N-days) to a query. YTD/year
    // are already scoped by .eq('filing_year', year), so they add nothing here.
    const withPeriod = (q) => {
      if (quarter) return q.eq('quarter', period);
      if (rangeCutoff != null) return q.gte('dt_posted', rangeCutoff);
      return q;
    };

    // Push the aggregation-relevant filters to the DB — dollar rule, period,
    // issue/entity/min — and order by amount desc so the biggest spenders are
    // guaranteed to be in the fetched slice even at the cap (the opposite of the
    // old arbitrary unordered .limit(8000)). JS then only does canonical
    // grouping + targeting-share tally over these correct, dollar-bearing rows.
    // `amount > 0` is the real dollar gate (registrations carry a null amount, so
    // they're already excluded here). The is_registration predicate is tolerant
    // of legacy NULLs — rows ingested before the column was populated are null,
    // and a strict `.eq(false)` would wrongly drop those real dollar-bearing
    // reports, blanking the board. `.gt('amount', 0)` keeps registrations out.
    let q = admin
      .from('lobbying_filings')
      .select(`${nameCol},amount,lobbyist_count,entity_buckets`)
      .eq('filing_year', year)
      .or('is_registration.is.null,is_registration.eq.false')
      .gt('amount', 0);
    q = withPeriod(q);
    if (issue) q = q.overlaps('issue_buckets', [issue]);
    if (groupBuckets) q = q.overlaps('entity_buckets', groupBuckets);
    if (min > 0) q = q.gte('amount', min);
    q = q.order('amount', { ascending: false, nullsFirst: false }).limit(20000);

    const { data, error } = await q;
    if (error) return NextResponse.json({ ...empty, coverage });
    if (!Array.isArray(data) || !data.length) {
      // Distinguish "genuinely no disclosed spend yet" (early YTD, mostly
      // registrations) from a bug: report how many filings are loaded for the
      // period so the card can say so precisely instead of blanking.
      let filingsInPeriod = 0;
      try {
        let cq = admin
          .from('lobbying_filings')
          .select('uuid', { count: 'exact', head: true })
          .eq('filing_year', year);
        cq = withPeriod(cq);
        const { count } = await cq;
        filingsInPeriod = count || 0;
      } catch {
        /* best-effort */
      }
      return NextResponse.json({ ...empty, coverage, filingsInPeriod });
    }

    // Group on the CANONICAL entity key so a corporation's spelling variants
    // ("General Motors" / "General Motors Company" / "GENERAL MOTORS CO.") sum
    // into one row instead of fragmenting across the board. Also tally, per
    // spender, the share of ITS filings citing each government-entity bucket —
    // that's TARGETING ACTIVITY (share of filings), never dollars per entity.
    const acc = new Map();
    for (const r of data) {
      const raw = r[nameCol];
      if (!raw) continue;
      const { key, display } = canonicalEntity(raw);
      if (!key) continue;
      if (!acc.has(key))
        acc.set(key, {
          display,
          labels: new Map(),
          total: 0,
          filings: 0,
          lobbyists: 0,
          ent: new Map(),
        });
      const e = acc.get(key);
      e.filings += 1;
      e.lobbyists += Number(r.lobbyist_count) || 0;
      // every fetched row is dollar-bearing (DB-filtered), so it counts to total
      e.total += Number(r.amount);
      e.labels.set(display, (e.labels.get(display) || 0) + 1);
      for (const b of Array.isArray(r.entity_buckets) ? r.entity_buckets : []) {
        e.ent.set(b, (e.ent.get(b) || 0) + 1);
      }
    }
    const spenders = [...acc.values()]
      .map((e) => {
        const label = [...e.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || e.display;
        // targeting share is a CLIENT-level concept; firms show solid bars.
        const targeting =
          by === 'client' && e.filings > 0
            ? [...e.ent.entries()]
                .map(([bucket, n]) => ({ bucket, share: n / e.filings }))
                .sort((a, b) => b.share - a.share)
                .slice(0, 8)
            : [];
        return {
          name: label,
          total: e.total,
          filings: e.filings,
          lobbyists: e.lobbyists,
          targeting,
        };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 25);

    if (!spenders.length) return NextResponse.json({ ...empty, coverage });
    return NextResponse.json({
      ok: true,
      source: SOURCE,
      year,
      by,
      period,
      days,
      spenders,
      coverage,
    });
  } catch {
    return NextResponse.json(empty);
  }
}
