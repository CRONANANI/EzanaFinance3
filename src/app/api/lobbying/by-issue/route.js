import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/lobbying/by-issue?year=  — total reported $ and filing counts per
 * lobbying issue area, from the lobbying_filings cache (Supabase-first,
 * cache-only aggregate). Powers the "Spending by issue" hero chart. Honest
 * empty. NO mock data.
 *
 * Note: a filing's amount covers ALL issues it lists; attributing the full
 * amount to each of its issues would double-count. We report per-issue filing
 * counts and the summed amount of filings touching each issue, labeled as such.
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

  const empty = { ok: true, source: SOURCE, year, issues: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('lobbying_filings')
      .select('amount,issues')
      .eq('filing_year', year)
      .limit(6000);
    if (error || !Array.isArray(data) || !data.length) return NextResponse.json(empty);

    const acc = new Map(); // issueDisplay → { amount, filings }
    for (const r of data) {
      const amt = Number(r.amount) || 0;
      const list = Array.isArray(r.issues) ? r.issues : [];
      const seen = new Set();
      for (const it of list) {
        const label = it?.display || it?.code;
        if (!label || seen.has(label)) continue;
        seen.add(label);
        if (!acc.has(label)) acc.set(label, { amount: 0, filings: 0 });
        const e = acc.get(label);
        e.amount += amt;
        e.filings += 1;
      }
    }
    const issues = [...acc.entries()]
      .map(([label, e]) => ({ issue: label, amount: e.amount, filings: e.filings }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);

    if (!issues.length) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, year, issues });
  } catch {
    return NextResponse.json(empty);
  }
}
