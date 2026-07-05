import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeQuarter, PERIOD_KEYS } from '@/lib/lobbying/period';
import { canonicalEntity } from '@/lib/lobbying/normalize';

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
  const by = searchParams.get('by') === 'registrant' ? 'registrant' : 'client';
  const nameCol = by === 'registrant' ? 'registrant_name' : 'client_name';
  const periodParamRaw = (searchParams.get('period') || 'year').toLowerCase();
  const period = PERIOD_KEYS.includes(periodParamRaw) ? periodParamRaw : 'year';
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 90, 1), 365);

  const empty = { ok: true, source: SOURCE, year, by, period, spenders: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('lobbying_filings')
      .select(
        `${nameCol},amount,lobbyist_count,filing_period,dt_posted,is_registration,filing_type`,
      )
      .eq('filing_year', year)
      .limit(8000);
    if (error || !Array.isArray(data) || !data.length) return NextResponse.json(empty);

    const rangeCutoff = period === 'range' ? Date.now() - days * 86400000 : null;
    const quarter = ['q1', 'q2', 'q3', 'q4'].includes(period) ? period : null;

    const inPeriod = (r) => {
      if (quarter) return normalizeQuarter(r.filing_period) === quarter;
      if (rangeCutoff != null) {
        const t = Date.parse(r.dt_posted);
        return !Number.isNaN(t) && t >= rangeCutoff;
      }
      return true; // 'year' | 'ytd' → whole cached year
    };

    // Only real reported dollars count (exclude registrations / no-spend).
    const isDollar = (r) =>
      r.is_registration !== true &&
      !/registration/i.test(String(r.filing_type || '')) &&
      Number(r.amount) > 0;

    // Group on the CANONICAL entity key so a corporation's spelling variants
    // ("General Motors" / "General Motors Company" / "GENERAL MOTORS CO.") sum
    // into one row instead of fragmenting across the board.
    const acc = new Map();
    for (const r of data) {
      const raw = r[nameCol];
      if (!raw || !inPeriod(r)) continue;
      const { key, display } = canonicalEntity(raw);
      if (!key) continue;
      if (!acc.has(key))
        acc.set(key, { display, labels: new Map(), total: 0, filings: 0, lobbyists: 0 });
      const e = acc.get(key);
      e.filings += 1;
      e.lobbyists += Number(r.lobbyist_count) || 0;
      if (isDollar(r)) e.total += Number(r.amount);
      // track the most-common cleaned display label for this key
      e.labels.set(display, (e.labels.get(display) || 0) + 1);
    }
    const spenders = [...acc.values()]
      .map((e) => {
        const label = [...e.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || e.display;
        return { name: label, total: e.total, filings: e.filings, lobbyists: e.lobbyists };
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 25);

    if (!spenders.length) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, year, by, period, days, spenders });
  } catch {
    return NextResponse.json(empty);
  }
}
