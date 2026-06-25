import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  currentFederalFiscalYear,
  isPlausibleAward,
  tickerForRecipient,
  parseIsoYmd,
} from '@/lib/usaspending';

/**
 * Scheduled ingest: pull a bounded slice of current-fiscal-year federal
 * contract awards from USAspending.gov and upsert the VALIDATED rows into
 * public.usaspending_contract_awards. The public Government Contracts page
 * then reads from Supabase instead of hitting USAspending live.
 *
 * Auth: CRON_SECRET bearer (same pattern as compute-community-pulse).
 * No API key needed — USAspending is a free public API. Writes use the
 * service-role admin client (bypasses RLS); public read is RLS-allowed.
 *
 * Manual seed after deploy:
 *   curl -X GET https://ezana.world/api/cron/ingest-usaspending \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
export const dynamic = 'force-dynamic';

const USA_SPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const FETCH_TIMEOUT_MS = 8000;
const TABLE = 'usaspending_contract_awards';
const UPSERT_BATCH = 100;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

function buildBody(fy, sort, limit) {
  return {
    subawards: false,
    limit,
    page: 1,
    order: 'desc',
    sort,
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      time_period: [{ start_date: fy.start_date, end_date: fy.end_date }],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Awarding Sub Agency',
      'Funding Agency',
      'Start Date',
      'Award Type',
    ],
  };
}

/** One bounded upstream pass (8s timeout). Returns [] on any failure. */
async function fetchPass(fy, sort, limit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USA_SPENDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildBody(fy, sort, limit)),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.results) ? json.results : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const pad2 = (n) => String(n).padStart(2, '0');
const generatedId = (r) =>
  r.generated_internal_id || (r.internal_id != null ? String(r.internal_id) : '');

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const fy = currentFederalFiscalYear();
    const nowYear = new Date().getUTCFullYear();
    const syncedAt = new Date().toISOString();

    // Two bounded passes — biggest by amount + most recent by start date —
    // deduped by the generated award id, for both "largest" and "recent"
    // coverage without mirroring the whole dataset.
    const [byAmount, byDate] = await Promise.all([
      fetchPass(fy, 'Award Amount', 100),
      fetchPass(fy, 'Start Date', 100),
    ]);

    const merged = new Map();
    for (const r of [...byAmount, ...byDate]) {
      const gid = generatedId(r);
      if (gid && !merged.has(gid)) merged.set(gid, r);
    }

    // Validate every record BEFORE upsert — this is where the "$48B / 1993"
    // class of bad row is permanently killed (the DB CHECK constraints are a
    // second backstop).
    let skipped = 0;
    const rows = [];
    for (const r of merged.values()) {
      const gid = generatedId(r);
      const recipient = String(r['Recipient Name'] || '').trim();
      if (!gid || !recipient || !isPlausibleAward(r, nowYear)) {
        skipped++;
        continue;
      }
      const d = parseIsoYmd(r['Start Date']); // isPlausibleAward guarantees this parses
      const sym = tickerForRecipient(recipient);
      rows.push({
        generated_award_id: gid,
        award_id_piid: r['Award ID'] || null,
        recipient_name: recipient,
        award_amount: Number(r['Award Amount']),
        awarding_agency: r['Awarding Agency'] || null,
        awarding_sub_agency: r['Awarding Sub Agency'] || null,
        funding_agency: r['Funding Agency'] || null,
        action_date: `${d.y}-${pad2(d.mo)}-${pad2(d.d)}`,
        award_type: r['Award Type'] || null,
        ticker: sym === '—' ? null : sym,
        fiscal_year: fy.fyEndYear,
        raw: r,
        synced_at: syncedAt,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { ingested: 0, skipped, errors: ['no valid rows returned from USAspending'] },
        { status: 200 },
      );
    }

    const admin = getAdminClient();
    const errors = [];
    let ingested = 0;

    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const batch = rows.slice(i, i + UPSERT_BATCH);
      const { error } = await admin.from(TABLE).upsert(batch, { onConflict: 'generated_award_id' });
      if (error) errors.push(error.message);
      else ingested += batch.length;
    }

    // Conservative prune: drop awards whose action date predates the start of
    // the previous fiscal year, keeping the table lean without touching the
    // current slice.
    const pruneBefore = `${fy.fyEndYear - 2}-10-01`;
    const { error: pruneErr } = await admin.from(TABLE).delete().lt('action_date', pruneBefore);
    if (pruneErr) errors.push(`prune: ${pruneErr.message}`);

    return NextResponse.json({ ingested, skipped, errors }, { status: 200 });
  } catch (err) {
    console.error('[cron/ingest-usaspending]', err);
    return NextResponse.json(
      { ingested: 0, skipped: 0, errors: [err instanceof Error ? err.message : String(err)] },
      { status: 500 },
    );
  }
}
