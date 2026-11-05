import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getAwardFacts } from '@/lib/usaspending';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Award facts for the largest federal awards of every listed company
 * (Nov 4). company_contract_top_awards (weekly, from the BigQuery
 * USAspending corpus) carries each award's obligated amount; Sonar's
 * government-exposure report also needs what an analyst separates from it:
 * the ceiling (base and all options), what has been exercised, the PIID,
 * the purpose, the signature and latest modification dates, how many
 * modifications, and the period of performance. This cron reads them from
 * the USAspending award API into company_contract_award_facts.
 *
 * Each run takes the awards with no facts yet, then the stalest (older than
 * 14 days), up to ?limit= (default 60), four at a time. A full pass over
 * ~12,000 awards takes a few days of hourly runs; after that it only
 * refreshes. Idempotent upserts on generated_award_id.
 *
 * Auth: CRON_SECRET bearer only (cronRoute).
 *   GET /api/cron/enrich-contract-awards[?limit=60][&ticker=PLTR]
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const STALE_DAYS = 14;
const CONCURRENCY = 4;

async function run(request) {
  const started = Date.now();
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 60, 1), 200);
  const ticker = (sp.get('ticker') || '').toUpperCase().replace(/[^A-Z.]/g, '') || null;
  const admin = getAdminClient();
  const errors = [];

  let q = admin
    .from('company_contract_top_awards')
    .select('ticker, generated_award_id')
    .order('award_amount', { ascending: false })
    .limit(5000);
  if (ticker) q = q.eq('ticker', ticker);
  const { data: tops, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const ids = [...new Set((tops || []).map((r) => r.generated_award_id).filter(Boolean))];

  const known = new Map();
  for (let i = 0; i < ids.length; i += 500) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error: e } = await admin
      .from('company_contract_award_facts')
      .select('generated_award_id, synced_at')
      .in('generated_award_id', ids.slice(i, i + 500));
    if (e) return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    for (const r of data || []) known.set(r.generated_award_id, r.synced_at);
  }
  const staleBefore = Date.now() - STALE_DAYS * 864e5;
  const missing = ids.filter((id) => !known.has(id));
  const stale = ids
    .filter((id) => known.has(id) && new Date(known.get(id)).getTime() < staleBefore)
    .sort((a, b) => new Date(known.get(a)) - new Date(known.get(b)));
  const queue = [...missing, ...stale].slice(0, limit);

  const rows = [];
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    if (Date.now() - started > 240_000) break;
    // eslint-disable-next-line no-await-in-loop
    const got = await Promise.all(queue.slice(i, i + CONCURRENCY).map((id) => getAwardFacts(id)));
    for (const f of got) if (f) rows.push({ ...f, synced_at: new Date().toISOString() });
  }
  if (rows.length) {
    const { error: e } = await admin
      .from('company_contract_award_facts')
      .upsert(rows, { onConflict: 'generated_award_id' });
    if (e) errors.push(e.message);
  }
  return NextResponse.json({
    ok: errors.length === 0,
    awards: ids.length,
    missing: missing.length,
    stale: stale.length,
    fetched: rows.length,
    failed: queue.length - rows.length,
    ms: Date.now() - started,
    errors,
  });
}

export const GET = cronRoute('enrich-contract-awards', run, { ttlSeconds: 300 });
