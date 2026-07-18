import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  currentFederalFiscalYear,
  isPlausibleAward,
  tickerForRecipient,
  parseIsoYmd,
} from '@/lib/usaspending';

/**
 * Incremental sync of federal contract awards from USAspending into
 * public.usaspending_contract_awards. Pulls awards with action_date SINCE the
 * last successful sync (checkpoint `last_synced_action_date`), paginating fully,
 * and upserts on generated_award_id. History is retained — NO prune (the
 * FY2012-FY2026 backfill lives in /api/cron/backfill-usaspending; this keeps the
 * recent slice fresh). Validation is unchanged; nothing is fabricated.
 *
 * Auth: CRON_SECRET bearer. USAspending is a free public API (no key). Writes use
 * the service-role admin client; public read is RLS-allowed.
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://ezana.world/api/cron/ingest-usaspending
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const USA_SPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const TABLE = 'usaspending_contract_awards';
const PROGRESS = 'ingest_progress';
const JOB = 'incremental-usaspending';
const FETCH_TIMEOUT_MS = 20000;
const UPSERT_BATCH = 100;
const PAGE_LIMIT = 100;
const MAX_PAGE_INDEX = 100; // API cap: page*limit <= 10,000
const POLITE_DELAY_MS = 200;

const pad2 = (n) => String(n).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const generatedId = (r) =>
  r.generated_internal_id || (r.internal_id != null ? String(r.internal_id) : '');
const todayYmd = () => {
  const n = new Date();
  return `${n.getUTCFullYear()}-${pad2(n.getUTCMonth() + 1)}-${pad2(n.getUTCDate())}`;
};

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

function buildBody(start_date, end_date, page) {
  return {
    subawards: false,
    limit: PAGE_LIMIT,
    page,
    order: 'desc',
    sort: 'Start Date',
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      time_period: [{ start_date, end_date }],
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

async function fetchPage(start_date, end_date, page) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USA_SPENDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildBody(start_date, end_date, page)),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, status: res.status, results: [], hasNext: false };
    const json = await res.json();
    return {
      ok: true,
      status: res.status,
      results: Array.isArray(json?.results) ? json.results : [],
      hasNext: json?.page_metadata?.hasNext === true,
    };
  } catch {
    return { ok: false, status: 0, results: [], hasNext: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const syncedAt = new Date().toISOString();
    const nowYear = new Date().getUTCFullYear();
    const end_date = todayYmd();

    // Resolve the incremental cursor: checkpoint → latest action_date already in
    // the table → start of the current fiscal year (first ever run).
    const { data: ck } = await admin.from(PROGRESS).select('*').eq('job', JOB).maybeSingle();
    let cursor = ck?.cursor_date || null;
    if (!cursor) {
      const { data: latest } = await admin
        .from(TABLE)
        .select('action_date')
        .order('action_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      cursor = latest?.action_date || currentFederalFiscalYear().start_date;
    }

    let ingested = 0;
    let skipped = 0;
    let maxSeen = cursor;
    const errors = [];

    // Paginate the [cursor, today] window fully (cap-aware). Overlap at the
    // cursor date is harmless — upsert on generated_award_id is idempotent.
    for (let page = 1; page <= MAX_PAGE_INDEX; page++) {
      // eslint-disable-next-line no-await-in-loop
      const { ok, status, results, hasNext } = await fetchPage(cursor, end_date, page);
      if (!ok) {
        errors.push(`page ${page}: http ${status}`);
        break;
      }
      if (!results.length) break;

      const rows = [];
      for (const r of results) {
        const gid = generatedId(r);
        const recipient = String(r['Recipient Name'] || '').trim();
        if (!gid || !recipient || !isPlausibleAward(r, nowYear)) {
          skipped += 1;
          continue;
        }
        const d = parseIsoYmd(r['Start Date']);
        const action_date = `${d.y}-${pad2(d.mo)}-${pad2(d.d)}`;
        if (action_date > maxSeen) maxSeen = action_date;
        const sym = tickerForRecipient(recipient);
        rows.push({
          generated_award_id: gid,
          award_id_piid: r['Award ID'] || null,
          recipient_name: recipient,
          award_amount: Number(r['Award Amount']),
          awarding_agency: r['Awarding Agency'] || null,
          awarding_sub_agency: r['Awarding Sub Agency'] || null,
          funding_agency: r['Funding Agency'] || null,
          action_date,
          award_type: r['Award Type'] || null,
          ticker: sym === '—' ? null : sym,
          fiscal_year: currentFederalFiscalYear(new Date(`${action_date}T00:00:00Z`)).fyEndYear,
          raw: r,
          synced_at: syncedAt,
        });
      }

      for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
        const batch = rows.slice(i, i + UPSERT_BATCH);
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin.from(TABLE).upsert(batch, { onConflict: 'generated_award_id' });
        if (error) errors.push(`upsert p${page}: ${error.message}`);
        else ingested += batch.length;
      }

      if (results.length < PAGE_LIMIT || !hasNext) break;
      if (page === MAX_PAGE_INDEX) errors.push('hit 10k page cap for the sync window');
      // eslint-disable-next-line no-await-in-loop
      await sleep(POLITE_DELAY_MS);
    }

    // Advance the checkpoint to the newest action_date seen (never backwards).
    await admin.from(PROGRESS).upsert(
      {
        job: JOB,
        cursor_date: maxSeen,
        status: errors.length ? 'error' : 'done',
        detail: { last_run_ingested: ingested, last_run_skipped: skipped, window: [cursor, end_date] },
        updated_at: syncedAt,
      },
      { onConflict: 'job' },
    );

    return NextResponse.json({ ingested, skipped, cursor_from: cursor, cursor_to: maxSeen, errors }, { status: 200 });
  } catch (err) {
    console.error('[cron/ingest-usaspending]', err);
    return NextResponse.json(
      { ingested: 0, skipped: 0, errors: [err instanceof Error ? err.message : String(err)] },
      { status: 500 },
    );
  }
}
