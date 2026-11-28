/**
 * Last completed model run per ticker, for the Overview's Valuation Snapshot
 * and Model Outputs (Nov 19th, 2026). A model records a run only when its own
 * computation succeeds, with the value it showed and the time; nothing is
 * filled in for a model that has not been run, failed, or returned no value.
 *
 * Kept in sessionStorage (this browser tab, this visit): results are private
 * to the reader and never mix tickers. A `ezana:model-run` window event lets
 * the Overview update live when a run finishes in Valuation Models.
 */
const KEY = 'ezana.research.modelRuns.v1';
const EVENT = 'ezana:model-run';

function readAll() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * @param {string} symbol
 * @param {'dcf'|'threestatement'|'comps'|'grpv'|'earnings'} model
 * @param {{ value?: number|null, label?: string, display?: string, note?: string }} result
 */
export function recordModelRun(symbol, model, result = {}) {
  if (typeof window === 'undefined' || !symbol || !model) return;
  const sym = String(symbol).toUpperCase();
  const all = readAll();
  /* Sonar 6.4 integration: a run built on demonstration figures is marked as such, so the
     Overview never shows it as a valuation of the real company. */
  const sample = typeof document !== 'undefined' && document.body?.dataset?.marketData === 'sample';
  const tagged = sample
    ? {
        ...result,
        sample: true,
        display: result.display ? `${result.display} (sample data)` : result.display,
        note: result.note ? `${result.note} (sample data)` : 'Sample data',
      }
    : result;
  all[sym] = { ...(all[sym] || {}), [model]: { ...tagged, at: Date.now() } };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: the Overview simply shows "Not run" */
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { symbol: sym, model } }));
  } catch {
    /* old browsers */
  }
}

/** { [model]: { value, label, display, note, at } } for one ticker. */
export function readModelRuns(symbol) {
  if (typeof window === 'undefined' || !symbol) return {};
  return readAll()[String(symbol).toUpperCase()] || {};
}

export const MODEL_RUN_EVENT = EVENT;
