/**
 * Senate Lobbying Disclosure Act (LDA) API client — SERVER ONLY.
 *
 * Official API: https://lda.gov/api/v1/  (the new unified host; the old
 * lda.senate.gov is deprecated and sunsets 2026-07-31). Key: Vercel env var
 * `Lobbyingdisclosuregov` (case-sensitive). Sent as an `Authorization: Token
 * <key>` HEADER — never a query param, never exposed client-side (no 'use
 * client'; imported only by cron / API routes / server libs).
 *
 * Rate limit: 120 requests/minute with a key (15/min anonymous). Callers pass a
 * `budget` so a single ingest run stays under the cap; the constants
 * (vocabulary) endpoints don't count toward the limit. Pagination is page +
 * page_size (default 25). Cache aggressively — only the cron and the routes'
 * live-fallback path hit this, never per user request.
 *
 * HOST NOTE: `LDA_BASE` is the ONE swappable constant. lda.gov could not be
 * reached from the build sandbox (restricted egress), so if lda.gov is not yet
 * live in production, flip LDA_BASE to the lda.senate.gov fallback below.
 */

// Primary (new unified host). Swap to the fallback if lda.gov isn't live yet.
export const LDA_BASE = 'https://lda.gov/api/v1';
// eslint-disable-next-line no-unused-vars
const LDA_BASE_FALLBACK = 'https://lda.senate.gov/api/v1'; // TODO: use if lda.gov 404s

const DEFAULT_TIMEOUT_MS = 12000;

/** Request-time read so a key rotation reaches running lambdas. */
export function getLdaKey() {
  // `Lobbyingdisclosuregov` is the confirmed (case-sensitive) Vercel env var.
  return (
    process.env.Lobbyingdisclosuregov ||
    process.env.LOBBYINGDISCLOSUREGOV ||
    process.env.LDA_API_KEY ||
    ''
  );
}

export function hasLdaKey() {
  return !!getLdaKey();
}

/** Per-run request budget guard (keeps a run under the 120/min cap). */
export function createLdaBudget(max = 90) {
  let used = 0;
  return {
    get used() {
      return used;
    },
    get remaining() {
      return Math.max(0, max - used);
    },
    take() {
      if (used >= max) throw new Error(`lda: request budget exhausted (${max})`);
      used += 1;
    },
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Core GET with the Token auth header, timeout, and retry/backoff on 429/5xx.
 * @param {string} path e.g. 'filings' or 'filings/<uuid>'
 * @param {object} params query params (page/page_size/filters)
 * @param {{budget?:object, retries?:number}} opts
 * @returns {Promise<{ok:boolean,status:number,data:any,error?:string}>}
 */
export async function ldaGet(path, params = {}, opts = {}) {
  const { budget, retries = 2 } = opts;
  const key = getLdaKey();

  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    clean[k] = v;
  }
  const qs = new URLSearchParams(clean);
  const url = `${LDA_BASE}/${path.replace(/^\//, '').replace(/\/?$/, '/')}${qs.toString() ? `?${qs}` : ''}`;

  const headers = { Accept: 'application/json' };
  if (key) headers.Authorization = `Token ${key}`; // anonymous still works (throttled)

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (budget) budget.take();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(800 * 2 ** attempt);
          continue;
        }
      }
      if (!res.ok) {
        return { ok: false, status: res.status, error: `HTTP ${res.status}`, data: null };
      }
      const data = await res.json();
      return { ok: true, status: 200, data };
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries) {
        await sleep(800 * 2 ** attempt);
        continue;
      }
      return { ok: false, status: 0, error: err?.message || 'fetch failed', data: null };
    }
  }
  return { ok: false, status: 0, error: 'exhausted retries', data: null };
}

/* ── Filings (core) ─────────────────────────────────────────────────────── */

/**
 * List lobbying disclosure filings. All filters map to real LDA query params.
 * @param {{filingYear, filingPeriod, registrantName, registrantId, clientName,
 *   clientId, lobbyistName, filingType, issueCode, governmentEntity, ordering,
 *   page, pageSize}} f
 */
export function listFilings(f = {}, opts) {
  return ldaGet(
    'filings',
    {
      filing_year: f.filingYear,
      filing_period: f.filingPeriod,
      registrant_name: f.registrantName,
      registrant_id: f.registrantId,
      client_name: f.clientName,
      client_id: f.clientId,
      lobbyist_name: f.lobbyistName,
      filing_type: f.filingType,
      lobbying_activity_issue: f.issueCode,
      lobbying_activity_government_entity: f.governmentEntity,
      ordering: f.ordering || '-dt_posted',
      page: f.page || 1,
      page_size: f.pageSize || 25,
    },
    opts,
  );
}

export function getFiling(filingUuid, opts) {
  return ldaGet(`filings/${filingUuid}`, {}, opts);
}

/* ── Registrants / Clients / Lobbyists ──────────────────────────────────── */

export function listRegistrants({ name, page = 1, pageSize = 25 } = {}, opts) {
  return ldaGet('registrants', { registrant_name: name, page, page_size: pageSize }, opts);
}
export function getRegistrant(id, opts) {
  return ldaGet(`registrants/${id}`, {}, opts);
}
export function listClients({ name, page = 1, pageSize = 25 } = {}, opts) {
  return ldaGet('clients', { client_name: name, page, page_size: pageSize }, opts);
}
export function getClient(id, opts) {
  return ldaGet(`clients/${id}`, {}, opts);
}
export function listLobbyists({ name, page = 1, pageSize = 25 } = {}, opts) {
  return ldaGet('lobbyists', { lobbyist_name: name, page, page_size: pageSize }, opts);
}
export function getLobbyist(id, opts) {
  return ldaGet(`lobbyists/${id}`, {}, opts);
}

/* ── Contributions (LD-203) ─────────────────────────────────────────────── */

export function listContributions({ page = 1, pageSize = 25 } = {}, opts) {
  return ldaGet('contributions', { page, page_size: pageSize }, opts);
}

/* ── Constants (filter vocabularies — don't count toward the rate limit) ──── */

export function getIssueConstants(opts) {
  return ldaGet('constants/filing/lobbyingactivityissues', {}, opts);
}
export function getGovernmentEntityConstants(opts) {
  return ldaGet('constants/filing/governmententities', {}, opts);
}
export function getFilingTypeConstants(opts) {
  return ldaGet('constants/filing/filingtypes', {}, opts);
}
export function getContributionItemTypeConstants(opts) {
  return ldaGet('constants/contribution/itemtypes', {}, opts);
}
export function getStateConstants(opts) {
  return ldaGet('constants/general/states', {}, opts);
}
export function getCountryConstants(opts) {
  return ldaGet('constants/general/countries', {}, opts);
}
