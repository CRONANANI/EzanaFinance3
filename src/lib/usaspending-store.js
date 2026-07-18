/**
 * Read layer for the hosted USAspending contract data.
 *
 * The Government Contracts page reads from the Supabase table
 * `usaspending_contract_awards` (populated by the daily ingest cron) instead
 * of calling USAspending live on every request. This module keeps the
 * Supabase coupling out of the dependency-free `usaspending.js` (whose pure
 * validation/format helpers are unit-tested in isolation) and exposes the
 * full fallback chain:  hosted Supabase  →  live USAspending API  →  static
 * sample (applied by the page).
 *
 * Reads use a plain anon Supabase client (public RLS read is allowed). Only
 * the cron writes, via the service-role admin client.
 */

import { createClient } from '@supabase/supabase-js';
import { formatAmount, formatDisplayDate, getContractAwards } from './usaspending';

const EM_DASH = '—';

let _anon = null;
function getAnonClient() {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  _anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _anon;
}

function clampLimit(limit) {
  return Math.min(Math.max(Number(limit) || 25, 1), 100);
}

/**
 * Read hosted contract awards from Supabase. Returns the page row shape plus
 * the real last-sync timestamp. Resolves to an empty result (not a throw) when
 * the table is empty or unreachable, so the caller can fall through to live.
 *
 * @returns {Promise<{ rows: object[], topRecipients: object[], syncedAt: string|null, error: string|null }>}
 */
export async function getHostedContractAwards({ limit = 25 } = {}) {
  const displayLimit = clampLimit(limit);
  try {
    const supabase = getAnonClient();
    // The table is intentionally bounded (~100–200 rows), so pulling the full
    // set to aggregate topRecipients is cheap.
    const { data, error } = await supabase
      .from('usaspending_contract_awards')
      .select(
        'generated_award_id, award_id_piid, recipient_name, award_amount, awarding_agency, ticker, action_date, synced_at',
      )
      .order('award_amount', { ascending: false })
      .limit(500);

    if (error) return { rows: [], topRecipients: [], syncedAt: null, error: error.message };
    if (!data || data.length === 0) {
      return { rows: [], topRecipients: [], syncedAt: null, error: null };
    }

    const allRows = data.map((r) => ({
      id: r.generated_award_id,
      awardId: r.generated_award_id,
      recipient: r.recipient_name,
      agency: r.awarding_agency || EM_DASH,
      ticker: r.ticker || EM_DASH,
      // Stored numeric/DATE — formatted here, at render.
      amount: formatAmount(r.award_amount),
      amountValue: Number(r.award_amount) || 0,
      date: formatDisplayDate(r.action_date),
    }));

    // topRecipients — aggregate total award value per recipient over the full
    // hosted set, top 5. No fabricated tickers: meta is a real symbol or agency.
    const byRecipient = new Map();
    for (const r of allRows) {
      const cur = byRecipient.get(r.recipient) || {
        name: r.recipient,
        total: 0,
        agency: r.agency,
        ticker: r.ticker,
      };
      cur.total += r.amountValue;
      byRecipient.set(r.recipient, cur);
    }
    const topRecipients = [...byRecipient.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((x) => ({
        name: x.name,
        meta: x.ticker !== EM_DASH ? `${x.ticker} · ${x.agency}` : x.agency,
        value: formatAmount(x.total),
      }));

    const syncedAt = data.reduce(
      (max, r) => (r.synced_at && (!max || r.synced_at > max) ? r.synced_at : max),
      null,
    );

    return { rows: allRows.slice(0, displayLimit), topRecipients, syncedAt, error: null };
  } catch (err) {
    return { rows: [], topRecipients: [], syncedAt: null, error: err?.message || 'supabase error' };
  }
}

/**
 * Full fallback chain for the contracts views: hosted Supabase first, then the
 * live USAspending API. Returns `source: null` only when BOTH are empty/down —
 * the caller then renders the static sample. (Sample lives co-located with the
 * page; we keep it out of the lib.)
 *
 * @returns {Promise<{ rows: object[], topRecipients: object[], source: 'hosted'|'live'|null, syncedAt: string|null }>}
 */
export async function getContractAwardsWithFallback({ limit = 25 } = {}) {
  const hosted = await getHostedContractAwards({ limit });
  if (!hosted.error && hosted.rows.length > 0) {
    return {
      rows: hosted.rows,
      topRecipients: hosted.topRecipients,
      source: 'hosted',
      syncedAt: hosted.syncedAt,
    };
  }

  const live = await getContractAwards({ limit });
  if (!live.error && live.rows.length > 0) {
    return { rows: live.rows, topRecipients: live.topRecipients, source: 'live', syncedAt: null };
  }

  return { rows: [], topRecipients: [], source: null, syncedAt: null };
}

/**
 * Coverage summary for the full hosted table: awards per fiscal year, the total
 * row count, and the min/max fiscal year present (the "FY2012-FY2026" window).
 * Backed by the usaspending_fy_counts() RPC — no rows pulled. Resolves to an
 * empty coverage (not a throw) when the table is empty or the RPC is missing.
 *
 * @returns {Promise<{ fiscalYears: number[], counts: Record<number,number>, total: number, minFy: number|null, maxFy: number|null }>}
 */
export async function getContractCoverage() {
  const empty = { fiscalYears: [], counts: {}, total: 0, minFy: null, maxFy: null };
  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase.rpc('usaspending_fy_counts');
    if (error || !Array.isArray(data) || data.length === 0) return empty;
    const counts = {};
    let total = 0;
    for (const r of data) {
      const fy = Number(r.fiscal_year);
      const n = Number(r.awards) || 0;
      counts[fy] = n;
      total += n;
    }
    const fiscalYears = Object.keys(counts)
      .map(Number)
      .sort((a, b) => a - b);
    return {
      fiscalYears,
      counts,
      total,
      minFy: fiscalYears[0] ?? null,
      maxFy: fiscalYears[fiscalYears.length - 1] ?? null,
    };
  } catch {
    return empty;
  }
}

const SORT_COLUMNS = {
  amount: 'award_amount',
  date: 'action_date',
  recipient: 'recipient_name',
};

/**
 * Server-side paginated + filtered read against the full table using .range()
 * and an exact count — so the page scales past the old ~100-row cap without
 * loading everything. Filters: fiscalYear, agency, recipient (ilike),
 * minAmount/maxAmount. Sort: amount|date|recipient, asc|desc.
 *
 * @returns {Promise<{ rows: object[], total: number, page: number, pageSize: number, error: string|null }>}
 */
export async function getContractAwardsPage(params = {}) {
  const {
    fiscalYear = null,
    agency = '',
    recipient = '',
    minAmount = null,
    maxAmount = null,
    sort = 'amount',
    order = 'desc',
    page = 1,
    pageSize = 50,
  } = params;

  const size = Math.min(Math.max(Number(pageSize) || 50, 1), 200);
  const pg = Math.max(Number(page) || 1, 1);
  const from = (pg - 1) * size;
  const to = from + size - 1;
  const column = SORT_COLUMNS[sort] || SORT_COLUMNS.amount;
  const ascending = String(order).toLowerCase() === 'asc';

  try {
    const supabase = getAnonClient();
    let q = supabase
      .from('usaspending_contract_awards')
      .select(
        'generated_award_id, award_id_piid, recipient_name, award_amount, awarding_agency, awarding_sub_agency, ticker, action_date, fiscal_year, award_type, synced_at',
        { count: 'exact' },
      );

    if (fiscalYear) q = q.eq('fiscal_year', Number(fiscalYear));
    if (agency) q = q.ilike('awarding_agency', `%${String(agency).replace(/[%,]/g, ' ')}%`);
    if (recipient) q = q.ilike('recipient_name', `%${String(recipient).replace(/[%,]/g, ' ')}%`);
    if (minAmount != null && minAmount !== '') q = q.gte('award_amount', Number(minAmount));
    if (maxAmount != null && maxAmount !== '') q = q.lte('award_amount', Number(maxAmount));

    const { data, error, count } = await q.order(column, { ascending }).range(from, to);
    if (error) return { rows: [], total: 0, page: pg, pageSize: size, error: error.message };

    const rows = (data || []).map((r) => ({
      id: r.generated_award_id,
      awardId: r.generated_award_id,
      recipient: r.recipient_name,
      agency: r.awarding_agency || EM_DASH,
      ticker: r.ticker || EM_DASH,
      amount: formatAmount(r.award_amount),
      amountValue: Number(r.award_amount) || 0,
      date: formatDisplayDate(r.action_date),
      fiscalYear: r.fiscal_year,
      awardType: r.award_type || null,
    }));

    return { rows, total: count ?? rows.length, page: pg, pageSize: size, error: null };
  } catch (err) {
    return { rows: [], total: 0, page: pg, pageSize: size, error: err?.message || 'supabase error' };
  }
}

/**
 * Read the pre-aggregated BigQuery rollups from Supabase and shape them for the
 * Government Contracts client (recipients in the same shape aggregate() emits,
 * plus the full coverage window). The heavy lifting happened in the sync cron;
 * this just pulls small rollup tables. Resolves to null when the rollups are
 * empty/unreachable so the page falls back to the raw-award path.
 *
 * @returns {Promise<{ recipients: object[], coverage: object, source: 'rollup' }|null>}
 */
export async function getContractRollups({ fiscalYear = null, limit = 2000 } = {}) {
  try {
    const supabase = getAnonClient();

    let recQ = supabase
      .from('gov_contract_recipient_rollup')
      .select('fiscal_year, recipient_name, awarding_agency, total_amount, award_count')
      .order('total_amount', { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 2000, 1), 5000));
    if (fiscalYear) recQ = recQ.eq('fiscal_year', Number(fiscalYear));

    let agencyQ = supabase
      .from('gov_contract_agency_rollup')
      .select('fiscal_year, awarding_agency, total_amount, award_count');
    if (fiscalYear) agencyQ = agencyQ.eq('fiscal_year', Number(fiscalYear));

    const [{ data: recRows, error: recErr }, { data: agencyRows }, { data: covRows }] =
      await Promise.all([
        recQ,
        agencyQ,
        supabase
          .from('gov_contract_coverage')
          .select('fiscal_year, award_count, total_amount')
          .order('fiscal_year', { ascending: true }),
      ]);

    if (recErr || !Array.isArray(recRows) || recRows.length === 0) return null;

    // Group rollup rows into the client's recipient shape, keyed on the RAW
    // awarding_agency (no regex bucketing — the raw official names are the source
    // of truth: "Department of the Treasury", "Department of the Interior", …).
    const map = new Map();
    for (const r of recRows) {
      const key = r.recipient_name || 'Unknown';
      const agency = r.awarding_agency || 'Unknown';
      const val = Number(r.total_amount) || 0;
      let rec = map.get(key);
      if (!rec) {
        rec = { name: key, agency, ticker: null, total: 0, count: 0, awards: [], _maxAward: 0 };
        map.set(key, rec);
      }
      rec.total += val;
      rec.count += Number(r.award_count) || 0;
      rec.awards.push({
        value: val,
        year: Number(r.fiscal_year),
        agencyName: agency,
        awardId: null,
        date: null,
      });
      if (val >= rec._maxAward) {
        rec._maxAward = val;
        rec.agency = agency; // primary agency = raw agency of the largest rollup row
      }
    }
    const recipients = [...map.values()].map((r) => ({
      ...r,
      avg: r.count ? r.total / r.count : 0,
    }));

    // Full per-(fiscal_year, agency) totals — drives the complete, FY-aware
    // sidebar list and the top-10 spend ranking. TRUE totals (all recipients),
    // not just the top-N kept in the recipient rollup.
    const agencyRollup = (agencyRows || []).map((a) => ({
      fiscalYear: Number(a.fiscal_year),
      agency: a.awarding_agency || 'Unknown',
      total: Number(a.total_amount) || 0,
      count: Number(a.award_count) || 0,
    }));

    // Coverage window from the coverage table.
    const counts = {};
    let total = 0;
    for (const c of covRows || []) {
      const fy = Number(c.fiscal_year);
      const n = Number(c.award_count) || 0;
      counts[fy] = n;
      total += n;
    }
    const fiscalYears = Object.keys(counts)
      .map(Number)
      .sort((a, b) => a - b);
    const coverage = {
      fiscalYears,
      counts,
      total,
      minFy: fiscalYears[0] ?? null,
      maxFy: fiscalYears[fiscalYears.length - 1] ?? null,
    };

    return { recipients, agencyRollup, coverage, source: 'rollup' };
  } catch {
    return null;
  }
}

/** Freshness / source line shown above the table for each data source. */
export function contractFreshnessNote(source, syncedAt) {
  if (source === 'rollup') {
    return 'Federal contract awards via USAspending.gov (U.S. Treasury), aggregated from BigQuery into Ezana rollups.';
  }
  if (source === 'hosted') {
    const when = syncedAt ? formatDisplayDate(syncedAt) : 'recently';
    return `Federal contract data via USAspending.gov (U.S. Treasury) — synced ${when}.`;
  }
  if (source === 'live') {
    return 'Live federal contract data via USAspending.gov (U.S. Treasury), updated daily.';
  }
  return 'Sample of recent awards — full live dataset available in the app.';
}
