import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/fec/outside-leaders?cycle=  — tracked members ranked by total outside
 * money (Schedule E independent expenditures FOR + AGAINST), flagging the races
 * where outside spending is heaviest. Reads the fec_candidate_outside cache and
 * joins member names/party from fec_candidate_totals (Supabase-first, cache-only;
 * the cron writes both). Honest empty ({ leaders: [] }). NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:outside-leaders:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const cycle = Number(searchParams.get('cycle')) || 2026;
  const empty = { ok: true, source: SOURCE, cycle, leaders: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data: outside, error } = await admin
      .from('fec_candidate_outside')
      .select('bioguide_id,support_total,oppose_total')
      .eq('cycle', cycle)
      .limit(600);
    if (error || !Array.isArray(outside) || !outside.length) return NextResponse.json(empty);

    const { data: totals } = await admin
      .from('fec_candidate_totals')
      .select('bioguide_id,name,party,office,state')
      .eq('cycle', cycle)
      .limit(600);
    const meta = new Map((totals || []).map((t) => [t.bioguide_id, t]));

    const leaders = outside
      .map((o) => {
        const support = Number(o.support_total) || 0;
        const oppose = Number(o.oppose_total) || 0;
        const m = meta.get(o.bioguide_id) || {};
        return {
          bioguideId: o.bioguide_id,
          name: m.name || null,
          party: m.party || null,
          office: m.office || null,
          state: m.state || null,
          forAmount: support,
          againstAmount: oppose,
          net: support - oppose,
          total: support + oppose,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    if (!leaders.length) return NextResponse.json(empty);
    return NextResponse.json({ ok: true, source: SOURCE, cycle, leaders });
  } catch {
    return NextResponse.json(empty);
  }
}
