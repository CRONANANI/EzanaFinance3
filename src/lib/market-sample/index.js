/**
 * Temporary sample-data fallback for FMP billing refusals (Nov 28 2026). SERVER ONLY.
 *
 * FMP answers 403 until Ezana's invoice is paid. Routes that serve equities and asset pages
 * are wrapped with withFmpSample(handler). Inside a wrapped request, and only there, an FMP
 * call that comes back 401, 402 or 403 is answered with deterministic sample data in FMP's
 * own shape (generators.js); the route's response carries `x-ezana-sample: 1`, and the
 * dashboard shows a banner saying the figures are sample values.
 *
 * Safety:
 *   - Sonar, crons, trading quotes and anything that writes to the database are never
 *     wrapped, so sample values cannot reach research, orders or stored data
 *   - after a refusal, FMP is not called again for 10 minutes in this instance (no
 *     hammering a persistent authorization failure); then it is tried again, so live data
 *     returns by itself once the invoice is paid
 *   - FMP_SAMPLE_MODE=off disables it entirely (default: on for refusals only)
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { sampleForFmpUrl } from './generators';

const als = new AsyncLocalStorage();
const REFUSED = new Set([401, 402, 403]);
const COOL_MS = 10 * 60 * 1000;
let refusedUntil = 0;
let installed = false;

const isFmp = (url) => /^https:\/\/financialmodelingprep\.com\//.test(url || '');
const enabled = () => (process.env.FMP_SAMPLE_MODE || 'on').toLowerCase() !== 'off';

function sampleResponse(url, ctx) {
  const body = sampleForFmpUrl(url);
  if (body === undefined) return null;
  ctx.used = true;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-ezana-sample': '1' },
  });
}

function install() {
  if (installed) return;
  installed = true;
  const original = globalThis.fetch;
  globalThis.fetch = async function fetchWithFmpSample(input, init) {
    const ctx = als.getStore();
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (!ctx || !isFmp(url) || !enabled()) return original(input, init);
    if (Date.now() < refusedUntil) {
      const s = sampleResponse(url, ctx);
      if (s) return s;
      return new Response(JSON.stringify({ error: 'FMP unavailable' }), { status: 403 });
    }
    const res = await original(input, init);
    if (!REFUSED.has(res.status)) return res;
    refusedUntil = Date.now() + COOL_MS;
    return sampleResponse(url, ctx) || res;
  };
  /* Keep Next.js's patched-fetch markers so it does not patch over this wrapper. */
  for (const k of Object.keys(original || {})) {
    try {
      globalThis.fetch[k] = original[k];
    } catch {
      /* read-only */
    }
  }
  if (original?.__nextPatched) globalThis.fetch.__nextPatched = true;
}

/** Is a refusal currently remembered (for the status endpoint)? */
export function fmpRefusedRecently() {
  return Date.now() < refusedUntil;
}

/** Wrap a route handler so FMP refusals inside it are answered with sample data. */
export function withFmpSample(handler) {
  install();
  return async (...args) => {
    const ctx = { used: false };
    const res = await als.run(ctx, () => handler(...args));
    if (ctx.used && res instanceof Response) {
      try {
        res.headers.set('x-ezana-sample', '1');
        /* Never let a CDN or browser keep sample values once live data is back. */
        res.headers.set('cache-control', 'no-store');
      } catch {
        /* immutable headers */
      }
    }
    return res;
  };
}

/** Run a function in a sample-enabled context and report whether sample data was used. */
export async function runWithFmpSample(fn) {
  install();
  const ctx = { used: false };
  const value = await als.run(ctx, fn);
  return { value, sample: ctx.used };
}
