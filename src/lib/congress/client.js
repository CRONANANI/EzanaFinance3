/**
 * Congress.gov API client — SERVER ONLY.
 *
 * Official API: https://api.congress.gov/v3/  (docs: LibraryOfCongress/api.congress.gov)
 * Key: Vercel env var `datagovapi` (get one at api.data.gov). NEVER exposed
 * client-side — this module must only be imported by server code (cron, API
 * routes, server libs). It has no 'use client'.
 *
 * Rate limit: 5,000 requests/hour. Callers pass a `budget` object so a single
 * ingest run stays well under the cap; every fetch decrements it and throws
 * once exhausted. Pagination default 20, max 250 (limit/offset). Incremental
 * sync uses sort=updateDate+desc.
 */

const BASE = 'https://api.congress.gov/v3';
const DEFAULT_TIMEOUT_MS = 9000;

/** Request-time read so a key rotation reaches running lambdas. */
export function getCongressKey() {
  // `datagovapi` is the confirmed Vercel env var name (api.data.gov key).
  return process.env.datagovapi || process.env.DATAGOVAPI || process.env.CONGRESS_API_KEY || '';
}

export function hasCongressKey() {
  return !!getCongressKey();
}

/** A simple per-run request budget guard (keeps a run under the 5k/hr cap). */
export function createRequestBudget(max = 400) {
  let used = 0;
  return {
    get used() {
      return used;
    },
    get remaining() {
      return Math.max(0, max - used);
    },
    take() {
      if (used >= max) throw new Error(`congress: request budget exhausted (${max})`);
      used += 1;
    },
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Core keyed GET with timeout + retry/backoff on 429/5xx.
 * @param {string} path e.g. 'bill/118/hr/1/actions'
 * @param {object} params query params (merged with api_key + format=json)
 * @param {{budget?:object, retries?:number}} opts
 */
export async function congressGet(path, params = {}, opts = {}) {
  const key = getCongressKey();
  if (!key) throw new Error('congress: missing datagovapi key');
  const { budget, retries = 2 } = opts;

  const qs = new URLSearchParams({ format: 'json', ...params, api_key: key });
  const url = `${BASE}/${path.replace(/^\//, '')}?${qs.toString()}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (budget) budget.take();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(400 * 2 ** attempt);
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
        await sleep(400 * 2 ** attempt);
        continue;
      }
      return { ok: false, status: 0, error: err?.message || 'fetch failed', data: null };
    }
  }
  return { ok: false, status: 0, error: 'exhausted retries', data: null };
}

/* ── typed endpoint helpers ─────────────────────────────────────────────── */

/** Latest / updated bills for a Congress (incremental sync uses sort=updateDate+desc). */
export function listBills({ congress, limit = 100, offset = 0, sort = 'updateDate+desc' }, opts) {
  const path = congress ? `bill/${congress}` : 'bill';
  return congressGet(path, { limit, offset, sort }, opts);
}

export function getBill(congress, type, number, opts) {
  return congressGet(`bill/${congress}/${String(type).toLowerCase()}/${number}`, {}, opts);
}
export function getBillActions(congress, type, number, opts) {
  return congressGet(
    `bill/${congress}/${String(type).toLowerCase()}/${number}/actions`,
    { limit: 250 },
    opts,
  );
}
export function getBillSubjects(congress, type, number, opts) {
  return congressGet(
    `bill/${congress}/${String(type).toLowerCase()}/${number}/subjects`,
    { limit: 250 },
    opts,
  );
}
export function getBillCosponsors(congress, type, number, opts) {
  return congressGet(
    `bill/${congress}/${String(type).toLowerCase()}/${number}/cosponsors`,
    { limit: 250 },
    opts,
  );
}

/** House roll-call votes (BETA; 118th–119th; legislation-linked only). */
export function listHouseVotes({ congress, limit = 100, offset = 0 } = {}, opts) {
  const path = congress ? `house-vote/${congress}` : 'house-vote';
  return congressGet(path, { limit, offset }, opts);
}

export function listCommitteeMeetings({ congress, limit = 100, offset = 0 } = {}, opts) {
  const path = congress ? `committee-meeting/${congress}` : 'committee-meeting';
  return congressGet(path, { limit, offset, sort: 'updateDate+desc' }, opts);
}

/** Member detail incl. committee assignments (by bioguideId). */
export function getMember(bioguideId, opts) {
  return congressGet(`member/${bioguideId}`, {}, opts);
}
