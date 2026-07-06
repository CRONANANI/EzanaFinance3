import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { normalizeQuarter, PERIOD_KEYS } from '@/lib/lobbying/period';
import { issueBucket } from '@/lib/lobbying/entities';

/**
 * GET /api/lobbying/by-issue?year=&period=  — SHARE OF FILINGS per lobbying issue
 * area for the period (the Influence Ledger's issue-mix donut). Honesty
 * constraint: the LDA does NOT itemize dollars per issue, so this is an ACTIVITY
 * view — count of filings citing each issue — never dollars per issue. Cache-only
 * aggregate; honest empty. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:by-issue:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year')) || 2025;
  const periodRaw = (searchParams.get('period') || 'year').toLowerCase();
  const period = PERIOD_KEYS.includes(periodRaw) ? periodRaw : 'year';
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 90, 1), 365);

  const empty = { ok: true, source: SOURCE, year, period, filingsAnalyzed: 0, issues: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('lobbying_filings')
      .select('issues,filing_period,dt_posted')
      .eq('filing_year', year)
      .not('issues', 'is', null)
      .limit(5000);
    if (error) {
      return NextResponse.json({ ...empty, _debug: `query error: ${error.message}` });
    }
    if (!Array.isArray(data) || !data.length) {
      return NextResponse.json({ ...empty, _debug: `no rows: len=${data?.length ?? 'null'}` });
    }

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

    const acc = new Map(); // issueDisplay → { filings }
    let filingsAnalyzed = 0;
    for (const r of data) {
      if (!inPeriod(r)) continue;
      filingsAnalyzed += 1;
      const seen = new Set();
      for (const it of Array.isArray(r.issues) ? r.issues : []) {
        const label = it?.display || it?.code;
        if (!label || seen.has(label)) continue;
        seen.add(label);
        acc.set(label, (acc.get(label) || 0) + 1);
      }
    }
    const issues = [...acc.entries()]
      .map(([issue, filings]) => ({
        issue,
        filings,
        bucket: issueBucket(issue),
        share: filingsAnalyzed ? filings / filingsAnalyzed : 0,
      }))
      .sort((a, b) => b.filings - a.filings)
      .slice(0, 12);

    if (!issues.length) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, year, period, filingsAnalyzed, issues });
  } catch {
    return NextResponse.json(empty);
  }
}
