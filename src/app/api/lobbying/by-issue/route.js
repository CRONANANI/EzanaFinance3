import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { PERIOD_KEYS } from '@/lib/lobbying/period';
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
    const { data, error } = await admin.rpc('lobbying_issue_mix', {
      p_year: year,
      p_period: period,
      p_days: days,
    });
    if (error) {
      return NextResponse.json({ ...empty, _debug: `rpc error: ${error.message}` });
    }
    if (!Array.isArray(data) || !data.length) {
      return NextResponse.json(empty);
    }

    // RPC returns exact full-scope counts: { issue, filings, total_filings }.
    const filingsAnalyzed = Number(data[0]?.total_filings) || 0;
    const issues = data
      .map((r) => {
        const filings = Number(r.filings) || 0;
        return {
          issue: r.issue,
          filings,
          bucket: issueBucket(r.issue),
          share: filingsAnalyzed ? filings / filingsAnalyzed : 0,
        };
      })
      .filter((r) => r.issue);

    if (!issues.length) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, year, period, filingsAnalyzed, issues });
  } catch {
    return NextResponse.json(empty);
  }
}
