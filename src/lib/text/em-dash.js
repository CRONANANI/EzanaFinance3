/**
 * House style: no em dashes anywhere a user can read (Nov 2026). This is the
 * one rule, used by the source codemod, the CI guard, every Sonar and AI
 * response, and the ingests that store third-party text (news, prediction
 * markets, Echo articles).
 *
 *   a lone dash (a null placeholder)        -> NA, the en dash used for nulls
 *   a spaced lone dash (a separator)        -> " · " (middle dot)
 *   "<dash> None <dash>"                    -> "None"
 *   2020<dash>2024, $5<dash>$10 (a range)   -> 2020<en dash>2024
 *   "<dash> Warren Buffett" (leading)       -> "Warren Buffett"
 *   "Loading <dash>" (trailing)             -> "Loading"
 *   "Ezana Echo <dash> The Weekly"          -> "Ezana Echo: The Weekly"
 *   "the market <dash> not the Fed <dash> moved" -> "the market, not the Fed, moved"
 *
 * Also the horizontal bar (U+2015) and the HTML entities for the em dash.
 * Pure and client-safe. Written with escapes only, so this file passes its
 * own guard.
 */

/** The null placeholder (same value as org-display NA). */
export const NA = '–';

const EM = '—';
const ENTITY_RE = /&mdash;|&#8212;|&#x2014;|―/gi;
export const EM_DASH_RE = /[—―]|&mdash;|&#8212;|&#x2014;/i;

/** True when the text contains an em dash in any form. */
export function hasEmDash(text) {
  return typeof text === 'string' && EM_DASH_RE.test(text);
}

const LONE_RE = /^\s*—+\s*$/;
const WRAPPED_RE = /^(\s*)—\s*(.+?)\s*—(\s*)$/;
const RANGE_RE = /(\d[\d.,]*%?[KMBTkmbt]?)[ \t]*—+[ \t]*(?=[$€£]?\d)/g;
const LEADING_RE = /(^|\n)([ \t]*)—+[ \t]*/g;
const TRAILING_RE = /[ \t]*—+[ \t]*(?=\n|$|[.,;:!?)\]}])/g;
const HEAD_RE = /^(\s*)([A-Z0-9$][^—.,;:!?\n]{0,39}?)[ \t]+—[ \t]+(?=[A-Z0-9$"“])/;
const ANY_RE = /[ \t]*—+[ \t]*/g;

/** A string with every em dash rewritten by the house rule. */
export function removeEmDashes(input) {
  if (typeof input !== 'string' || !hasEmDash(input)) return input;
  let s = input.replace(ENTITY_RE, EM);
  /* A bare dash is a null placeholder; a spaced one is a separator. */
  if (LONE_RE.test(s)) return /\s/.test(s) ? s.replace(/\s*—+\s*/, ' · ') : NA;
  s = s.replace(WRAPPED_RE, '$1$2$3');
  s = s.replace(RANGE_RE, `$1${NA}`);
  s = s.replace(LEADING_RE, '$1$2');
  s = s.replace(TRAILING_RE, '');
  /* One spaced dash after a short capitalised heading, with a capitalised
     remainder ("Ezana Echo <dash> The Weekly"): a colon. */
  const count = (s.match(/—/g) || []).length;
  const head = s.match(HEAD_RE);
  if (count === 1 && head && head[2].trim().split(/\s+/).length <= 4) {
    s = s.replace(/[ \t]*—[ \t]*/, ': ');
  }
  /* Everything else is a clause break: a comma. */
  s = s.replace(ANY_RE, ', ');
  /* Punctuation the rewrite can collide with. */
  return s
    .replace(/,\s*([,.;:!?)\]}])/g, '$1')
    .replace(/([([{])\s*,\s*/g, '$1')
    .replace(/([;:!?])\s*,\s*/g, '$1 ')
    .replace(/\.,\s*/g, '. ');
}

/** Every string inside a JSON-like value, rewritten. Unchanged values keep identity. */
export function deepRemoveEmDashes(value, depth = 0) {
  if (depth > 40) return value;
  if (typeof value === 'string') return removeEmDashes(value);
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const n = deepRemoveEmDashes(v, depth + 1);
      if (n !== v) changed = true;
      return n;
    });
    return changed ? out : value;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const n = deepRemoveEmDashes(v, depth + 1);
      if (n !== v) changed = true;
      out[k] = n;
    }
    return changed ? out : value;
  }
  return value;
}
