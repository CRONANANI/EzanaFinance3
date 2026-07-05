import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeQuarter, PERIOD_KEYS } from '@/lib/lobbying/period';
import { canonicalEntity } from '@/lib/lobbying/normalize';
import { getPeriodCoverage } from '@/lib/lobbying/coverage';
import { ENTITY_GROUPS } from '@/lib/lobbying/entities';

/**
 * GET /api/lobbying/top-spenders?year=&by=client|registrant&period=  — aggregate
 * lobbying spend ranked by client (org paying) or registrant (firm hired), from
 * the lobbying_filings cache, scoped to a time period.
 *
 * period ∈ year (default, whole year) | ytd | q1|q2|q3|q4 | range (last N days,
 * ?days=90 default, computed from dt_posted). Quarters map from the raw LDA
 * filing_period label via normalizeQuarter. Only REAL reported dollars count
 * toward totals — registrations / no-activity reports are excluded so the board
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
    const { data, error } = await admin
      .from('lobbying_filings')
      .select(
        `${nameCol},amount,lobbyist_count,filing_period,dt_posted,is_registration,filing_type,entity_buckets,issue_buckets`,
      )
      .eq('filing_year', year)
      .limit(8000);
    if (error || !Array.isArray(data) || !data.length)
      return NextResponse.json({ ...empty, coverage });

    const rangeCutoff = period === 'range' ? Date.now() - days * 86400000 : null;
    const quarter = ['q1', 'q2', 'q3', 'q4'].includes(period) ? period : null;

    const passesFilters = (r) => {
      if (quarter) {
        if (normalizeQuarter(r.filing_period) !== quarter) return false;
      } else if (rangeCutoff != null) {
        const t = Date.parse(r.dt_posted);
        if (Number.isNaN(t) || t < rangeCutoff) return false;
      }
      if (issue && !(Array.isArray(r.issue_buckets) && r.issue_buckets.includes(issue)))
        return false;
      if (
        groupBuckets &&
        !(Array.isArray(r.entity_buckets) && r.entity_buckets.some((b) => groupBuckets.includes(b)))
      )
        return false;
      if (min > 0 && !(Number(r.amount) >= min)) return false;
      return true;
    };

    // Only real reported dollars count (exclude registrations / no-spend).
    const isDollar = (r) =>
      r.is_registration !== true &&
      !/registration/i.test(String(r.filing_type || '')) &&
      Number(r.amount) > 0;

    // Group on the CANONICAL entity key so a corporation's spelling variants
    // ("General Motors" / "General Motors Company" / "GENERAL MOTORS CO.") sum
    // into one row instead of fragmenting across the board. Also tally, per
    // spender, the share of ITS filings citing each government-entity bucket —
    // that's TARGETING ACTIVITY (share of filings), never dollars per entity.
    const acc = new Map();
    for (const r of data) {
      const raw = r[nameCol];
      if (!raw || !passesFilters(r)) continue;
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
      if (isDollar(r)) e.total += Number(r.amount);
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
