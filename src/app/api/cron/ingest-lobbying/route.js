import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import {
  hasLdaKey,
  createLdaBudget,
  listFilings,
  getIssueConstants,
  getGovernmentEntityConstants,
  getFilingTypeConstants,
} from '@/lib/lobbying/client';
import { normalizeFiling, normalizeConstants } from '@/lib/lobbying/normalize';
import { normalizeQuarter, QUARTERS, QUARTER_PERIOD_CODE } from '@/lib/lobbying/period';

/**
 * Resumable, per-quarter ingest of Senate LDA filings into Supabase.
 *
 * LDA files tens of thousands of filings per quarter — far more than one
 * 120/min run can pull — so this walks each (year, quarter) toward completeness
 * ACROSS runs, persisting a cursor in `lobbying_ingest_state`. Each run advances
 * the least-covered quarters a bounded number of pages (respecting the request
 * budget), records progress, then stops; the next run resumes where it left off.
 * Idempotent: filings upsert on filing_uuid, so re-runs never duplicate.
 *
 * Auth: CRON_SECRET bearer. Server-only LDA key.
 *   curl .../api/cron/ingest-lobbying -H "Authorization: Bearer $CRON_SECRET"
 * Params: ?years=2025,2024,2026 ?quarters=q1,q2 ?pageSize=100 ?pagesPerQuarter=6
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_YEARS = [2025, 2024, 2026];
const PAGE_SIZE = 100; // LDA page_size cap
const REQUEST_BUDGET = 110; // stay under 120/min

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

/** Normalized LDA filing → lobbying_filings row (incl. the quarter column). */
function mapFilingRow(f) {
  const n = normalizeFiling(f);
  return {
    uuid: n.uuid,
    filing_year: n.year,
    filing_period: n.period,
    quarter: normalizeQuarter(n.period),
    dt_posted: n.posted,
    amount: n.amount,
    filing_type: n.type,
    filing_type_code: n.typeCode,
    is_registration: n.isRegistration,
    registrant_name: n.registrant,
    registrant_id: n.registrantId,
    client_name: n.client,
    client_id: n.clientId,
    client_description: n.clientDescription,
    issues: n.issues,
    entities: n.entities,
    lobbyists: n.lobbyists,
    lobbyist_count: n.lobbyistCount,
    document_url: n.url,
    synced_at: new Date().toISOString(),
  };
}

async function refreshConstants(admin, budget) {
  const jobs = [
    ['issue', getIssueConstants({ budget })],
    ['entity', getGovernmentEntityConstants({ budget })],
    ['filing_type', getFilingTypeConstants({ budget })],
  ];
  let count = 0;
  for (const [kind, p] of jobs) {
    try {
      const res = await p;
      const results = Array.isArray(res?.data?.results) ? res.data.results : res?.data;
      const rows = normalizeConstants(results || []).map((c) => ({
        kind,
        value: String(c.value),
        label: c.label,
        synced_at: new Date().toISOString(),
      }));
      if (rows.length) {
        const { error } = await admin
          .from('lobbying_constants')
          .upsert(rows, { onConflict: 'kind,value' });
        if (!error) count += rows.length;
      }
    } catch {
      /* skip this vocab on error */
    }
  }
  return count;
}

/** Load existing cursor rows for the targets, keyed by `${year}-${quarter}`. */
async function loadStates(admin, years) {
  const { data } = await admin.from('lobbying_ingest_state').select('*').in('year', years);
  const map = new Map();
  for (const r of data || []) map.set(`${r.year}-${r.quarter}`, r);
  return map;
}

/**
 * Advance ONE (year, quarter) during backfill: fetch up to `maxPages` pages from
 * the cursor's last_page, upsert them, and return the updated cursor state.
 */
async function backfillQuarter(admin, budget, { year, quarter, state }, maxPages, errors) {
  const periodCode = QUARTER_PERIOD_CODE[quarter];
  let lastPage = state?.last_page || 0;
  let totalCount = state?.total_count ?? null;
  let delta = 0;
  let done = false;

  for (let i = 0; i < maxPages; i++) {
    if (budget.remaining < 2) break;
    const page = lastPage + 1;
    const res = await listFilings(
      {
        filingYear: year,
        filingPeriod: periodCode,
        ordering: 'filing_uuid',
        page,
        pageSize: PAGE_SIZE,
      },
      { budget },
    );
    if (!res.ok) {
      errors.push(`${year} ${quarter} p${page}: ${res.error}`);
      break;
    }
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    if (typeof res.data?.count === 'number') totalCount = res.data.count;
    if (!results.length) {
      done = true;
      break;
    }
    const rows = results.map(mapFilingRow).filter((r) => r.uuid);
    if (rows.length) {
      const { error } = await admin.from('lobbying_filings').upsert(rows, { onConflict: 'uuid' });
      if (error) {
        errors.push(`${year} ${quarter} p${page}: ${error.message}`);
        break;
      }
      delta += rows.length;
    }
    lastPage = page;
    if (!res.data?.next) {
      done = true;
      break;
    }
  }

  const complete = done || (totalCount != null && lastPage * PAGE_SIZE >= totalCount);
  return {
    year,
    quarter,
    period_code: periodCode,
    total_count: totalCount,
    last_page: lastPage,
    complete,
    phase: complete ? 'incremental' : 'backfill',
    rows_upserted: (state?.rows_upserted || 0) + delta,
    last_run_at: new Date().toISOString(),
    last_status: 'ok',
    last_reason: null,
    last_delta: delta,
    updated_at: new Date().toISOString(),
    _delta: delta,
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasLdaKey()) {
    return NextResponse.json(
      { ok: false, error: 'LDA key (Lobbyingdisclosuregov) not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const years = (searchParams.get('years') || '')
    .split(',')
    .map((y) => Number(y.trim()))
    .filter((y) => Number.isFinite(y) && y > 2000);
  const targetYears = years.length ? years : DEFAULT_YEARS;
  const quarters = (searchParams.get('quarters') || '')
    .split(',')
    .map((q) => q.trim().toLowerCase())
    .filter((q) => QUARTERS.includes(q));
  const targetQuarters = quarters.length ? quarters : QUARTERS;
  const pagesPerQuarter = Math.min(
    Math.max(Number(searchParams.get('pagesPerQuarter')) || 6, 1),
    40,
  );

  const admin = getAdminClient();
  const budget = createLdaBudget(REQUEST_BUDGET);
  const states = await loadStates(admin, targetYears);
  const errors = [];
  const results = [];

  // Build the work list: incomplete (year, quarter) first, least-covered first
  // so backfill spreads evenly. (Incremental maintenance of complete quarters
  // is added in the steady-state pass — this pass drives backfill to done.)
  const work = [];
  for (const year of targetYears) {
    for (const quarter of targetQuarters) {
      const state = states.get(`${year}-${quarter}`) || null;
      if (state?.complete) continue; // maintained incrementally elsewhere
      work.push({ year, quarter, state });
    }
  }
  work.sort((a, b) => (a.state?.last_page || 0) - (b.state?.last_page || 0));

  for (const item of work) {
    if (budget.remaining < 3) break;
    const next = await backfillQuarter(admin, budget, item, pagesPerQuarter, errors);
    const { _delta, ...row } = next;
    await admin.from('lobbying_ingest_state').upsert(row, { onConflict: 'year,quarter' });
    results.push({
      year: row.year,
      quarter: row.quarter,
      delta: _delta,
      lastPage: row.last_page,
      totalCount: row.total_count,
      complete: row.complete,
    });
  }

  const constantsUpserted = await refreshConstants(admin, budget);

  return NextResponse.json({
    ok: true,
    mode: 'backfill',
    quarters: results,
    filingsUpserted: results.reduce((s, r) => s + (r.delta || 0), 0),
    constantsUpserted,
    requestsUsed: budget.used,
    errors: errors.slice(0, 12),
  });
}
