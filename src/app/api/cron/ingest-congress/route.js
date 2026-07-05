import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  hasCongressKey,
  createRequestBudget,
  listBills,
  getBillActions,
  getBillSubjects,
  listCommitteeMeetings,
} from '@/lib/congress/client';
import { deriveStage } from '@/lib/congress/stage';
import { estimatePassage } from '@/lib/congress/passage-model';

/**
 * Scheduled incremental ingest of Congress.gov legislative data into Supabase.
 * Bounded per run (request budget << 5,000/hr): a page of recently-updated
 * current-Congress bills + their actions/subjects, plus recent committee
 * meetings. Stage is derived (stage.js) and a structural passage probability is
 * computed (passage-model.js) at write time.
 *
 * Auth: CRON_SECRET bearer (same pattern as ingest-usaspending). The key
 * (datagovapi) is server-only. No mock rows are ever written.
 *
 *   curl https://ezana.world/api/cron/ingest-congress -H "Authorization: Bearer $CRON_SECRET"
 * Optional: ?congress=119&limit=100  (defaults to current Congress).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_CONGRESS = 119; // current Congress; override via ?congress=

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

function partyLetter(p) {
  const s = String(p || '').toUpperCase();
  if (s.startsWith('D')) return 'D';
  if (s.startsWith('R')) return 'R';
  if (s.startsWith('I')) return 'I';
  return null;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasCongressKey()) {
    return NextResponse.json(
      { ok: false, error: 'Congress.gov key (datagovapi) not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const congress = Math.max(1, Number(searchParams.get('congress')) || DEFAULT_CONGRESS);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 60));
  const budget = createRequestBudget(400);
  const admin = getAdminClient();

  let billsUpserted = 0;
  let meetingsUpserted = 0;
  const errors = [];

  // 1 · recently-updated bills (incremental via updateDate sort)
  const billsRes = await listBills({ congress, limit, sort: 'updateDate+desc' }, { budget });
  const bills = Array.isArray(billsRes.data?.bills) ? billsRes.data.bills : [];

  for (const b of bills) {
    try {
      const type = String(b.type || '').toLowerCase();
      const number = Number(b.number);
      if (!type || !number) continue;
      const id = `${congress}-${type}-${number}`;

      // enrich with actions + subjects (each 1 request, budget-guarded)
      const [actRes, subjRes] = await Promise.all([
        getBillActions(congress, type, number, { budget }).catch(() => ({ data: null })),
        getBillSubjects(congress, type, number, { budget }).catch(() => ({ data: null })),
      ]);
      const actions = Array.isArray(actRes.data?.actions) ? actRes.data.actions : [];
      const subjects = Array.isArray(subjRes.data?.subjects?.legislativeSubjects)
        ? subjRes.data.subjects.legislativeSubjects.map((s) => s.name).filter(Boolean)
        : [];

      const sponsor = b.sponsors?.[0] || {};
      const stage = deriveStage({ latestActionText: b.latestAction?.text, actions });
      const record = {
        id,
        congress,
        type,
        number,
        title: b.title || null,
        policy_area: b.policyArea?.name || null,
        latest_action_text: b.latestAction?.text || null,
        latest_action_date: b.latestAction?.actionDate || null,
        sponsor_bioguide: sponsor.bioguideId || null,
        sponsor_party: partyLetter(sponsor.party),
        cosponsor_count: Number(b.cosponsors?.count ?? 0) || 0,
        cosponsor_dem: 0,
        cosponsor_rep: 0,
        cbo_estimate: null,
        introduced_date: b.introducedDate || null,
        update_date: b.updateDate || null,
        stage,
        raw: b,
      };
      const passage = estimatePassage({
        stage,
        cosponsorCount: record.cosponsor_count,
        sponsorParty: record.sponsor_party,
        // majority party of the current Congress is configured in the model;
        // richer features (companion bill, committee report) fill in over time.
      });
      record.model_probability = passage.probability;
      record.model_features = passage.features;

      const { error: upErr } = await admin
        .from('congress_bills')
        .upsert(record, { onConflict: 'id' });
      if (upErr) {
        errors.push(`bill ${id}: ${upErr.message}`);
        continue;
      }
      billsUpserted += 1;

      if (subjects.length) {
        await admin.from('congress_bill_subjects').upsert(
          subjects.map((s) => ({ bill_id: id, subject: s })),
          { onConflict: 'bill_id,subject' },
        );
      }
      if (actions.length) {
        await admin.from('congress_bill_actions').upsert(
          actions.slice(0, 60).map((a, seq) => ({
            bill_id: id,
            action_date: a.actionDate || null,
            action_code: a.actionCode || null,
            text: a.text || null,
            seq,
          })),
          { onConflict: 'bill_id,seq' },
        );
      }
    } catch (e) {
      errors.push(e?.message || 'bill error');
    }
  }

  // 2 · recent committee meetings / hearings
  try {
    const mRes = await listCommitteeMeetings({ congress, limit: 40 }, { budget });
    const meetings = Array.isArray(mRes.data?.committeeMeetings) ? mRes.data.committeeMeetings : [];
    for (const m of meetings) {
      const eventId = String(m.eventId || m.jacketNumber || '');
      if (!eventId) continue;
      const { error } = await admin.from('congress_meetings').upsert(
        {
          event_id: eventId,
          chamber: m.chamber || null,
          committee: m.committee?.name || null,
          meeting_date: m.date || null,
          title: m.title || null,
          related_bills: null,
          document_urls: null,
          raw: m,
        },
        { onConflict: 'event_id' },
      );
      if (!error) meetingsUpserted += 1;
    }
  } catch (e) {
    errors.push(`meetings: ${e?.message}`);
  }

  return NextResponse.json({
    ok: true,
    congress,
    billsUpserted,
    meetingsUpserted,
    requestsUsed: budget.used,
    errors: errors.slice(0, 10),
  });
}
