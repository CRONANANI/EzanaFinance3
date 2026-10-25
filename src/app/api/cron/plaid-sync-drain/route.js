/**
 * Every 5 minutes: drain pending_plaid_syncs (queued by the Plaid webhook).
 * Each row is claimed by deleting it (one worker per item); a failed sync is
 * re-queued with attempts + 1 and recorded in failed_jobs after 5 attempts.
 * Up to 25 items per run, 3 at a time.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { syncPlaidItem } from '@/lib/plaid-sync';
import { decryptToken } from '@/lib/crypto/token-cipher';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { recordFailedJob } from '@/lib/cron/failed-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ATTEMPTS = 5;

async function syncOne(admin, row) {
  /* Claim: delete the queue row; whoever deletes it owns the sync. */
  const { data: claimed, error: claimErr } = await admin
    .from('pending_plaid_syncs')
    .delete()
    .eq('plaid_item_db_id', row.plaid_item_db_id)
    .eq('requested_at', row.requested_at)
    .select('plaid_item_db_id');
  if (claimErr) throw new Error(claimErr.message);
  if (!claimed?.length) return 'taken';

  const { data: item, error } = await admin
    .from('plaid_items')
    .select('id, user_id, access_token, institution_id, institution_name, status')
    .eq('id', row.plaid_item_db_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!item || item.status !== 'active' || !item.access_token) return 'inactive';

  try {
    await syncPlaidItem({
      userId: item.user_id,
      accessToken: decryptToken(item.access_token),
      institutionId: item.institution_id,
      institutionName: item.institution_name,
      plaidItemDbId: item.id,
    });
    return 'synced';
  } catch (e) {
    const attempts = (row.attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await recordFailedJob({
        job: 'plaid:sync',
        error: e,
        payload: { plaid_item_db_id: item.id },
        attempts,
      });
    } else {
      const { error: reErr } = await admin.from('pending_plaid_syncs').upsert(
        {
          plaid_item_db_id: item.id,
          webhook_code: row.webhook_code,
          requested_at: new Date().toISOString(),
          attempts,
          last_error: String(e?.message || e).slice(0, 500),
        },
        { onConflict: 'plaid_item_db_id', ignoreDuplicates: true },
      );
      if (reErr) console.error('[plaid-drain] requeue failed:', reErr.message);
    }
    throw e;
  }
}

async function run() {
  const admin = getAdminClient();
  const { data: rows, error } = await admin
    .from('pending_plaid_syncs')
    .select('plaid_item_db_id, webhook_code, requested_at, attempts')
    .order('requested_at', { ascending: true })
    .limit(25);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const counts = { synced: 0, taken: 0, inactive: 0, failed: 0 };
  const errors = [];
  for (let i = 0; i < (rows || []).length; i += 3) {
    // eslint-disable-next-line no-await-in-loop
    const res = await Promise.allSettled(rows.slice(i, i + 3).map((r) => syncOne(admin, r)));
    for (const r of res) {
      if (r.status === 'fulfilled') counts[r.value] += 1;
      else {
        counts.failed += 1;
        errors.push(String(r.reason?.message || r.reason).slice(0, 200));
      }
    }
  }
  return NextResponse.json({ ok: counts.failed === 0, ...counts, errors: errors.slice(0, 5) });
}

export const GET = cronRoute('plaid-sync-drain', run, { ttlSeconds: 290 });
