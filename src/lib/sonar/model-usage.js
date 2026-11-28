/**
 * Model usage and cost for one run (Nov 28 2026): the provider's recorded calls
 * (collectUsage in llm-providers.js) summed at list price, split into the deterministic
 * half (query understanding, resolution) and the synthesis, per role and per model, with
 * any call whose served model differs from the requested one. Used by the model benchmark
 * and by production run telemetry. Pure.
 */
import { callCostUsd } from './model-routing.js';

function round(x, d = 3) {
  return Math.round(x * 10 ** d) / 10 ** d;
}

/* Legs that belong to the deterministic half: their model calls (query understanding)
   are not what is being compared and are reported apart. */
const DETERMINISTIC_LEGS = new Set(['understand', 'resolve']);

/**
 * Sums recorded provider calls into cost and token totals, split into the synthesis
 * (the part under test) and the deterministic half, with per-role and per-model rows.
 * Flags any call whose served model differs from the requested one (the silent Haiku
 * fallback), so a mislabelled cell cannot pass.
 */
export function summarizeUsage(calls = []) {
  const zero = () => ({
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    webSearches: 0,
    usd: 0,
    ms: 0,
  });
  const total = zero();
  const synthesis = zero();
  const deterministic = zero();
  const byLeg = {};
  const byModel = {};
  const mismatches = [];
  let failures = 0;
  let timeouts = 0;
  let unpriced = 0;
  for (const c of calls) {
    if (!c.ok) {
      failures += 1;
      if (c.status === 'timeout') timeouts += 1;
    }
    const served = c.served || c.requested;
    const usd = callCostUsd({ ...c, model: served });
    if (usd == null && c.ok) unpriced += 1;
    if (c.ok && c.requested && served && !sameModel(c.requested, served))
      mismatches.push({
        leg: c.label || null,
        requested: c.requested,
        served,
        fellBackFrom: c.fellBackFrom || null,
      });
    const leg = c.label || 'unlabelled';
    const add = (b) => {
      b.calls += 1;
      b.inputTokens += c.inputTokens || 0;
      b.outputTokens += c.outputTokens || 0;
      b.cacheReadTokens += c.cacheReadTokens || 0;
      b.cacheWriteTokens += c.cacheWriteTokens || 0;
      b.webSearches += c.webSearches || 0;
      b.usd += usd || 0;
      b.ms += c.ms || 0;
    };
    add(total);
    add(DETERMINISTIC_LEGS.has(leg) ? deterministic : synthesis);
    add((byLeg[leg] ||= zero()));
    add((byModel[served || 'unknown'] ||= zero()));
  }
  const r = (b) => ({ ...b, usd: round(b.usd, 5) });
  return {
    total: r(total),
    synthesis: r(synthesis),
    deterministic: r(deterministic),
    byLeg: Object.fromEntries(Object.entries(byLeg).map(([k, v]) => [k, r(v)])),
    byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, r(v)])),
    failures,
    timeouts,
    unpriced,
    modelMismatches: mismatches,
  };
}

/* claude-haiku-4-5 vs claude-haiku-4-5-20251001: the API may answer with a dated id. */
function sameModel(a, b) {
  const norm = (x) => String(x).replace(/-\d{8}$/, '');
  return norm(a) === norm(b);
}
