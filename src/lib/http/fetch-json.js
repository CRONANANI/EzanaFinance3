/**
 * Outbound HTTP with a timeout, bounded retries and a per-provider circuit
 * breaker (reliability audit P1-11). Edge-safe (no Node imports).
 *
 *   const data = await fetchJson(url, { headers, timeoutMs: 8000 });
 *   const res = await fetchWithTimeout(url, init, 8000); // raw Response
 *
 * Rules:
 *  - every call has a timeout (AbortSignal.timeout), default 8 s;
 *  - only idempotent requests retry (GET by default, or `idempotent: true`
 *    when the request carries an idempotency key); POSTs never retry;
 *  - 429/5xx and timeouts retry with full-jitter exponential backoff,
 *    honouring Retry-After (capped at 10 s);
 *  - 5 transient failures in a row open the provider's breaker for 30 s;
 *    calls during that window fail fast with code CIRCUIT_OPEN. The breaker
 *    is per instance: enough to stop hammering a dead provider.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const breakers = new Map();

export const BREAKER_THRESHOLD = 5;
export const BREAKER_OPEN_MS = 30_000;

/** Full jitter: uniform in [0, base * 2^attempt]. */
export function backoffMs(attempt, base = 400, rand = Math.random) {
  return Math.round(rand() * base * 2 ** attempt);
}

function retryAfterMs(res) {
  const h = res?.headers?.get?.('retry-after');
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, 10_000);
  const at = Date.parse(h);
  return Number.isFinite(at) ? Math.min(Math.max(0, at - Date.now()), 10_000) : null;
}

function withTimeout(signal, ms) {
  const t = AbortSignal.timeout(ms);
  if (!signal) return t;
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, t]) : signal;
}

/** fetch() with a timeout; keeps the caller's own signal if given. */
export function fetchWithTimeout(url, init = {}, timeoutMs = 8000) {
  return fetch(url, { ...init, signal: withTimeout(init.signal, timeoutMs) });
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

export function breakerState(provider) {
  return breakers.get(provider) || { fails: 0, openUntil: 0 };
}

export function resetBreakers() {
  breakers.clear();
}

const isTransient = (e) =>
  e?.name === 'TimeoutError' ||
  e?.name === 'AbortError' ||
  e?.code === 'ECONNRESET' ||
  e?.cause?.code === 'ECONNRESET' ||
  e?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
  (e instanceof TypeError && /fetch failed/i.test(e.message)) ||
  e?.status >= 500 ||
  e?.status === 429;

/**
 * @returns parsed JSON (or text for non-JSON responses)
 * @throws Error with .status (HTTP error), .body (response text), or
 *         .code = 'CIRCUIT_OPEN'
 */
export async function fetchJson(
  url,
  {
    method = 'GET',
    headers,
    body,
    timeoutMs = 8000,
    idempotent = method === 'GET' || method === 'HEAD',
    retries = idempotent ? 2 : 0,
    provider = hostOf(url),
    retryOn = [429, 500, 502, 503, 504],
    next,
    cache,
  } = {},
) {
  const b = breakerState(provider);
  if (Date.now() < b.openUntil) {
    throw Object.assign(new Error(`${provider} circuit open`), { code: 'CIRCUIT_OPEN', provider });
  }
  const maxRetries = idempotent ? retries : 0;
  let attempt = 0;
  for (;;) {
    try {
      const init = { method, headers, body, signal: AbortSignal.timeout(timeoutMs) };
      if (next) init.next = next;
      else init.cache = cache || 'no-store';
      const res = await fetch(url, init);
      if (retryOn.includes(res.status) && attempt < maxRetries) {
        const wait = retryAfterMs(res) ?? backoffMs(attempt);
        await sleep(wait);
        attempt += 1;
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw Object.assign(new Error(`${provider} ${res.status}`), {
          status: res.status,
          body: text.slice(0, 500),
          provider,
        });
      }
      breakers.set(provider, { fails: 0, openUntil: 0 });
      const type = res.headers.get('content-type') || '';
      return type.includes('json') ? res.json() : res.text();
    } catch (e) {
      const transient = isTransient(e);
      if (transient && attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        attempt += 1;
        continue;
      }
      if (transient) {
        const cur = breakerState(provider);
        const fails = cur.fails + 1;
        breakers.set(
          provider,
          fails >= BREAKER_THRESHOLD
            ? { fails: 0, openUntil: Date.now() + BREAKER_OPEN_MS }
            : { fails, openUntil: cur.openUntil },
        );
      }
      throw e;
    }
  }
}
