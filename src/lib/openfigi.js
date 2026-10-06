/**
 * OpenFIGI CUSIP to ticker mapping: SERVER ONLY.
 *
 * POST https://api.openfigi.com/v3/mapping with an array of jobs
 * { idType: 'ID_CUSIP', idValue, exchCode: 'US' }. Limits (openfigi.com/api
 * documentation, v3):
 *   with an API key:    100 jobs per request, 25 requests per 6 seconds
 *   without an API key:  10 jobs per request, 25 requests per minute
 * We stay under both by spacing requests evenly, and retry once on 429 after
 * the ratelimit-reset interval. The key is optional (OPENFIGI_API_KEY).
 *
 * The pickers below are pure and unit tested by scripts/check-titans.mjs.
 */

const URL_MAPPING = 'https://api.openfigi.com/v3/mapping';

export const OPENFIGI_LIMITS = {
  withKey: { jobsPerRequest: 100, requests: 25, windowMs: 6000 },
  withoutKey: { jobsPerRequest: 10, requests: 25, windowMs: 60000 },
};

export const CUSIP_RE = /^[0-9A-Z]{9}$/;

export function openFigiLimits(hasKey = !!process.env.OPENFIGI_API_KEY) {
  return hasKey ? OPENFIGI_LIMITS.withKey : OPENFIGI_LIMITS.withoutKey;
}

/** 'BRK/B' -> 'BRK.B'; trims and upper-cases; null for empty. */
export function normaliseTicker(t) {
  const s = String(t || '')
    .trim()
    .toUpperCase()
    .replace(/\//g, '.');
  return s || null;
}

/** One mapping job's response -> a sec_cusip_map row (without checked_at). */
export function mapJobResult(cusip, job) {
  const base = {
    cusip,
    ticker: null,
    exch_code: null,
    figi: null,
    name: null,
    security_type: null,
    market_sector: null,
    source: 'openfigi',
  };
  if (job && Array.isArray(job.data) && job.data.length) {
    const pick = job.data.find((d) => d?.marketSector === 'Equity') || job.data[0];
    return {
      ...base,
      ticker: normaliseTicker(pick.ticker),
      exch_code: pick.exchCode || null,
      figi: pick.figi || null,
      name: pick.name || null,
      security_type: pick.securityType || null,
      market_sector: pick.marketSector || null,
      status: 'mapped',
    };
  }
  if (job && job.error) return { ...base, status: 'error' };
  // { warning: 'No identifier found.' } or an empty data array.
  return { ...base, status: 'unmapped' };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Throttled mapper. Returns an object with map(cusips) which resolves to
 * sec_cusip_map rows, one per input CUSIP, in input order.
 */
export function createFigiClient() {
  const key = process.env.OPENFIGI_API_KEY || '';
  const limits = openFigiLimits(!!key);
  const spacing = Math.ceil(limits.windowMs / limits.requests) + 20;
  let last = 0;

  async function post(jobs, retried = false) {
    const wait = last + spacing - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['X-OPENFIGI-APIKEY'] = key;
    const res = await fetch(URL_MAPPING, { method: 'POST', headers, body: JSON.stringify(jobs) });
    if (res.status === 429 && !retried) {
      const reset = Number(res.headers.get('ratelimit-reset'));
      await sleep((Number.isFinite(reset) && reset > 0 ? reset : limits.windowMs / 1000) * 1000);
      return post(jobs, true);
    }
    if (!res.ok) throw new Error(`OpenFIGI HTTP ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body) || body.length !== jobs.length) {
      throw new Error('OpenFIGI: unexpected response shape');
    }
    return body;
  }

  return {
    jobsPerRequest: limits.jobsPerRequest,
    async map(cusips) {
      const jobs = cusips.map((c) => ({ idType: 'ID_CUSIP', idValue: c, exchCode: 'US' }));
      const body = await post(jobs);
      return cusips.map((c, i) => mapJobResult(c, body[i]));
    },
  };
}
