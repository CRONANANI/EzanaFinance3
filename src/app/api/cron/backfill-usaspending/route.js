import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { fyWindow, isPlausibleAward, tickerForRecipient, parseIsoYmd } from '@/lib/usaspending';

/**
 * Resumable historical backfill of federal contract awards, FY2012-FY2026, from
 * USAspending into public.usaspending_contract_awards. Separate from the
 * incremental cron (ingest-usaspending). CRON_SECRET bearer (or ?key=).
 *
 *   Phase 0 — measure, NO writes:
 *     GET /api/cron/backfill-usaspending?mode=count
 *     → per-FY contract counts + 15-year total (for volume/storage sign-off).
 *
 *   Backfill — bounded, resumable:
 *     GET /api/cron/backfill-usaspending?maxPages=25
 *     → processes up to maxPages pages from the checkpoint and returns progress.
 *       Re-invoke until { done: true }. Idempotent (upsert on generated_award_id).
 *
 * USAspending caps spending_by_award pagination at page*limit <= 10,000, so each
 * FY is sub-windowed BY MONTH; a month that still hits the 10k cap is logged
 * (reason 'month_capped') so it can be sub-sliced further. Nothing is fabricated;
 * invalid records are skipped with reasons; DB CHECK constraints are unchanged.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SEARCH_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const COUNT_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award_count/';
const TABLE = 'usaspending_contract_awards';
const PROGRESS = 'ingest_progress';
const JOB = 'backfill-usaspending';

const START_FY = 2012;
const END_FY = 2026;
const PAGE_LIMIT = 100; // API max page size
const MAX_PAGE_INDEX = 100; // API hard cap: page*limit <= 10,000
const MAX_PAGES_DEFAULT = 25;
const UPSERT_BATCH = 100;
const FETCH_TIMEOUT_MS = 20000;
const POLITE_DELAY_MS = 250;
const MAX_RETRIES = 4;

const FIELDS = [
  'Award ID',
  'Recipient Name',
  'Award Amount',
  'Awarding Agency',
  'Awarding Sub Agency',
  'Funding Agency',
  'Start Date',
  'Award Type',
];

const pad2 = (n) => String(n).padStart(2, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const generatedId = (r) =>
  r.generated_internal_id || (r.internal_id != null ? String(r.internal_id) : '');

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

/** POST with timeout + retry/backoff on 429/5xx/network. */
async function postJson(url, body) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_RETRIES) {
          await sleep(500 * 2 ** attempt); // 0.5s, 1s, 2s, 4s
          continue;
        }
        return { ok: false, status: res.status, json: null };
      }
      if (!res.ok) return { ok: false, status: res.status, json: null };
      return { ok: true, status: res.status, json: await res.json() };
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return { ok: false, status: 0, json: null, error: err?.message };
    }
  }
  return { ok: false, status: 0, json: null };
}

const filtersFor = (start_date, end_date) => ({
  award_type_codes: ['A', 'B', 'C', 'D'],
  time_period: [{ start_date, end_date }],
});

/** Calendar window for month `i` (0=Oct(y-1) … 11=Sep(y)) of FY `fyEndYear`,
 *  clamped to today; returns null for a month entirely in the future. */
function monthWindow(fyEndYear, i, now = new Date()) {
  const monthIdx0 = (9 + i) % 12; // 9 = Oct
  const calYear = i <= 2 ? fyEndYear - 1 : fyEndYear;
  const start = `${calYear}-${pad2(monthIdx0 + 1)}-01`;
  const lastDay = new Date(Date.UTC(calYear, monthIdx0 + 1, 0)).getUTCDate();
  const monthEnd = `${calYear}-${pad2(monthIdx0 + 1)}-${pad2(lastDay)}`;
  const today = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  if (start > today) return null;
  return { start_date: start, end_date: monthEnd < today ? monthEnd : today };
}

// ── Phase 0: measure only, no writes ───────────────────────────────────────
async function countMode() {
  const perFy = [];
  let total = 0;
  for (let y = START_FY; y <= END_FY; y++) {
    const w = fyWindow(y);
    // eslint-disable-next-line no-await-in-loop
    const { ok, json, status } = await postJson(COUNT_URL, { filters: filtersFor(w.start_date, w.end_date) });
    const count = ok ? Number(json?.results?.contracts ?? 0) : null;
    perFy.push({ fiscal_year: y, partial: w.partial || false, count, error: ok ? null : `http ${status}` });
    if (count) total += count;
    // eslint-disable-next-line no-await-in-loop
    await sleep(POLITE_DELAY_MS);
  }
  const anomalies = perFy.filter((r) => r.count != null && r.count < 1000).map((r) => r.fiscal_year);
  return NextResponse.json({
    mode: 'count',
    window: `FY${START_FY}-FY${END_FY}`,
    perFy,
    total_contracts: total,
    note: 'Contract awards (types A/B/C/D) per fiscal year. No rows written.',
    anomalies_low_count: anomalies,
  });
}

// ── Validate + shape one API record into a table row (or null) ──────────────
function toRow(r, fyEndYear, nowYear, syncedAt, reasons) {
  const gid = generatedId(r);
  const recipient = String(r['Recipient Name'] || '').trim();
  if (!gid) return bump(reasons, 'missing_id');
  if (!recipient) return bump(reasons, 'missing_recipient');
  if (!isPlausibleAward(r, nowYear)) return bump(reasons, 'implausible_award');
  const d = parseIsoYmd(r['Start Date']);
  const sym = tickerForRecipient(recipient);
  return {
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
    fiscal_year: fyEndYear,
    raw: r,
    synced_at: syncedAt,
  };
}
function bump(reasons, key) {
  reasons[key] = (reasons[key] || 0) + 1;
  return null;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get('mode') === 'count') {
    try {
      return await countMode();
    } catch (err) {
      return NextResponse.json({ mode: 'count', error: err?.message || 'count failed' }, { status: 500 });
    }
  }

  const maxPages = Math.min(Math.max(Number(searchParams.get('maxPages')) || MAX_PAGES_DEFAULT, 1), 200);
  const admin = getAdminClient();
  const syncedAt = new Date().toISOString();
  const nowYear = new Date().getUTCFullYear();

  // Resume from checkpoint (or start at FY2012, month 0, page 1).
  const { data: ck } = await admin.from(PROGRESS).select('*').eq('job', JOB).maybeSingle();
  let fy = ck?.fiscal_year || START_FY;
  let month = ck?.sub_window || 0;
  let page = ck?.page || 1;
  const reasons = { ...(ck?.detail?.reasons || {}) };

  let pagesDone = 0;
  let ingested = 0;
  let skipped = 0;
  const errors = [];

  while (pagesDone < maxPages && fy <= END_FY) {
    const win = monthWindow(fy, month);
    if (!win) {
      // Month in the future → this FY is complete; advance.
      fy += 1;
      month = 0;
      page = 1;
      continue;
    }

    const body = {
      subawards: false,
      limit: PAGE_LIMIT,
      page,
      order: 'desc',
      sort: 'Award Amount',
      filters: filtersFor(win.start_date, win.end_date),
      fields: FIELDS,
    };
    // eslint-disable-next-line no-await-in-loop
    const { ok, status, json } = await postJson(SEARCH_URL, body);
    if (!ok) {
      // Persist checkpoint AS-IS and stop — the next invocation retries this page.
      errors.push(`fy${fy} m${month} p${page}: http ${status}`);
      break;
    }

    const results = Array.isArray(json?.results) ? json.results : [];
    const rows = [];
    for (const r of results) {
      const row = toRow(r, fy, nowYear, syncedAt, reasons);
      if (row) rows.push(row);
      else skipped += 1;
    }
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const batch = rows.slice(i, i + UPSERT_BATCH);
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin.from(TABLE).upsert(batch, { onConflict: 'generated_award_id' });
      if (error) errors.push(`upsert fy${fy} m${month} p${page}: ${error.message}`);
      else ingested += batch.length;
    }

    pagesDone += 1;
    const hasNext = json?.page_metadata?.hasNext === true;
    if (results.length < PAGE_LIMIT || !hasNext) {
      // Month exhausted → next month.
      month += 1;
      page = 1;
      if (month > 11) {
        fy += 1;
        month = 0;
      }
    } else if (page >= MAX_PAGE_INDEX) {
      // Hit the API's 10k pagination ceiling for this month — log and move on.
      reasons.month_capped = (reasons.month_capped || 0) + 1;
      errors.push(`fy${fy} m${month}: hit 10k page cap — sub-slice needed`);
      month += 1;
      page = 1;
      if (month > 11) {
        fy += 1;
        month = 0;
      }
    } else {
      page += 1;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(POLITE_DELAY_MS);
  }

  const done = fy > END_FY;
  await admin.from(PROGRESS).upsert(
    {
      job: JOB,
      fiscal_year: done ? END_FY : fy,
      sub_window: done ? 11 : month,
      page: done ? 1 : page,
      status: done ? 'done' : 'running',
      detail: { reasons, last_run_ingested: ingested, last_run_skipped: skipped },
      updated_at: syncedAt,
    },
    { onConflict: 'job' },
  );

  return NextResponse.json({
    done,
    cursor: { fiscal_year: fy, month, page },
    pages_done: pagesDone,
    ingested,
    skipped,
    reasons,
    errors: errors.slice(0, 20),
  });
}
