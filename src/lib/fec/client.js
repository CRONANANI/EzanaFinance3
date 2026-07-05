/**
 * FEC OpenFEC API client — SERVER ONLY.
 *
 * Official API: https://api.open.fec.gov/v1/  (docs: api.open.fec.gov/developers)
 * Key: Vercel env var `campaigndatagov` (an api.data.gov key). NEVER exposed
 * client-side — this module must only be imported by server code (cron, API
 * routes, server libs). It has no 'use client'.
 *
 * Rate limit: ~1,000 requests/hour. Callers pass a `budget` object so a single
 * ingest run stays under the cap; every fetch decrements it and throws once
 * exhausted. Pagination page/per_page (max 100). Default cycle is param-driven
 * (2026). Cache aggressively — this client is only hit by the cron and by the
 * live-fallback path in the API routes, never per user request.
 */

const BASE = 'https://api.open.fec.gov/v1';
const DEFAULT_TIMEOUT_MS = 9000;

/** Request-time read so a key rotation reaches running lambdas. */
export function getFecKey() {
  // `campaigndatagov` is the confirmed Vercel env var name (api.data.gov key).
  return (
    process.env.campaigndatagov || process.env.CAMPAIGNDATAGOV || process.env.FEC_API_KEY || ''
  );
}

export function hasFecKey() {
  return !!getFecKey();
}

/** A simple per-run request budget guard (keeps a run under the ~1k/hr cap). */
export function createFecBudget(max = 300) {
  let used = 0;
  return {
    get used() {
      return used;
    },
    get remaining() {
      return Math.max(0, max - used);
    },
    take() {
      if (used >= max) throw new Error(`fec: request budget exhausted (${max})`);
      used += 1;
    },
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Core keyed GET with timeout + retry/backoff on 429/5xx.
 * @param {string} path e.g. 'candidate/H8CA05035/totals'
 * @param {object} params query params (merged with api_key)
 * @param {{budget?:object, retries?:number}} opts
 * @returns {Promise<{ok:boolean,status:number,data:any,error?:string}>}
 */
export async function fecGet(path, params = {}, opts = {}) {
  const key = getFecKey();
  if (!key) throw new Error('fec: missing campaigndatagov key');
  const { budget, retries = 2 } = opts;

  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    clean[k] = v;
  }
  const qs = new URLSearchParams({ ...clean, api_key: key });
  const url = `${BASE}/${path.replace(/^\//, '')}/?${qs.toString()}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (budget) budget.take();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(500 * 2 ** attempt);
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
        await sleep(500 * 2 ** attempt);
        continue;
      }
      return { ok: false, status: 0, error: err?.message || 'fetch failed', data: null };
    }
  }
  return { ok: false, status: 0, error: 'exhausted retries', data: null };
}

/* ── Candidate endpoints ────────────────────────────────────────────────── */

/** Search candidates by name/state/office (used by the name→FEC-id fallback). */
export function searchCandidates({ name, state, office, cycle, page = 1, perPage = 20 }, opts) {
  return fecGet(
    'candidates/search',
    { q: name, state, office, cycle, page, per_page: perPage, sort: '-receipts' },
    opts,
  );
}

/** A candidate's financial totals for a cycle (CandidateTotal schema). */
export function getCandidateTotals(candidateId, { cycle } = {}, opts) {
  return fecGet(`candidate/${candidateId}/totals`, { cycle, per_page: 20 }, opts);
}

export function getCandidate(candidateId, opts) {
  return fecGet(`candidate/${candidateId}`, {}, opts);
}
export function getCandidateHistory(candidateId, { cycle } = {}, opts) {
  return fecGet(`candidate/${candidateId}/history`, { cycle }, opts);
}
export function getCandidateCommittees(candidateId, { cycle } = {}, opts) {
  return fecGet(`candidate/${candidateId}/committees`, { cycle }, opts);
}
export function getCandidateFilings(candidateId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(`candidate/${candidateId}/filings`, { cycle, per_page: perPage }, opts);
}

/** All candidates ranked by receipts for a cycle/office (top-raisers source). */
export function listCandidatesTotals(
  { cycle, office, party, page = 1, perPage = 100, sort = '-receipts' } = {},
  opts,
) {
  return fecGet(
    'candidates/totals',
    { cycle, office, party, page, per_page: perPage, sort, is_active_candidate: true },
    opts,
  );
}

/* ── Committee endpoints ────────────────────────────────────────────────── */

export function getCommitteeTotals(committeeId, { cycle } = {}, opts) {
  return fecGet(`committee/${committeeId}/totals`, { cycle }, opts);
}
export function getCommitteeReports(committeeId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(`committee/${committeeId}/reports`, { cycle, per_page: perPage }, opts);
}

/* ── Schedule A (receipts / donations) aggregates ───────────────────────── */

/** Contribution size buckets for a candidate (ScheduleABySize). */
export function scheduleABySizeByCandidate(candidateId, { cycle } = {}, opts) {
  return fecGet(
    'schedules/schedule_a/by_size/by_candidate',
    { candidate_id: candidateId, cycle, per_page: 10 },
    opts,
  );
}
/** Contribution totals by donor state for a candidate (ScheduleAByState). */
export function scheduleAByStateByCandidate(candidateId, { cycle, perPage = 60 } = {}, opts) {
  return fecGet(
    'schedules/schedule_a/by_state/by_candidate',
    { candidate_id: candidateId, cycle, per_page: perPage, sort: '-total' },
    opts,
  );
}
/** Top employers funding a committee's receipts. */
export function scheduleAByEmployer(committeeId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'schedules/schedule_a/by_employer',
    { committee_id: committeeId, cycle, per_page: perPage, sort: '-total' },
    opts,
  );
}
/** Top occupations funding a committee's receipts. */
export function scheduleAByOccupation(committeeId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'schedules/schedule_a/by_occupation',
    { committee_id: committeeId, cycle, per_page: perPage, sort: '-total' },
    opts,
  );
}

/* ── Schedule B (disbursements / spending) aggregates ───────────────────── */

/** How a committee spends, by purpose. */
export function scheduleBByPurpose(committeeId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'schedules/schedule_b/by_purpose',
    { committee_id: committeeId, cycle, per_page: perPage, sort: '-total' },
    opts,
  );
}
export function scheduleBByRecipient(committeeId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'schedules/schedule_b/by_recipient',
    { committee_id: committeeId, cycle, per_page: perPage, sort: '-total' },
    opts,
  );
}

/* ── Schedule E (independent expenditures — outside money) ───────────────── */

/** Independent expenditures for/against a candidate (support_oppose_indicator). */
export function scheduleEByCandidate(candidateId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'schedules/schedule_e/by_candidate',
    { candidate_id: candidateId, cycle, per_page: perPage },
    opts,
  );
}
export function communicationCostsByCandidate(candidateId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'communication_costs/by_candidate',
    { candidate_id: candidateId, cycle, per_page: perPage },
    opts,
  );
}
export function electioneeringByCandidate(candidateId, { cycle, perPage = 20 } = {}, opts) {
  return fecGet(
    'electioneering/by_candidate',
    { candidate_id: candidateId, cycle, per_page: perPage },
    opts,
  );
}

/* ── Elections context ──────────────────────────────────────────────────── */

export function electionsSummary({ cycle, office, state, district } = {}, opts) {
  return fecGet('elections/summary', { cycle, office, state, district }, opts);
}
