import { NextResponse } from 'next/server';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { createLdaBudget, hasLdaKey, listContributions } from '@/lib/lobbying/client';
import { normalizeContribution, planTargets, resumePoint } from '@/lib/lobbying/contributions';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Resumable ingest of LD-203 contribution reports from lda.gov into
 * lobbying_contribution_reports and lobbying_contribution_items.
 *
 * One cursor per (year, period) in lobbying_contribution_ingest_state. Pages
 * are walked in ascending dt_posted order, which the API keeps stable: new
 * reports land at the end, so one cursor covers both the backfill and the
 * arrivals after it. Each run re-reads the last page it stopped on (it may
 * have been short) and carries on. A period is complete when a page comes
 * back with no `next`; a complete period still gets that one-page tail check
 * for a year after its due date, because late reports keep arriving.
 *
 * Shares the LDA key and its 120 requests/minute with /api/cron/ingest-lobbying,
 * so it is scheduled at :30, after that job's 240s run at :00 has finished.
 *
 * Auth: Bearer cron secret (cronRoute). Params: ?years=2026,2025,2024 ?maxPages=120
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const REQUEST_BUDGET = 300;
const RUN_DEADLINE_MS = 240_000;
const MAX_PAGES_CAP = 400;

function defaultYears(nowMs) {
  const y = new Date(nowMs).getUTCFullYear();
  return [y, y - 1, y - 2];
}

function parseYears(raw, nowMs) {
  const list = String(raw || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 2008 && n <= 2100);
  return list.length ? [...new Set(list)] : defaultYears(nowMs);
}

async function loadStates(admin, years) {
  const { data, error } = await admin
    .from('lobbying_contribution_ingest_state')
    .select('*')
    .in('filing_year', years);
  if (error) throw new Error(`state read: ${error.message}`);
  const map = new Map();
  for (const r of data || []) map.set(`${r.filing_year}-${r.filing_period}`, r);
  return map;
}

/**
 * Upsert one page: reports first (items reference them), then replace the
 * items of those reports so an amended report never keeps stale items.
 */
async function loadPage(admin, results) {
  const syncedAt = new Date().toISOString();
  const rows = results.map((r) => normalizeContribution(r, syncedAt)).filter(Boolean);
  if (!rows.length) return { reports: 0, items: 0 };
  const reports = rows.map((r) => r.report);
  const { error: e1 } = await admin
    .from('lobbying_contribution_reports')
    .upsert(reports, { onConflict: 'filing_uuid' });
  if (e1) throw new Error(`reports upsert: ${e1.message}`);

  const uuids = reports.map((r) => r.filing_uuid);
  const { error: e2 } = await admin
    .from('lobbying_contribution_items')
    .delete()
    .in('filing_uuid', uuids);
  if (e2) throw new Error(`items clear: ${e2.message}`);
  const items = rows.flatMap((r) => r.items);
  if (items.length) {
    const { error: e3 } = await admin.from('lobbying_contribution_items').insert(items);
    if (e3) throw new Error(`items insert: ${e3.message}`);
  }
  return { reports: reports.length, items: items.length };
}

async function advance(admin, budget, target, maxPages, deadlineAt) {
  const { year, period, state } = target;
  const start = resumePoint(state);
  let page = start.page;
  // Rows on pages before `page`, then rows on pages 1..lastPage once read.
  let rowsBeforePage = start.rowsBefore;
  let rowsThrough = state?.rows_fetched || 0;
  let lastPage = state?.last_page || 0;
  let lastPageRows = state?.last_page_rows || 0;
  let totalCount = state?.total_count ?? null;
  let lastSeen = state?.last_seen_posted || null;
  let complete = Boolean(state?.complete);
  let reports = 0;
  let items = 0;
  let pages = 0;
  let failure = null;
  let fatal = false;

  while (pages < maxPages) {
    if (budget.remaining < 2 || Date.now() > deadlineAt) break;
    const res = await listContributions(
      { filingYear: year, filingPeriod: period, ordering: 'dt_posted', page },
      { budget },
    );
    if (!res.ok) {
      failure = `p${page} ${res.error}`.slice(0, 300);
      fatal = Boolean(res.authRejected || res.rateLimited);
      break;
    }
    pages += 1;
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    if (typeof res.data?.count === 'number') totalCount = res.data.count;
    if (!results.length) {
      complete = true;
      break;
    }
    try {
      const loaded = await loadPage(admin, results);
      reports += loaded.reports;
      items += loaded.items;
    } catch (e) {
      failure = `p${page} ${e.message}`.slice(0, 300);
      break;
    }
    lastPage = page;
    lastPageRows = results.length;
    rowsThrough = rowsBeforePage + results.length;
    const newest = results[results.length - 1]?.dt_posted;
    if (newest && (!lastSeen || Date.parse(newest) > Date.parse(lastSeen))) lastSeen = newest;
    if (!res.data?.next) {
      complete = true;
      break;
    }
    rowsBeforePage = rowsThrough;
    page += 1;
  }

  const now = new Date().toISOString();
  return {
    summary: { year, period, pages, reports, items, complete, total: totalCount, failure },
    fatal,
    state: {
      filing_year: year,
      filing_period: period,
      total_count: totalCount,
      last_page: lastPage,
      last_page_rows: lastPageRows,
      rows_fetched: rowsThrough,
      reports_upserted: (state?.reports_upserted || 0) + reports,
      items_upserted: (state?.items_upserted || 0) + items,
      complete,
      last_seen_posted: lastSeen,
      last_run_at: now,
      last_status: failure ? 'failed' : 'ok',
      last_reason: failure,
      updated_at: now,
    },
  };
}

async function run(request) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }
  if (!hasLdaKey()) {
    return NextResponse.json({ ok: false, error: 'LDA key not configured' }, { status: 503 });
  }

  const startedAt = Date.now();
  const deadlineAt = startedAt + RUN_DEADLINE_MS;
  const sp = new URL(request.url).searchParams;
  const years = parseYears(sp.get('years'), startedAt);
  const maxPages = Math.min(Math.max(Number(sp.get('maxPages')) || 120, 1), MAX_PAGES_CAP);

  const admin = getAdminClient();
  const budget = createLdaBudget(REQUEST_BUDGET);
  const periods = [];
  const errors = [];

  let states;
  try {
    states = await loadStates(admin, years);
  } catch (e) {
    console.error('[ingest-lobbying-contributions]', e.message);
    return NextResponse.json({ ok: false, error: 'State unavailable' }, { status: 500 });
  }

  for (const target of planTargets(years, states, startedAt)) {
    if (budget.remaining < 2 || Date.now() > deadlineAt) break;
    const out = await advance(admin, budget, target, maxPages, deadlineAt);
    periods.push(out.summary);
    if (out.summary.failure) {
      errors.push(`${target.year} ${target.period} ${out.summary.failure}`);
      console.error(
        `[ingest-lobbying-contributions] ${target.year} ${target.period} ${out.summary.failure}`,
      );
    }
    const { error } = await admin
      .from('lobbying_contribution_ingest_state')
      .upsert(out.state, { onConflict: 'filing_year,filing_period' });
    if (error) errors.push(`${target.year} ${target.period} state: ${error.message}`);
    if (out.fatal) break;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    years,
    requests: budget.used,
    ms: Date.now() - startedAt,
    periods,
    errors,
  });
}

export const GET = cronRoute('ingest-lobbying-contributions', run, { ttlSeconds: 360 });
