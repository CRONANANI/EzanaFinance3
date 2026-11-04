/**
 * Sonar research engine: versioned retrieval configurations (Section 9.3).
 *
 * The active config is the row in `sonar_engine_configs` with status
 * 'active' (at most one, enforced by a partial unique index). It is read at
 * most once a minute per instance; any error, or no active row, falls back to
 * the code default (domains.js DEFAULT_CONFIG, v1). Candidates written by
 * recalibration sit at status 'candidate' and never serve traffic until an
 * admin promotes them after the benchmark gate (scripts/sonar-recalibrate.mjs).
 */
import { DEFAULT_CONFIG } from './domains';

let cached = null;
let cachedAt = 0;
const TTL_MS = 60_000;

/** Validate a config's shape before it can serve. */
export function isValidConfig(c) {
  if (!c || typeof c !== 'object' || typeof c.version !== 'string') return false;
  if (!c.weights || typeof c.weights !== 'object') return false;
  /* An empty or near-empty matrix would switch every source off. */
  if (Object.keys(c.weights).length < 5) return false;
  for (const row of Object.values(c.weights)) {
    if (!row || typeof row !== 'object') return false;
    for (const w of Object.values(row)) if (!(Number(w) >= 0 && Number(w) <= 1)) return false;
  }
  return true;
}

export async function loadActiveConfig(admin) {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  let next = DEFAULT_CONFIG;
  try {
    const { data } = await admin
      .from('sonar_engine_configs')
      .select('version, config')
      .eq('kind', 'retrieval')
      .eq('status', 'active')
      .maybeSingle();
    const c = data?.config ? { ...data.config, version: data.version } : null;
    if (isValidConfig(c)) next = c;
  } catch {
    /* the code default serves */
  }
  cached = next;
  cachedAt = Date.now();
  return next;
}
