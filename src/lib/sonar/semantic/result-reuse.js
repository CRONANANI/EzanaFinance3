/**
 * Sonar 6.1 (Nov 28 2026): versioned, permission-aware reuse of completed research
 * computations.
 *
 * What is reused: the composition result (the computed analyses and their evidence) of a
 * completed institutional ownership ranking. Never the written report, never a partial or
 * failed run, never anything computed from a user's or an organization's own data.
 *
 * A stored computation is served only when every one of these matches the new request:
 *   identity      the canonical plan signature, computed after the holder resolved to a
 *                 verified id (an unresolved signature is never a key)
 *   data          the data epoch read live at request time: for a member, the count and
 *                 latest date of their disclosures; for the 13F side, the filer count of
 *                 each recent quarter-end. A new disclosure or a newly loaded filing
 *                 changes the epoch, so the stored result is not used
 *   versions      intent schema, ownership method, composition and reuse versions
 *   parameters    the composer attachments' material parameters (metric, top N)
 *   scope         public data only: no organization context, no query attachments, no
 *                 uploaded files, only capabilities on the public allow-list
 *   access        the access class (guest, member, org) is part of the key, so a result
 *                 computed under one entitlement is never served under another
 *   completeness  stored only when every analysis completed and the intent's fulfillment
 *                 check passed; checked again on read
 *   freshness     a 6 hour ceiling on top of the epoch; "latest", "today", "refresh" or
 *                 "updated" in the question bypasses reuse
 *
 * Storage is the existing `sonar_cache` table through engine/cache.js (no migration).
 */

import {
  CANONICAL_INTENT_VERSION,
  OWNERSHIP_METHOD_VERSION,
  planSignature,
} from './canonical-intent.js';

export const REUSE_VERSION = 'reuse-v1';
export const COMPOSITION_VERSION = 'compose-v1';
export const REUSE_TTL_SECONDS = 6 * 3600;
/** Capabilities whose inputs are public datasets only. */
export const PUBLIC_CAPABILITIES = new Set(['institutional-ownership']);
const MAX_BYTES = 400_000;

const FRESH_RE =
  /\b(?:latest|newest|today|right now|refresh|re-?run|updated|up to date|just filed|this morning)\b/i;

/* FNV-1a 32-bit, twice: a short stable id for a key (not a security hash). */
function fnv(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
function canonicalJson(v) {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`)
      .join(',')}}`;
  return JSON.stringify(v ?? null);
}

/**
 * Whether this request may use (or feed) the reuse store, and why not when it may not.
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function reuseEligibility({ intent, attachments = [], orgId = null, question = '' }) {
  if (!intent || intent.family !== 'institutional_ownership' || intent.unsupported)
    return { ok: false, reason: 'not a supported ownership ranking' };
  if (!planSignature(intent).resolved) return { ok: false, reason: 'holder not resolved' };
  if (orgId) return { ok: false, reason: 'organization scope' };
  if (FRESH_RE.test(String(question))) return { ok: false, reason: 'fresh data requested' };
  if (!attachments.length) return { ok: false, reason: 'nothing to compute' };
  for (const a of attachments) {
    if (a?.kind !== 'analysis') return { ok: false, reason: 'query or file attachment' };
    if (!PUBLIC_CAPABILITIES.has(a.capability)) return { ok: false, reason: 'private capability' };
  }
  return { ok: true, reason: null };
}

/** The material parameters of the attachments (order independent). */
function attachmentParams(attachments) {
  return attachments
    .map((a) => ({ c: a.capability, p: a.params || {} }))
    .sort((x, y) => (x.c < y.c ? -1 : x.c > y.c ? 1 : 0));
}

/**
 * The reuse key. `epoch` is the data epoch read for this request; `access` the access
 * class ('guest' | 'member'). Everything that may change the computed result is in it.
 */
export function reuseKey({ intent, attachments, epoch, access }) {
  const body = canonicalJson({
    sig: planSignature(intent).id,
    v: [REUSE_VERSION, COMPOSITION_VERSION, CANONICAL_INTENT_VERSION, OWNERSHIP_METHOD_VERSION],
    params: attachmentParams(attachments),
    epoch,
    access,
  });
  return `sonar:reuse:${fnv(body, 2166136261)}${fnv(body, 16777619)}`;
}

/* Only plain JSON (no Set, Map, Date, class instances, functions) is stored. */
function isPlainJson(v, depth = 0) {
  if (depth > 40) return false;
  if (v === null || ['string', 'number', 'boolean'].includes(typeof v))
    return typeof v !== 'number' || Number.isFinite(v);
  if (Array.isArray(v)) return v.every((x) => isPlainJson(x, depth + 1));
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype)
    return Object.values(v).every((x) => x === undefined || isPlainJson(x, depth + 1));
  return false;
}

/** True when every computed analysis finished. A partial computation is never stored. */
export function compositionComplete(composition) {
  const results = composition?.results;
  if (!Array.isArray(results) || !results.length) return false;
  if ((composition.failedTasks || []).length) return false;
  return results.every((r) => r && r.status !== 'failed' && r.status !== 'timeout' && !r.failed);
}

/**
 * The entry to store, or null when this composition must not be stored.
 * `fulfilled` is the intent fulfillment result (intentFulfillment(...).met).
 */
export function reuseEntry({ composition, fulfilled, signature, now = Date.now() }) {
  if (!fulfilled || !compositionComplete(composition)) return null;
  if (!isPlainJson(composition)) return null;
  const text = JSON.stringify(composition);
  if (text.length > MAX_BYTES) return null;
  return {
    v: REUSE_VERSION,
    status: 'complete',
    signature,
    computedAt: new Date(now).toISOString(),
    composition: JSON.parse(text),
  };
}

/** The stored composition when the entry is still valid, else null. */
export function validEntry(entry, { signature, now = Date.now() }) {
  if (!entry || entry.v !== REUSE_VERSION || entry.status !== 'complete') return null;
  if (entry.signature !== signature) return null;
  const age = now - Date.parse(entry.computedAt || 0);
  if (!(age >= 0 && age <= REUSE_TTL_SECONDS * 1000)) return null;
  if (!compositionComplete(entry.composition)) return null;
  return entry;
}
