import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { fetchCommitteeSources, toCommitteeRows, toMemberRows } from '@/lib/congress/committees';

/**
 * Daily sync of congressional committees and assignments from the public-domain
 * congress-legislators project into congress_committees and
 * congress_committee_members.
 *
 * Safe by construction: if either source fails or looks truncated, nothing is
 * written. Rows are upserted with synced_at = run start; only after every
 * write succeeds are rows from earlier runs (people who left a committee,
 * committees that no longer exist) deleted.
 *
 * Auth: CRON_SECRET bearer (same pattern as ingest-congress).
 *   curl https://ezana.world/api/cron/ingest-committees -H "Authorization: Bearer $CRON_SECRET"
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const MIN_COMMITTEES = 20;
const MIN_MEMBERSHIPS = 400;
const CHUNK = 500;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

async function upsertChunks(admin, table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await admin.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const runStart = new Date().toISOString();

  let sources;
  try {
    sources = await fetchCommitteeSources();
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `fetch failed: ${e?.message || e}` });
  }

  const { parents, subs } = toCommitteeRows(sources.committees);
  const committeeIds = new Set([...parents, ...subs].map((c) => c.thomas_id));
  const allMembers = toMemberRows(sources.membership);
  // A membership key with no committee row would fail the foreign key.
  const members = allMembers.filter((m) => committeeIds.has(m.committee_thomas_id));

  if (parents.length < MIN_COMMITTEES) {
    return NextResponse.json({
      ok: false,
      reason: `only ${parents.length} committees in the source; nothing written`,
    });
  }
  if (members.length < MIN_MEMBERSHIPS) {
    return NextResponse.json({
      ok: false,
      reason: `only ${members.length} membership rows in the source; nothing written`,
    });
  }

  const admin = getAdminClient();
  const stamp = (rows) => rows.map((r) => ({ ...r, synced_at: runStart }));

  try {
    await upsertChunks(admin, 'congress_committees', stamp(parents), 'thomas_id');
    await upsertChunks(admin, 'congress_committees', stamp(subs), 'thomas_id');
    await upsertChunks(
      admin,
      'congress_committee_members',
      stamp(members),
      'committee_thomas_id,bioguide_id',
    );
  } catch (e) {
    return NextResponse.json({ ok: false, reason: `write failed: ${e?.message || e}` });
  }

  /* Both writes succeeded: drop what this run did not see. */
  const { count: removedSeats, error: mErr } = await admin
    .from('congress_committee_members')
    .delete({ count: 'exact' })
    .lt('synced_at', runStart);
  const { count: removedSubs, error: sErr } = await admin
    .from('congress_committees')
    .delete({ count: 'exact' })
    .eq('is_subcommittee', true)
    .lt('synced_at', runStart);
  const { count: removedParents, error: pErr } = await admin
    .from('congress_committees')
    .delete({ count: 'exact' })
    .lt('synced_at', runStart);
  const errors = [mErr, sErr, pErr].filter(Boolean).map((e) => e.message);

  // The dimension hubs summarise this table.
  if (members.length) revalidateTag('hubs');

  return NextResponse.json({
    ok: errors.length === 0,
    committees: parents.length,
    subcommittees: subs.length,
    memberships: members.length,
    skippedMemberships: allMembers.length - members.length,
    removed: {
      memberships: removedSeats || 0,
      committees: (removedSubs || 0) + (removedParents || 0),
    },
    via: sources.via,
    errors,
  });
}
