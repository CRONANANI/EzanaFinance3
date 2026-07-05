import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/lobbying/top-spenders?year=&by=client|registrant  — aggregate
 * lobbying spend ranked by client (org paying) or registrant (firm hired), from
 * the lobbying_filings cache. Supabase-first (cache-only aggregate). Honest
 * empty. NO mock data.
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
  const year = Number(searchParams.get('year')) || 2026;
  const by = searchParams.get('by') === 'registrant' ? 'registrant' : 'client';
  const nameCol = by === 'registrant' ? 'registrant_name' : 'client_name';

  const empty = { ok: true, source: SOURCE, year, by, spenders: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('lobbying_filings')
      .select(`${nameCol},amount,lobbyist_count`)
      .eq('filing_year', year)
      .limit(4000);
    if (error || !Array.isArray(data) || !data.length) return NextResponse.json(empty);

    const acc = new Map();
    for (const r of data) {
      const name = r[nameCol];
      if (!name) continue;
      if (!acc.has(name)) acc.set(name, { total: 0, filings: 0, lobbyists: 0 });
      const e = acc.get(name);
      e.total += Number(r.amount) || 0;
      e.filings += 1;
      e.lobbyists += Number(r.lobbyist_count) || 0;
    }
    const spenders = [...acc.entries()]
      .map(([name, e]) => ({ name, total: e.total, filings: e.filings, lobbyists: e.lobbyists }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 25);

    if (!spenders.length) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, year, by, spenders });
  } catch {
    return NextResponse.json(empty);
  }
}
