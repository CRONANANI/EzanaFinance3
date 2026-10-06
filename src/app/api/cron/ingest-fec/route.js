import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { hasFecKey, createFecBudget, getCandidatesTotalsByIds } from '@/lib/fec/client';
import { buildMemberFinance } from '@/lib/fec/member-finance';
import { normalizeCandidateTotals } from '@/lib/fec/normalize';
import { pickFecCandidateId } from '@/lib/fec/join';
import { allCurrentMembers, fecIdsForMember } from '@/lib/politicians/member-directory';

/**
 * Scheduled refresh of per-member campaign-finance aggregates from the OpenFEC
 * API into Supabase (fec_candidate_totals / _donors / _outside), keyed by
 * bioguide_id + cycle, for every current member of Congress.
 *
 *   1. Totals pass: two-year totals for every member with a seat-matched FEC
 *      ID, 50 IDs per /candidates/totals/ call (about 11 requests).
 *   2. Detail pass: buildMemberFinance(deep) for as many members as the
 *      request budget allows, members never detailed first, then the
 *      stalest. Detail freshness is read from fec_candidate_donors, which only
 *      this pass writes (the totals pass refreshes every row each hour, so
 *      fec_candidate_totals.synced_at cannot order the rotation).
 *
 * Auth: CRON_SECRET bearer (same pattern as ingest-congress / ingest-usaspending).
 * No mock rows are ever written; a member without FEC filings is skipped.
 *
 *   curl https://ezana.world/api/cron/ingest-fec -H "Authorization: Bearer $CRON_SECRET"
 * Optional: ?cycle=2026
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_CYCLE = 2026;
const BATCH = 50;
const DETAIL_COST = 10; // worst case requests for one deep member build

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

const officeFor = (m) => (m.chamber === 'Senate' ? 'S' : m.chamber === 'House' ? 'H' : null);

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

  const admin = getAdminClient();
  const budget = createFecBudget(300);
  const members = allCurrentMembers();
  const errors = [];

  /* ── 1. Totals pass ─────────────────────────────────────────────────── */
  const byCandidate = new Map();
  for (const m of members) {
    const id = pickFecCandidateId(m, fecIdsForMember(m.bioguideId));
    if (id) byCandidate.set(id, m);
  }
  const ids = [...byCandidate.keys()];
  let totalsUpdated = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    if (budget.remaining < DETAIL_COST) break;
    const chunk = ids.slice(i, i + BATCH);
    const res = await getCandidatesTotalsByIds(chunk, { cycle }, { budget });
    if (!res.ok) {
      errors.push(`totals batch ${i / BATCH + 1}: ${res.error}`);
      continue;
    }
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    /* Guard: if the filter were ignored we would get unrelated candidates.
       Write nothing from such a page. */
    if (results.some((r) => !byCandidate.has(r.candidate_id))) {
      errors.push(`totals batch ${i / BATCH + 1}: unexpected candidates, skipped`);
      continue;
    }
    const now = new Date().toISOString();
    const rows = results.map((r) => {
      const m = byCandidate.get(r.candidate_id);
      const t = normalizeCandidateTotals(r);
      return {
        bioguide_id: m.bioguideId,
        cycle,
        candidate_id: r.candidate_id,
        id_source: 'directory',
        name: m.fullName || null,
        party: m.party || t.party || null,
        office: t.office || officeFor(m),
        state: t.state || m.state || null,
        receipts: t.raised,
        disbursements: t.spent,
        cash_on_hand_end_period: t.cashOnHand,
        individual_itemized_contributions: t.individualItemized,
        other_political_committee_contributions: t.pac,
        debts_owed_by_committee: t.debts,
        has_raised_funds: t.hasRaisedFunds,
        coverage_start_date: t.coverageStart,
        coverage_end_date: t.coverageEnd,
        synced_at: now,
      };
    });
    if (!rows.length) continue;
    const { error } = await admin
      .from('fec_candidate_totals')
      .upsert(rows, { onConflict: 'bioguide_id,cycle' });
    if (error) errors.push(`totals batch ${i / BATCH + 1}: ${error.message}`);
    else totalsUpdated += rows.length;
  }

  /* ── 2. Detail pass, rotating ───────────────────────────────────────── */
  const { data: detailRows, error: dReadErr } = await admin
    .from('fec_candidate_donors')
    .select('bioguide_id, synced_at')
    .eq('cycle', cycle);
  if (dReadErr) errors.push(`detail read: ${dReadErr.message}`);
  const lastDetail = new Map((detailRows || []).map((r) => [r.bioguide_id, r.synced_at]));
  const queue = [...members].sort((a, b) => {
    const ta = lastDetail.get(a.bioguideId);
    const tb = lastDetail.get(b.bioguideId);
    if (!ta && !tb) return 0;
    if (!ta) return -1;
    if (!tb) return 1;
    return String(ta).localeCompare(String(tb));
  });

  let detailUpdated = 0;
  for (const m of queue) {
    if (budget.remaining < DETAIL_COST) break; // keep headroom; finish next run
    try {
      const fin = await buildMemberFinance(m.bioguideId, { cycle, budget, deep: true });
      if (!fin) continue; // no FEC match: honest skip, no row written
      const now = new Date().toISOString();

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
          synced_at: now,
        },
        { onConflict: 'bioguide_id,cycle' },
      );
      if (tErr) errors.push(`${m.bioguideId} totals: ${tErr.message}`);

      const { error: dErr } = await admin.from('fec_candidate_donors').upsert(
        {
          bioguide_id: m.bioguideId,
          cycle,
          candidate_id: fin.candidateId,
          by_employer: fin.byEmployer || [],
          by_occupation: fin.byOccupation || [],
          synced_at: now,
        },
        { onConflict: 'bioguide_id,cycle' },
      );
      if (dErr) errors.push(`${m.bioguideId} donors: ${dErr.message}`);

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
          synced_at: now,
        },
        { onConflict: 'bioguide_id,cycle' },
      );
      if (oErr) errors.push(`${m.bioguideId} outside: ${oErr.message}`);

      if (!tErr && !dErr && !oErr) {
        detailUpdated += 1;
        lastDetail.set(m.bioguideId, now);
      }
    } catch (e) {
      errors.push(`${m.bioguideId}: ${e?.message || 'failed'}`);
    }
  }

  /* ── 3. One-time correction ──────────────────────────────────────────
     The old hand seed labelled H001077 (Clay Higgins) as John Hickenlooper.
     Drop that member's rows only if they still carry a candidate ID other
     than the vendored, seat-matched one, so the next run rewrites them. */
  const higgins = members.find((m) => m.bioguideId === 'H001077');
  const higginsId = higgins && pickFecCandidateId(higgins, higgins.fecIds);
  if (higginsId) {
    for (const table of ['fec_candidate_totals', 'fec_candidate_donors', 'fec_candidate_outside']) {
      const { error } = await admin
        .from(table)
        .delete()
        .eq('bioguide_id', 'H001077')
        .eq('cycle', cycle)
        .neq('candidate_id', higginsId);
      if (error) errors.push(`H001077 cleanup ${table}: ${error.message}`);
    }
  }

  const remainingWithoutRow = members.filter((m) => !lastDetail.has(m.bioguideId)).length;

  // The dimension hubs summarise this table.
  if (totalsUpdated || detailUpdated) revalidateTag('hubs');

  return NextResponse.json({
    ok: true,
    cycle,
    totalsUpdated,
    detailUpdated,
    remainingWithoutRow,
    requestsUsed: budget.used,
    errors: errors.slice(0, 10),
  });
}
