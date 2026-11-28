/**
 * FMP refusal handling with an optional, controlled demonstration mode. SERVER ONLY.
 * (Nov 28 2026; policy tightened in the Sonar 6.4 final integration.)
 *
 * Routes that serve equities and asset pages are wrapped with withFmpSample(handler). Inside a
 * wrapped request, an FMP call that comes back 401, 402 or 403 is either:
 *   - answered with deterministic sample data in FMP's shape, ONLY when this request is
 *     authorized for demonstration data (policy below); the response then declares
 *     `x-ezana-data-state: sample`; or
 *   - left as FMP's refusal, so the route shows its normal unavailable state, and the
 *     response declares `x-ezana-data-state: unavailable`.
 * A route whose FMP calls succeeded declares `live`.
 *
 * Demonstration policy (FMP_SAMPLE_MODE):
 *   off   (default) never serve sample data
 *   demo  serve sample data on refusal only to: preview and development deployments
 *         (VERCEL_ENV other than production), or, in production, signed-in staff (trusted
 *         admin: app_metadata.role 'admin' or the ADMIN_EMAILS allowlist). Never to other
 *         users, never because of anything the client sends.
 *
 * Safety (unchanged): Sonar, crons, trading and quote routes, the public landing quote and
 * anything that writes to the database are never wrapped, so sample values cannot reach
 * research calculations, valuations, orders or stored records. After a refusal FMP is not
 * called again for 10 minutes in this instance; live data returns by itself afterwards.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { sampleForFmpUrl } from './generators';
import { DATA_STATE, DATA_STATE_HEADER } from './state';
import { getAuthContext } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';

const als = new AsyncLocalStorage();
const REFUSED = new Set([401, 402, 403]);
const COOL_MS = 10 * 60 * 1000;
let refusedUntil = 0;
let installed = false;

const isFmp = (url) => /^https:\/\/financialmodelingprep\.com\//.test(url || '');

export function sampleMode(env = process.env) {
  return (env.FMP_SAMPLE_MODE || 'off').toLowerCase() === 'demo' ? 'demo' : 'off';
}

/**
 * Whether this request may receive demonstration data. Decided on the server from the
 * deployment and the verified session; `user` may be passed in tests.
 */
export async function sampleAllowed(request, { env = process.env, user } = {}) {
  if (sampleMode(env) !== 'demo') return false;
  if ((env.VERCEL_ENV || 'development') !== 'production') return true;
  let u = user;
  if (u === undefined) {
    try {
      u = (await getAuthContext(request)).user;
    } catch {
      u = null;
    }
  }
  return Boolean(u && (u.app_metadata?.role === 'admin' || isAdminUser(u)));
}

function refusedResponse() {
  return new Response(JSON.stringify({ error: 'FMP unavailable' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  });
}

function sampleResponse(url, ctx) {
  const body = sampleForFmpUrl(url);
  if (body === undefined) return null;
  ctx.used = true;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', [DATA_STATE_HEADER]: DATA_STATE.SAMPLE },
  });
}

function install() {
  if (installed) return;
  installed = true;
  const original = globalThis.fetch;
  globalThis.fetch = async function fetchWithFmpRefusal(input, init) {
    const ctx = als.getStore();
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (!ctx) return original(input, init);
    if (!isFmp(url)) {
      const res = await original(input, init);
      /* A wrapped route reading another Ezana route (index-history reads index-week) inherits
         that route's declared state, so sample data never passes on as live. */
      const st = res?.headers?.get?.(DATA_STATE_HEADER);
      if (st === DATA_STATE.SAMPLE) ctx.used = true;
      else if (st === DATA_STATE.UNAVAILABLE) ctx.refused = true;
      return res;
    }
    if (Date.now() < refusedUntil) {
      ctx.refused = true;
      return (ctx.allowed && sampleResponse(url, ctx)) || refusedResponse();
    }
    const res = await original(input, init);
    if (!REFUSED.has(res.status)) {
      ctx.live = true;
      return res;
    }
    refusedUntil = Date.now() + COOL_MS;
    ctx.refused = true;
    return (ctx.allowed && sampleResponse(url, ctx)) || res;
  };
  for (const k of Object.keys(original || {})) {
    try {
      globalThis.fetch[k] = original[k];
    } catch {
      /* read-only */
    }
  }
  /* Keep Next.js's patched-fetch marker so it does not patch over this wrapper. */
  if (original?.__nextPatched) globalThis.fetch.__nextPatched = true;
}

/** Is a refusal currently remembered? */
export function fmpRefusedRecently() {
  return Date.now() < refusedUntil;
}

/** Test hook. */
export function resetFmpRefusal() {
  refusedUntil = 0;
}

/** The data state a finished context declares. */
export function stateOfContext(ctx) {
  if (ctx.used) return DATA_STATE.SAMPLE;
  if (ctx.refused) return DATA_STATE.UNAVAILABLE;
  return DATA_STATE.LIVE;
}

/** Wrap a route handler: FMP refusals inside it follow the demonstration policy. */
export function withFmpSample(handler, { allow = sampleAllowed } = {}) {
  install();
  return async (...args) => {
    const ctx = { used: false, refused: false, live: false, allowed: false };
    ctx.allowed = await Promise.resolve(allow(args[0])).catch(() => false);
    const res = await als.run(ctx, () => handler(...args));
    if (res instanceof Response) {
      try {
        res.headers.set(DATA_STATE_HEADER, stateOfContext(ctx));
        /* Never let a CDN or browser keep sample or refusal answers once live data is back. */
        if (ctx.used || ctx.refused) res.headers.set('cache-control', 'no-store');
      } catch {
        /* immutable headers */
      }
    }
    return res;
  };
}

/** Run a function under the policy for `request`; reports the resulting data state. */
export async function runWithFmpSample(fn, { request = null, allow = sampleAllowed } = {}) {
  install();
  const ctx = { used: false, refused: false, live: false, allowed: false };
  ctx.allowed = await Promise.resolve(allow(request)).catch(() => false);
  const value = await als.run(ctx, fn);
  return { value, state: stateOfContext(ctx), sample: ctx.used };
}
