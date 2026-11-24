/**
 * 13F periods for Sonar and the Research Composer (Nov 24 2026).
 *
 * Two meanings of "latest", kept apart:
 *   a filer's own latest filing   what one filer holds: the newest period it has filed,
 *                                 amendments applied (sec_13f_effective_filings; EzanaQL
 *                                 fields `latest` and `current` on titans.holdings_13f).
 *   the latest complete quarter   market-wide questions (who holds a stock, flows): the
 *                                 titans snapshot, which waits until a quarter is complete.
 *
 * scope13FQuery makes a holdings query mean the first one unless it already says otherwise:
 *   no period, filing date, accession or scope filter  ->  AND latest = TRUE
 *   a period or filing date, no accession or scope     ->  AND current = TRUE
 *     (only the effective filing for that period, so a restated amendment and its
 *      original are not both counted)
 * A query with a JOIN, or one that already filters latest, current or accession_no, is run
 * as written. Pure and client-safe; the result says what it did so the report can say it.
 */

import { parse } from '@/lib/ezanaql/parser';

export const HOLDINGS_13F = 'titans.holdings_13f';
const PERIOD_FIELDS = new Set(['period', 'filed_on']);
const SCOPE_FIELDS = new Set(['latest', 'current', 'accession_no']);
const CLAUSES = ['SELECT', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'AS'];

function fieldsIn(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) fieldsIn(n, out);
    return out;
  }
  if (node.type === 'field' && node.name) out.add(String(node.name).toLowerCase());
  for (const v of Object.values(node)) if (v && typeof v === 'object') fieldsIn(v, out);
  return out;
}

/** Top-level keyword positions, skipping quoted strings. */
function keywordAt(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const q = c;
      i += 1;
      while (i < text.length && text[i] !== q) i += text[i] === '\\' ? 2 : 1;
      i += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c) && (i === 0 || !/[\w.]/.test(text[i - 1]))) {
      let j = i;
      while (j < text.length && /[\w]/.test(text[j])) j += 1;
      out.push({ word: text.slice(i, j).toUpperCase(), at: i, end: j });
      i = j;
      continue;
    }
    if (c === ';') out.push({ word: ';', at: i, end: i + 1 });
    i += 1;
  }
  return out;
}

/**
 * The query scoped to each filer's own latest filing (or to the effective filing of the
 * periods it names). Returns { query, scope: 'latest' | 'current' | null, note }.
 */
export function scope13FQuery(query) {
  const text = String(query || '');
  const same = { query: text, scope: null, note: null };
  let ast;
  try {
    ast = parse(text);
  } catch {
    return same;
  }
  if (String(ast?.from || '').toLowerCase() !== HOLDINGS_13F || ast.join) return same;
  const used = fieldsIn(ast.where);
  if ([...used].some((f) => SCOPE_FIELDS.has(f))) return same;
  const scope = [...used].some((f) => PERIOD_FIELDS.has(f)) ? 'current' : 'latest';
  const pred = `${scope} = TRUE`;
  const kws = keywordAt(text);
  const where = kws.find((k) => k.word === 'WHERE');
  let next;
  if (where) {
    const end = kws.find((k) => k.at > where.end && (CLAUSES.includes(k.word) || k.word === ';'));
    const stop = end ? end.at : text.length;
    const cond = text.slice(where.end, stop).trim();
    next = `${text.slice(0, where.at)}WHERE ${pred} AND (${cond})\n${text.slice(stop)}`;
  } else {
    const from = kws.find((k) => k.word === 'FROM');
    const end = kws.find(
      (k) => k.at > (from?.end ?? 0) && (CLAUSES.includes(k.word) || k.word === ';'),
    );
    const stop = end ? end.at : text.length;
    next = `${text.slice(0, stop).trimEnd()}\nWHERE ${pred}\n${text.slice(stop)}`;
  }
  try {
    const check = fieldsIn(parse(next).where);
    if (!check.has(scope)) return same;
  } catch {
    return same;
  }
  return {
    query: next.replace(/\n{3,}/g, '\n\n').trim(),
    scope,
    note:
      scope === 'latest'
        ? "Scoped to each filer's latest filed 13F (amendments applied), so quarters are not mixed."
        : 'Scoped to the effective filing for each period named (a restated amendment replaces its original).',
  };
}

/**
 * The rows of each filer's newest period in a result that was not scoped (the fallback
 * when the scope fields are not available). Rows without a period or filer are kept.
 */
export function latestRowsPerFiler(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const key = (r) => r.filer_cik ?? r.filer ?? null;
  const newest = new Map();
  for (const r of list) {
    const k = key(r);
    const p = r.period ? String(r.period).slice(0, 10) : null;
    if (k == null || !p) continue;
    if (!newest.has(k) || p > newest.get(k)) newest.set(k, p);
  }
  return list.filter((r) => {
    const k = key(r);
    const p = r.period ? String(r.period).slice(0, 10) : null;
    return k == null || !p || newest.get(k) === p;
  });
}
