import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/fec/top-raisers?cycle=&office=  — tracked Congress members ranked by
 * receipts for the cycle. Reads the fec_candidate_totals cache (Supabase-first),
 * scoped to members we track. Also returns the Money-Map summary (totals across
 * the tracked set). Honest empty ({ raisers: [] }) pre-ingestion. NO mock data.
 *
 * Note: this route is cache-only (no live fan-out) — ranking every member live
 * would blow the FEC rate limit; the cron populates the cache the ranking reads.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:top-raisers:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const cycle = Number(searchParams.get('cycle')) || 2026;
  const office = (searchParams.get('office') || '').toUpperCase(); // '', 'H', 'S'

  const emptyMoneyMap = { totalRaised: 0, totalPac: 0, avgCashOnHand: 0, membersWithFilings: 0 };
  const empty = { ok: true, source: SOURCE, cycle, raisers: [], moneyMap: emptyMoneyMap };

  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    let q = admin
      .from('fec_candidate_totals')
      .select(
        'bioguide_id,candidate_id,name,party,office,state,receipts,disbursements,cash_on_hand_end_period,individual_itemized_contributions,other_political_committee_contributions,coverage_end_date',
      )
      .eq('cycle', cycle)
      .order('receipts', { ascending: false })
      .limit(250);
    if (office === 'H' || office === 'S') q = q.eq('office', office);

    const { data, error } = await q;
    if (error || !Array.isArray(data) || !data.length) return NextResponse.json(empty);

    const raisers = data.map((d, i) => {
      const indiv = Number(d.individual_itemized_contributions) || 0;
      const pac = Number(d.other_political_committee_contributions) || 0;
      const mix = indiv + pac;
      return {
        rank: i + 1,
        bioguideId: d.bioguide_id,
        candidateId: d.candidate_id,
        name: d.name,
        party: d.party,
        office: d.office,
        state: d.state,
        raised: Number(d.receipts) || 0,
        cashOnHand: Number(d.cash_on_hand_end_period) || 0,
        individualItemized: indiv,
        pac,
        // individual-vs-PAC share for the mini stacked bar (0 when unknown)
        individualShare: mix > 0 ? indiv / mix : null,
        pacShare: mix > 0 ? pac / mix : null,
        coverageEnd: d.coverage_end_date,
      };
    });

    const totalRaised = raisers.reduce((s, r) => s + r.raised, 0);
    const totalPac = raisers.reduce((s, r) => s + r.pac, 0);
    const withCash = raisers.filter((r) => r.cashOnHand > 0);
    const avgCashOnHand = withCash.length
      ? withCash.reduce((s, r) => s + r.cashOnHand, 0) / withCash.length
      : 0;

    return NextResponse.json({
      ok: true,
      source: SOURCE,
      cycle,
      raisers,
      moneyMap: {
        totalRaised,
        totalPac,
        avgCashOnHand,
        membersWithFilings: raisers.length,
      },
    });
  } catch {
    return NextResponse.json(empty);
  }
}
