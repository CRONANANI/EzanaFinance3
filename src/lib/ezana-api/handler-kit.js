/**
 * Shared pieces for Ezana API handlers (server only, admin client). Every
 * dimension's handler module builds on these so endpoints behave the same:
 *
 *   readPage(table, select, opts, apply)  keyset page over a unique sort
 *   rpcRows(fn, args, mapRow, { limit })  read-only RPC returning rows
 *   rpcDoc(fn, args, mapDoc, notFound)    read-only RPC returning one jsonb doc
 *   insightCache(dimension, name, params, fn)
 *                                         unstable_cache with the dimension's
 *                                         TTL and the api-v1-<dimension> tag
 *   emptyCoverage(rows)                   meta.coverage for pending ingests
 *   withTimeout(promise, ms)              rejects after ms (composite sections)
 *
 * Error rules: a missing function or relation (an unapplied migration) is a
 * 503 not_available; any other database error is a plain Error whose message
 * names the function or table only, which the router turns into a 500 without
 * echoing it to the caller.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ApiError, keysetOr } from './query';

export const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
export const int = (v) => (num(v) == null ? null : Math.round(Number(v)));
export const day = (v) => (v ? String(v).slice(0, 10) : null);
export const endOfDay = (d) => `${d}T23:59:59.999Z`;
export const upper = (v) => (v ? String(v).toUpperCase() : null);
/* Text for ilike: drop PostgREST and LIKE metacharacters. */
export const like = (s) =>
  `%${String(s)
    .replace(/[%_*,()"\\]/g, ' ')
    .trim()}%`;

/** Newest of a list of ISO dates/timestamps, or null. */
export function newestDate(values) {
  let best = null;
  for (const v of values) if (v && (!best || String(v) > String(best))) best = v;
  return best;
}

const MISSING_FN = new Set(['PGRST202', '42883']);
const MISSING_REL = new Set(['42P01', 'PGRST205', 'PGRST200']);

/* A database error that keeps its code, so callers can tell a missing
   relation or function (an unapplied migration) from a real failure. */
export function dbError(name, error) {
  if (MISSING_FN.has(error?.code) || MISSING_REL.has(error?.code)) {
    return new ApiError(
      503,
      'not_available',
      'This endpoint is being provisioned. Try again shortly.',
    );
  }
  const e = new Error(`${name}: ${error?.message || 'query failed'}`);
  e.code = error?.code;
  return e;
}

export async function readPage(
  table,
  select,
  { keys, notNull = [], limit, cursor, dir = 'desc' },
  apply,
) {
  const admin = getAdminClient();
  let qb = admin.from(table).select(select);
  for (const k of notNull) qb = qb.not(k, 'is', null);
  if (apply) qb = apply(qb);
  if (cursor) qb = qb.or(keysetOr(keys, cursor, dir));
  for (const k of keys) qb = qb.order(k, { ascending: dir === 'asc' });
  const { data, error } = await qb.limit(limit + 1);
  if (error) throw dbError(table, error);
  return data || [];
}

/* Call a read-only RPC and map rows. Top-N endpoints (no cursor). Errors
   become 500 with the function name only (never the SQL message). A missing
   function (PGRST202 / 42883) becomes 503 not_available. */
export async function rpcRows(fn, args, mapRow, { limit } = {}) {
  const { data, error } = await getAdminClient().rpc(fn, args);
  if (error) throw dbError(fn, error);
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return { data: (limit ? rows.slice(0, limit) : rows).map(mapRow) };
}

/* jsonb-returning RPC (one document). */
export async function rpcDoc(fn, args, mapDoc, notFound = 'Not found.') {
  const { data, error } = await getAdminClient().rpc(fn, args);
  if (error) throw dbError(fn, error);
  if (data == null || (typeof data === 'object' && !Object.keys(data).length))
    throw new ApiError(404, 'not_found', notFound);
  return { data: mapDoc(data) };
}

/* Coverage note for datasets whose ingest is pending (Phase 0). */
export const emptyCoverage = (rows) =>
  rows && rows.length ? undefined : { rows: 0, note: 'Ingest pending' };

/* Insight TTLs by dimension, in seconds. */
export const INSIGHT_TTL = {
  capitol: 900,
  titans: 900,
  eyes: 21600,
  lighthouse: 21600,
  hive: 60,
  cross: 900,
};

/**
 * Cache an insight computation per normalized params, tagged
 * api-v1-<dimension> so the ingest crons can revalidate it. `params` should
 * hold only what changes the answer (include the delay cutoff when it
 * applies). Cursor reads are never cached.
 */
export function insightCache(dimension, name, params, fn) {
  if (params?.cursor) return fn();
  const key = JSON.stringify(
    Object.keys(params || {})
      .filter((k) => params[k] !== undefined)
      .sort()
      .map((k) => [k, params[k]]),
  );
  return unstable_cache(fn, ['ezana-api-v1', dimension, name, key], {
    revalidate: INSIGHT_TTL[dimension] ?? 900,
    tags: [`api-v1-${dimension}`],
  })();
}

/** Rejects with a timeout error after `ms`; used for composite sections. */
export function withTimeout(promise, ms, label = 'section') {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, reject) => {
      t = setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/** ISO date `days` ago (UTC), never later than the key's delay cutoff. */
export function sinceDays(days, cutoff = null, now = new Date()) {
  const since = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
  return cutoff && cutoff < since ? cutoff : since;
}

/* A tiny path-param guard: 404 unless the value matches. */
export function pathParam(value, re, what) {
  const v = String(value ?? '');
  if (!re.test(v)) throw new ApiError(404, 'not_found', `No ${what} with that id.`);
  return v;
}

export { ApiError, getAdminClient };
