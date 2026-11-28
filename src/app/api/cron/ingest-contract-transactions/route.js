import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { ingestAwardTransactions, TRANSACTION_SYNC_TABLE } from '@/lib/contractors/transactions';

/**
 * Transaction-level federal contract obligations (Sonar 6.5.2). PREPARED, NOT ACTIVE.
 *
 * Runs only when SONAR_CONTRACT_TRANSACTIONS_INGEST=1 (not set) and after
 * docs/sql/sonar-6-5-2/SQL_02_contract_transactions.md is applied. It is not scheduled in
 * vercel.json. Each run takes up to ?limit= awards (default 25, at most 50) of listed
 * companies, largest first, that have no complete transaction sync yet, reads every action
 * of each award from USAspending (free public API, paged, 250 ms between awards) and upserts
 * them on source_transaction_id. Idempotent; a failed page leaves the award incomplete.
 *
 * Auth: CRON_SECRET bearer only (cronRoute).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function run(request) {
  if (process.env.SONAR_CONTRACT_TRANSACTIONS_INGEST !== '1')
    return NextResponse.json({
      ok: true,
      skipped: 'disabled (SONAR_CONTRACT_TRANSACTIONS_INGEST is not 1)',
    });
  const admin = getAdminClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 25));
  const { data: tops, error } = await admin
    .from('company_contract_top_awards')
    .select('generated_award_id, award_amount')
    .order('award_amount', { ascending: false })
    .limit(limit * 8);
  if (error)
    return NextResponse.json({ ok: false, error: 'award list unavailable' }, { status: 502 });
  const ids = [...new Set((tops || []).map((r) => r.generated_award_id).filter(Boolean))];
  const { data: done } = await admin
    .from(TRANSACTION_SYNC_TABLE)
    .select('generated_award_id')
    .in('generated_award_id', ids)
    .eq('complete', true);
  const have = new Set((done || []).map((r) => r.generated_award_id));
  const todo = ids.filter((id) => !have.has(id)).slice(0, limit);
  const out = await ingestAwardTransactions(admin, {
    awardIds: todo,
    enabled: true,
    maxAwards: limit,
  });
  return NextResponse.json({ ...out, requested: todo.length });
}

export const GET = cronRoute('ingest-contract-transactions', run, { ttlSeconds: 600 });
