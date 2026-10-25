/**
 * Tiered application cache.
 *
 *   Tier 1 — in-process memory (per serverless instance): zero-latency, small,
 *            short-lived. Survives only within a single warm function instance.
 *   Tier 2 — Upstash Redis (shared across all instances): enabled when
 *            UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *
 * When Redis isn't configured the cache degrades transparently to memory-only,
 * so the app runs in every environment (local, preview, prod-without-Redis).
 * Every Redis error is swallowed and the caller falls back to recomputation —
 * the cache must never break a request.
 *
 * This sits at the "Cache (Redis)" layer of the architecture: request →
 * cacheGetOrSet → (hit) return | (miss) read replica / primary DB → store.
 */

import { Redis } from '@upstash/redis';

const NAMESPACE = 'ezana';
// Bump CACHE_VERSION (env) to invalidate every key at once after a breaking
// change to cached shapes — cheaper than enumerating keys to delete.
const CACHE_VERSION = process.env.CACHE_VERSION || 'v1';

const MEM_MAX_ENTRIES = Number(process.env.CACHE_MEM_MAX_ENTRIES || 1000);

/* ────────────────────────────── Tier 2: Redis ───────────────────────────── */

let redisClient;
let redisInitialized = false;

function getRedis() {
  if (redisInitialized) return redisClient;
  redisInitialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    /* Never silent in production: without Upstash every cache and the
       Redis rate-limit layer are per instance (reliability audit P2-13). */
    if (process.env.VERCEL_ENV === 'production') {
      console.warn('[cache] UPSTASH_REDIS_REST_URL/TOKEN missing in production; memory-only cache');
      import('@sentry/nextjs')
        .then((Sentry) =>
          Sentry.captureMessage('Upstash Redis not configured in production', { level: 'warning' }),
        )
        .catch(() => {});
    }
    return null;
  }
  try {
    redisClient = new Redis({ url, token });
  } catch (e) {
    console.warn('[cache] Redis init failed; running memory-only:', e?.message);
    redisClient = null;
  }
  return redisClient;
}

/** True when a shared Redis tier is configured. */
export function isRedisEnabled() {
  return !!getRedis();
}

/* ──────────────────────── Tier 1: in-process memory ─────────────────────── */
/* Map preserves insertion order, so the first key is the least-recently-used
   once we re-insert on read — a lightweight LRU without a dependency. */

const mem = new Map();

function memGet(key) {
  const hit = mem.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    mem.delete(key);
    return undefined;
  }
  mem.delete(key);
  mem.set(key, hit); // bump recency
  return hit.value;
}

function memSet(key, value, ttlSeconds) {
  if (mem.size >= MEM_MAX_ENTRIES) {
    const oldest = mem.keys().next().value;
    if (oldest !== undefined) mem.delete(oldest);
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/* ──────────────────────────────── Public API ────────────────────────────── */

function buildKey(key) {
  return `${NAMESPACE}:${CACHE_VERSION}:${key}`;
}

/**
 * Read a cached value (memory first, then Redis). Returns `undefined` on miss.
 * @param {string} key
 * @param {{ memTtlSeconds?: number }} [opts] how long a Redis hit is mirrored in memory
 * @returns {Promise<any|undefined>}
 */
export async function cacheGet(key, { memTtlSeconds = 30 } = {}) {
  const k = buildKey(key);
  const m = memGet(k);
  if (m !== undefined) return m;

  const redis = getRedis();
  if (!redis) return undefined;
  try {
    const hit = unwrap(await redis.get(k)); // @upstash/redis auto-deserializes JSON
    if (!hit) return undefined;
    memSet(k, hit.value, memTtlSeconds);
    return hit.value;
  } catch (e) {
    console.warn('[cache] redis get error:', e?.message);
    return undefined;
  }
}

/**
 * Write a value into both tiers.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds Redis TTL (and upper bound for the memory mirror)
 * @param {{ memTtlSeconds?: number }} [opts]
 */
export async function cacheSet(key, value, ttlSeconds, { memTtlSeconds } = {}) {
  const k = buildKey(key);
  memSet(k, value, Math.min(memTtlSeconds ?? ttlSeconds, ttlSeconds));
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(k, value, { ex: Math.max(1, Math.floor(ttlSeconds)) });
  } catch (e) {
    console.warn('[cache] redis set error:', e?.message);
  }
}

/**
 * Delete a key from both tiers.
 * @param {string} key
 */
export async function cacheDel(key) {
  const k = buildKey(key);
  mem.delete(k);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(k);
  } catch (e) {
    console.warn('[cache] redis del error:', e?.message);
  }
}

/* ─────────────────────── cache-aside with stampede guard ───────────────── */
/* In-flight producers per key in this instance: concurrent misses share one
   producer call (single-flight). Across instances, a Redis lock
   (SET key:lock NX PX) lets one request refresh while the others serve the
   stale copy (soft TTL) or wait briefly for the fresh one. */
const inflight = new Map();
const ENVELOPE = '__ezc';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wrap(value, ttlSeconds) {
  return { [ENVELOPE]: 1, v: value, soft: Date.now() + ttlSeconds * 1000 };
}
function unwrap(raw) {
  if (raw && typeof raw === 'object' && raw[ENVELOPE] === 1)
    return { value: raw.v, soft: raw.soft };
  return raw === null || raw === undefined ? null : { value: raw, soft: Infinity };
}

async function redisRead(redis, k) {
  try {
    return unwrap(await redis.get(k));
  } catch (e) {
    console.warn('[cache] redis get error:', e?.message);
    return null;
  }
}

async function produceAndStore(key, ttlSeconds, staleSeconds, producer, memTtlSeconds) {
  const fresh = await producer();
  if (fresh === undefined) return fresh;
  const k = buildKey(key);
  memSet(k, fresh, Math.min(memTtlSeconds ?? ttlSeconds, ttlSeconds));
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(k, wrap(fresh, ttlSeconds), {
        ex: Math.max(1, Math.floor(ttlSeconds + staleSeconds)),
      });
    } catch (e) {
      console.warn('[cache] redis set error:', e?.message);
    }
  }
  return fresh;
}

/**
 * Cache-aside: return the cached value, or run `producer`, cache its result, and
 * return it. Failures are NOT cached (the producer error propagates so the
 * caller can decide how to respond). `undefined` results are not cached.
 *
 * Stampede guard (reliability audit P2-13): one producer per key per
 * instance; with Redis, one refresher across instances while the rest serve
 * the stale value for up to `staleSeconds` past the TTL.
 *
 * @template T
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<T>} producer
 * @param {{ memTtlSeconds?: number, staleSeconds?: number, lockMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function cacheGetOrSet(key, ttlSeconds, producer, opts = {}) {
  const { memTtlSeconds } = opts;
  const staleSeconds = opts.staleSeconds ?? Math.min(ttlSeconds, 300);
  const lockMs = opts.lockMs ?? 10_000;
  const k = buildKey(key);

  const m = memGet(k);
  if (m !== undefined) return m;
  if (inflight.has(k)) return inflight.get(k);

  const run = (async () => {
    const redis = getRedis();
    if (!redis) {
      return produceAndStore(key, ttlSeconds, staleSeconds, producer, memTtlSeconds);
    }
    const hit = await redisRead(redis, k);
    if (hit && Date.now() < hit.soft) {
      memSet(k, hit.value, Math.min(memTtlSeconds ?? Math.min(ttlSeconds, 30), ttlSeconds));
      return hit.value;
    }
    let locked = false;
    try {
      locked = (await redis.set(`${k}:lock`, '1', { nx: true, px: lockMs })) === 'OK';
    } catch {
      locked = true; // Redis trouble: just produce
    }
    if (locked) {
      try {
        return await produceAndStore(key, ttlSeconds, staleSeconds, producer, memTtlSeconds);
      } finally {
        redis.del(`${k}:lock`).catch(() => {});
      }
    }
    /* Someone else is refreshing. Serve the stale copy if there is one,
       otherwise wait briefly for theirs, then fall back to producing. */
    if (hit) return hit.value;
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(150);
      // eslint-disable-next-line no-await-in-loop
      const again = await redisRead(redis, k);
      if (again) return again.value;
    }
    return produceAndStore(key, ttlSeconds, staleSeconds, producer, memTtlSeconds);
  })();

  inflight.set(k, run);
  try {
    return await run;
  } finally {
    inflight.delete(k);
  }
}
