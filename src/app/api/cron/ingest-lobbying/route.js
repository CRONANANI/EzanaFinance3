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
import { validateBatch, topCanonicalMerges } from '@/lib/lobbying/quality';
import { bucketsForFiling, issueBucket } from '@/lib/lobbying/entities';

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
  // Primary: Vercel cron auto-injects `Authorization: Bearer $CRON_SECRET`.
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  // Fallback: `?key=$CRON_SECRET` for cron setups that can't send a custom
  // header (e.g. some Vercel plans). Same secret; query params can appear in
  // access logs, so the header path is preferred where available.
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
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
    // strict boolean, never null — a null here would be excluded by the
    // top-spenders `is_registration = false` predicate even for real reports
    is_registration: n.isRegistration === true,
    registrant_name: n.registrant,
    registrant_id: n.registrantId,
    client_name: n.client,
    client_id: n.clientId,
    client_description: n.clientDescription,
    issues: n.issues,
    entities: n.entities,
    entity_buckets: bucketsForFiling(n.entities),
    issue_buckets: [...new Set((n.issues || []).map((it) => issueBucket(it.display || it.code)))],
    lobbyists: n.lobbyists,
    lobbyist_count: n.lobbyistCount,
    document_url: n.url,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Data-quality gate before load: validate/repair the batch, then upsert only the
 * good rows. A structurally-broken batch is rejected (skip the load) so a
 * truncated/garbage pull never overwrites the previous good cache.
 * @returns {{ ok:boolean, loaded:number, reason:string|null, flags:object }}
 */
async function loadFilings(admin, mappedRows) {
  const v = validateBatch(mappedRows);
  if (!v.ok) return { ok: false, loaded: 0, reason: v.reason, flags: v.flags };
  if (!v.load.length) return { ok: true, loaded: 0, reason: null, flags: v.flags };
  const { error } = await admin.from('lobbying_filings').upsert(v.load, { onConflict: 'uuid' });
  if (error) return { ok: false, loaded: 0, reason: error.message, flags: v.flags };
  return { ok: true, loaded: v.load.length, reason: null, flags: v.flags };
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
async function backfillQuarter(
  admin,
  budget,
  { year, quarter, state },
  maxPages,
  errors,
  mergeSink,
) {
  const periodCode = QUARTER_PERIOD_CODE[quarter];
  let lastPage = state?.last_page || 0;
  let totalCount = state?.total_count ?? null;
  let delta = 0;
  let done = false;
  let valReason = null;

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
    const mapped = results.map(mapFilingRow);
    if (mergeSink && mergeSink.length < 4000) mergeSink.push(...mapped);
    const loaded = await loadFilings(admin, mapped);
    if (!loaded.ok) {
      // data-quality gate rejected this batch → skip load, keep good cache, stop
      errors.push(`${year} ${quarter} p${page}: rejected (${loaded.reason})`);
      valReason = loaded.reason;
      break;
    }
    delta += loaded.loaded;
    lastPage = page;
    if (!res.data?.next) {
      done = true;
      break;
    }
  }

  const complete =
    !valReason && (done || (totalCount != null && lastPage * PAGE_SIZE >= totalCount));
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
    last_status: valReason ? 'failed' : 'ok',
    last_reason: valReason,
    last_delta: delta,
    updated_at: new Date().toISOString(),
    _delta: delta,
  };
}

/**
 * Steady-state INCREMENTAL pull for a completed quarter: fetch newest-posted
 * filings and upsert only those newer than the cursor's last_seen_posted, then
 * stop once a page reaches already-known filings. Cheap and current.
 */
async function incrementalQuarter(admin, budget, { year, quarter, state }, maxPages, errors) {
  const periodCode = QUARTER_PERIOD_CODE[quarter];
  const since = state?.last_seen_posted ? Date.parse(state.last_seen_posted) : null;
  let delta = 0;
  let newest = since;

  for (let page = 1; page <= maxPages; page++) {
    if (budget.remaining < 2) break;
    const res = await listFilings(
      {
        filingYear: year,
        filingPeriod: periodCode,
        ordering: '-dt_posted',
        page,
        pageSize: PAGE_SIZE,
      },
      { budget },
    );
    if (!res.ok) {
      errors.push(`${year} ${quarter} inc p${page}: ${res.error}`);
      break;
    }
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    if (!results.length) break;

    const fresh =
      since == null
        ? results
        : results.filter((f) => {
            const t = Date.parse(f.dt_posted);
            return !Number.isNaN(t) && t > since;
          });
    if (fresh.length) {
      const loaded = await loadFilings(admin, fresh.map(mapFilingRow));
      if (!loaded.ok) {
        errors.push(`${year} ${quarter} inc p${page}: rejected (${loaded.reason})`);
        break;
      }
      delta += loaded.loaded;
      for (const f of fresh) {
        const t = Date.parse(f.dt_posted);
        if (!Number.isNaN(t) && (newest == null || t > newest)) newest = t;
      }
    }
    // once this page's oldest row is already known, we've caught up
    const posts = results.map((f) => Date.parse(f.dt_posted)).filter((n) => !Number.isNaN(n));
    const pageMin = posts.length ? Math.min(...posts) : null;
    if (since != null && pageMin != null && pageMin <= since) break;
    if (!res.data?.next) break;
  }

  return {
    year,
    quarter,
    period_code: periodCode,
    total_count: state?.total_count ?? null,
    last_page: state?.last_page || 0,
    complete: true,
    phase: 'incremental',
    last_seen_posted:
      newest != null ? new Date(newest).toISOString() : state?.last_seen_posted || null,
    rows_upserted: (state?.rows_upserted || 0) + delta,
    last_run_at: new Date().toISOString(),
    last_status: 'ok',
    last_reason: null,
    last_delta: delta,
    updated_at: new Date().toISOString(),
    _delta: delta,
  };
}

/**
 * Weekly late/amended re-scan: LDA filings are amended and back-filed constantly,
 * and an amendment may not change dt_posted, so incremental can miss it. This
 * re-pulls the newest `pages` of recent quarters and upserts unconditionally
 * (idempotent on filing_uuid), so amendments overwrite the cached row.
 */
async function rescanQuarter(admin, budget, { year, quarter, state }, pages, errors) {
  const periodCode = QUARTER_PERIOD_CODE[quarter];
  let delta = 0;
  for (let page = 1; page <= pages; page++) {
    if (budget.remaining < 2) break;
    const res = await listFilings(
      {
        filingYear: year,
        filingPeriod: periodCode,
        ordering: '-dt_posted',
        page,
        pageSize: PAGE_SIZE,
      },
      { budget },
    );
    if (!res.ok) {
      errors.push(`${year} ${quarter} rescan p${page}: ${res.error}`);
      break;
    }
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    if (!results.length) break;
    const loaded = await loadFilings(admin, results.map(mapFilingRow));
    if (!loaded.ok) {
      errors.push(`${year} ${quarter} rescan p${page}: rejected (${loaded.reason})`);
      break;
    }
    delta += loaded.loaded;
    if (!res.data?.next) break;
  }
  return {
    year,
    quarter,
    period_code: periodCode,
    total_count: state?.total_count ?? null,
    last_page: state?.last_page || 0,
    complete: state?.complete ?? false,
    phase: state?.phase || 'incremental',
    last_seen_posted: state?.last_seen_posted || null,
    rows_upserted: (state?.rows_upserted || 0) + 0, // rescan overwrites; don't inflate cumulative
    last_run_at: new Date().toISOString(),
    last_status: 'ok',
    last_reason: 'rescan',
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

  const mode = (searchParams.get('mode') || 'auto').toLowerCase();
  const admin = getAdminClient();
  const budget = createLdaBudget(REQUEST_BUDGET);
  const states = await loadStates(admin, targetYears);
  const errors = [];
  const results = [];
  const mergeSink = []; // sample of fetched rows for over-merge visibility

  const persist = async (next) => {
    const { _delta, ...row } = next;
    const { error: persistError } = await admin
      .from('lobbying_ingest_state')
      .upsert(row, { onConflict: 'year,quarter' });
    if (persistError) {
      errors.push(`persist ${row.year} ${row.quarter}: ${persistError.message}`);
    }
    results.push({
      year: row.year,
      quarter: row.quarter,
      phase: row.phase,
      delta: _delta,
      lastPage: row.last_page,
      totalCount: row.total_count,
      complete: row.complete,
    });
  };

  if (mode === 'rescan') {
    // Weekly late/amended re-scan of recent quarters (idempotent overwrite).
    const rescanPages = Math.min(Math.max(Number(searchParams.get('rescanPages')) || 3, 1), 10);
    for (const year of targetYears) {
      for (const quarter of targetQuarters) {
        if (budget.remaining < 3) break;
        const state = states.get(`${year}-${quarter}`) || null;
        await persist(
          await rescanQuarter(admin, budget, { year, quarter, state }, rescanPages, errors),
        );
      }
    }
  } else {
    // Backfill incomplete quarters first (least-covered first), then keep the
    // completed quarters current with a cheap incremental pull.
    const incomplete = [];
    const complete = [];
    for (const year of targetYears) {
      for (const quarter of targetQuarters) {
        const state = states.get(`${year}-${quarter}`) || null;
        (state?.complete ? complete : incomplete).push({ year, quarter, state });
      }
    }
    incomplete.sort((a, b) => (a.state?.last_page || 0) - (b.state?.last_page || 0));

    for (const it of incomplete) {
      errors.push(
        `cursor-read ${it.year}-${it.quarter}: state=${it.state ? `last_page=${it.state.last_page}` : 'NULL(miss)'}`,
      );
    }

    for (const item of incomplete) {
      if (budget.remaining < 3) break;
      await persist(await backfillQuarter(admin, budget, item, pagesPerQuarter, errors, mergeSink));
    }
    for (const item of complete) {
      if (budget.remaining < 3) break;
      await persist(await incrementalQuarter(admin, budget, item, 3, errors));
    }
  }

  const constantsUpserted = await refreshConstants(admin, budget);

  // Over-merge visibility: log the biggest canonical merges so a bad merge
  // (two distinct companies collapsed) is spot-checkable in run logs.
  const topMerges = topCanonicalMerges(mergeSink, 'client');
  if (topMerges.length) {
    console.warn('[ingest-lobbying] top canonical client merges:', JSON.stringify(topMerges));
  }

  return NextResponse.json({
    ok: true,
    mode,
    quarters: results,
    filingsUpserted: results.reduce((s, r) => s + (r.delta || 0), 0),
    constantsUpserted,
    requestsUsed: budget.used,
    topMerges,
    errors: errors.slice(0, 12),
  });
}
