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
    const v = await redis.get(k); // @upstash/redis auto-deserializes JSON
    if (v === null || v === undefined) return undefined;
    memSet(k, v, memTtlSeconds);
    return v;
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

/**
 * Cache-aside: return the cached value, or run `producer`, cache its result, and
 * return it. Failures are NOT cached (the producer error propagates so the
 * caller can decide how to respond). `undefined` results are not cached.
 *
 * @template T
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<T>} producer
 * @param {{ memTtlSeconds?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function cacheGetOrSet(key, ttlSeconds, producer, opts = {}) {
  const { memTtlSeconds } = opts;
  const cached = await cacheGet(key, {
    memTtlSeconds: memTtlSeconds ?? Math.min(ttlSeconds, 30),
  });
  if (cached !== undefined) return cached;

  const fresh = await producer();
  if (fresh !== undefined) {
    await cacheSet(key, fresh, ttlSeconds, { memTtlSeconds });
  }
  return fresh;
}
