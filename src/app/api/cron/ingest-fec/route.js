import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { hasFecKey, createFecBudget } from '@/lib/fec/client';
import { buildMemberFinance } from '@/lib/fec/member-finance';
import { allDirectoryMembers } from '@/lib/politicians/member-directory';

/**
 * Scheduled refresh of per-member campaign-finance aggregates from the OpenFEC
 * API into Supabase (fec_candidate_totals / _donors / _outside), keyed by
 * bioguide_id + cycle. Bounded per run (request budget << 1,000/hr). The
 * /datasets/political campaign-finance cards read Supabase-first, so this keeps
 * the page fast and the FEC key server-only.
 *
 * Auth: CRON_SECRET bearer (same pattern as ingest-congress / ingest-usaspending).
 * No mock rows are ever written — a member without FEC filings is skipped.
 *
 *   curl https://ezana.world/api/cron/ingest-fec -H "Authorization: Bearer $CRON_SECRET"
 * Optional: ?cycle=2026&limit=40
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_CYCLE = 2026;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasFecKey()) {
    return NextResponse.json(
      { ok: false, error: 'FEC key (campaigndatagov) not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cycle = Number(searchParams.get('cycle')) || DEFAULT_CYCLE;
  const limit = Math.min(Number(searchParams.get('limit')) || 40, 200);

  const admin = getAdminClient();
  const budget = createFecBudget(300);
  const members = allDirectoryMembers().slice(0, limit);

  let totalsUpserted = 0;
  let donorsUpserted = 0;
  let outsideUpserted = 0;
  const errors = [];

  for (const m of members) {
    if (budget.remaining < 8) break; // keep headroom; finish next run
    try {
      const fin = await buildMemberFinance(m.bioguideId, { cycle, budget, deep: true });
      if (!fin) continue; // no FEC match → honest skip, no row written

      const { error: tErr } = await admin.from('fec_candidate_totals').upsert(
        {
          bioguide_id: m.bioguideId,
          cycle,
          candidate_id: fin.candidateId,
          id_source: fin.idSource,
          name: fin.name,
          party: fin.party,
          office: fin.office,
          state: fin.state,
          receipts: fin.raised,
          disbursements: fin.spent,
          cash_on_hand_end_period: fin.cashOnHand,
          individual_itemized_contributions: fin.individualItemized,
          other_political_committee_contributions: fin.pac,
          debts_owed_by_committee: fin.debts,
          has_raised_funds: fin.hasRaisedFunds,
          coverage_start_date: fin.coverageStart,
          coverage_end_date: fin.coverageEnd,
          size_buckets: fin.sizeBuckets,
          top_states: fin.topStates,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'bioguide_id,cycle' },
      );
      if (tErr) errors.push(`${m.bioguideId} totals: ${tErr.message}`);
      else totalsUpserted += 1;

      const { error: dErr } = await admin.from('fec_candidate_donors').upsert(
        {
          bioguide_id: m.bioguideId,
          cycle,
          candidate_id: fin.candidateId,
          by_employer: fin.byEmployer || [],
          by_occupation: fin.byOccupation || [],
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'bioguide_id,cycle' },
      );
      if (dErr) errors.push(`${m.bioguideId} donors: ${dErr.message}`);
      else donorsUpserted += 1;

      const { error: oErr } = await admin.from('fec_candidate_outside').upsert(
        {
          bioguide_id: m.bioguideId,
          cycle,
          candidate_id: fin.candidateId,
          support_total: fin.outside?.supportTotal ?? 0,
          oppose_total: fin.outside?.opposeTotal ?? 0,
          communication_cost: fin.outside?.communicationCost ?? 0,
          by_committee: fin.outside?.byCommittee || [],
          spending_by_purpose: fin.spendingByPurpose || [],
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'bioguide_id,cycle' },
      );
      if (oErr) errors.push(`${m.bioguideId} outside: ${oErr.message}`);
      else outsideUpserted += 1;
    } catch (e) {
      errors.push(`${m.bioguideId}: ${e?.message || 'failed'}`);
    }
  }

  return NextResponse.json({
    ok: true,
    cycle,
    membersProcessed: members.length,
    totalsUpserted,
    donorsUpserted,
    outsideUpserted,
    requestsUsed: budget.used,
    errors: errors.slice(0, 10),
  });
}
