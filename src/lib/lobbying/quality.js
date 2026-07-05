/**
 * Lobbying ETL data-quality gates — run in the transform→load step so a broken
 * or anomalous pull never poisons the cache. SERVER ONLY (used by the cron).
 *
 * Philosophy: individually-impossible values are repaired (a negative/absurd
 * amount is nulled, not trusted), structurally-broken batches are REJECTED (skip
 * the load, keep the previous good cache), and soft issues (null client) are
 * flagged but kept. Never silently drop or overwrite good data with garbage.
 */
import { canonicalEntity } from './normalize';

const MAX_PLAUSIBLE_AMOUNT = 2_000_000_000; // $2B single quarterly filing = implausible
const MIN_YEAR = 2000;
const MAX_YEAR = 2035;

/**
 * Validate + repair a batch of mapped lobbying_filings rows.
 * @param {Array} rows rows from mapFilingRow()
 * @returns {{ ok:boolean, reason:string|null, load:Array, flags:object }}
 */
export function validateBatch(rows = []) {
  const flags = {
    input: rows.length,
    nullClient: 0,
    negAmount: 0,
    hugeAmount: 0,
    badYear: 0,
    noUuid: 0,
  };
  const load = [];

  for (const r of rows) {
    if (!r.uuid) {
      flags.noUuid += 1;
      continue; // no primary key → cannot upsert
    }
    const year = Number(r.filing_year);
    if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
      flags.badYear += 1;
      continue; // structurally unusable row
    }
    const out = { ...r };
    const amt = Number(out.amount);
    if (out.amount != null) {
      if (amt < 0) {
        flags.negAmount += 1;
        out.amount = null; // repair: a negative lobbying amount is impossible
      } else if (amt > MAX_PLAUSIBLE_AMOUNT) {
        flags.hugeAmount += 1;
        out.amount = null; // repair: implausible outlier, don't let it skew totals
      }
    }
    if (!out.client_name) flags.nullClient += 1; // flag, but keep the filing
    load.push(out);
  }

  // Structural cliff = a broken pull. Reject so we don't half-load a quarter.
  if (rows.length > 0 && load.length === 0) {
    return { ok: false, reason: 'no valid rows in batch', load: [], flags };
  }
  if (rows.length >= 10 && load.length / rows.length < 0.3) {
    return {
      ok: false,
      reason: `only ${load.length}/${rows.length} rows valid (cliff)`,
      load: [],
      flags,
    };
  }
  return { ok: true, reason: null, load, flags };
}

/**
 * Surface the largest canonical-entity merges so an over-merge (two distinct
 * companies collapsed to one key) is visible/spot-checkable. Returns the keys
 * grouping the most DISTINCT raw names, with samples.
 * @param {Array} rows mapped rows
 * @param {'client'|'registrant'} by which name column to inspect
 */
export function topCanonicalMerges(rows = [], by = 'client') {
  const col = by === 'registrant' ? 'registrant_name' : 'client_name';
  const groups = new Map();
  for (const r of rows) {
    const raw = r[col];
    if (!raw) continue;
    const { key, display } = canonicalEntity(raw);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { key, display, variants: new Set() });
    groups.get(key).variants.add(raw);
  }
  return [...groups.values()]
    .map((g) => ({
      key: g.key,
      display: g.display,
      variants: g.variants.size,
      sample: [...g.variants].slice(0, 4),
    }))
    .filter((g) => g.variants > 3)
    .sort((a, b) => b.variants - a.variants)
    .slice(0, 10);
}
