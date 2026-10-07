/**
 * API keys (server only). The raw key is shown once and never stored: only
 * its prefix and an HMAC-SHA256 with API_KEY_PEPPER are kept, compared with
 * crypto.timingSafeEqual.
 *
 *   raw:    ezk_live_<8 char id>_<32 random bytes, base62>
 *   prefix: ezk_live_<8 char id>   (unique, used to look the key up)
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const KEY_PATTERN = /^ezk_(live|test)_[A-Za-z0-9]{8}_[A-Za-z0-9]{40,48}$/;

/** n uniformly random base62 characters (rejection sampling, no modulo bias). */
export function base62(n) {
  let out = '';
  while (out.length < n) {
    for (const b of randomBytes(n * 2)) {
      if (b < 248) out += BASE62[b % 62];
      if (out.length === n) break;
    }
  }
  return out;
}

function pepper() {
  const p = process.env.API_KEY_PEPPER;
  if (!p || p.length < 16) {
    throw new Error('API_KEY_PEPPER is not set; API keys cannot be issued or checked.');
  }
  return p;
}

export function pepperConfigured() {
  const p = process.env.API_KEY_PEPPER;
  return !!p && p.length >= 16;
}

/** HMAC-SHA256(pepper, raw) as hex. */
export function hashKey(raw) {
  return createHmac('sha256', pepper()).update(String(raw)).digest('hex');
}

/** 32 random bytes in base62 is 43 characters. */
export function generateKey(env = 'live') {
  if (env !== 'live' && env !== 'test') throw new Error('env must be live or test');
  const prefix = `ezk_${env}_${base62(8)}`;
  const raw = `${prefix}_${base62(43)}`;
  return { raw, prefix, hash: hashKey(raw) };
}

/** The lookup prefix of a raw key, or null when it is not a well-formed key. */
export function prefixOf(raw) {
  if (!KEY_PATTERN.test(String(raw || ''))) return null;
  return raw.split('_').slice(0, 3).join('_');
}

/** Timing-safe comparison of a raw key against a stored hash. */
export function keyMatches(raw, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const a = Buffer.from(hashKey(raw), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Claim link token: 32 random bytes base64url; only its SHA-256 is stored. */
export function newClaimToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: sha256(token) };
}

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

/** `Authorization: Bearer ezk_...` only; keys in query strings are refused. */
export function parseBearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(h.trim());
  if (!m) return null;
  return m[1].startsWith('ezk_') ? m[1] : null;
}

/** Hash of the caller's IP for the request log (never the IP itself). */
export function ipHash(ip) {
  return createHmac('sha256', pepper())
    .update(`ip:${ip || 'unknown'}`)
    .digest('hex')
    .slice(0, 32);
}
