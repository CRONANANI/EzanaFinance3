/**
 * Sonar 5.0 (Nov 24 2026): the holdings query Sonar builds itself when a question names a
 * second holder ("the shares both Nancy Pelosi and BlackRock hold") and the reader has not
 * attached one. Pure and client-safe.
 *
 * It is ordinary EzanaQL over Titans Shadow 13F holdings, so it runs through the same
 * validator, executor, schema and set operations as a query the reader writes, and it is
 * shown and removable in the composer like any other attachment. It filters on the
 * resolved filer's CIK and its latest reported period (never a name LIKE, which can sweep
 * in other filers with similar names), shares only (no options or principal amounts).
 */
import { querySchema } from './schema.js';

/** Without a stated "top N", the comparison uses the filer's largest positions up to this. */
export const DEFAULT_BOOK_LIMIT = 1000;

export function holdingsQueryFor(filer, { topN = null, op = 'intersect' } = {}) {
  if (!filer?.id || !filer?.period) return null;
  const cik = String(filer.id).replace(/[^0-9]/g, '');
  const period = String(filer.period).slice(0, 10);
  if (!cik || !/^\d{4}-\d{2}-\d{2}$/.test(period)) return null;
  const n = Number.isFinite(topN) && topN > 0 ? Math.min(Math.round(topN), 5000) : null;
  const query = [
    'FROM titans.holdings_13f',
    `WHERE filer_cik = "${cik}" AND period = "${period}" AND share_type = "SH"`,
    'SELECT ticker, issuer, cusip, value, shares, period',
    'ORDER BY value DESC',
    `LIMIT ${n || DEFAULT_BOOK_LIMIT};`,
  ].join('\n');
  const name = filer.name || 'The filer';
  return {
    key: `auto:holdings:${cik}`,
    kind: 'query',
    origin: 'auto',
    label: n
      ? `${name}: top ${n} 13F holdings (${period})`
      : `${name}: largest ${DEFAULT_BOOK_LIMIT.toLocaleString('en-US')} 13F holdings (${period})`,
    text: `EzanaQL (titans):\n${query}`,
    query,
    dimension: 'titans',
    entityName: name,
    status: 'ready',
    seq: 1,
    relation: op === 'compare' ? 'compare' : 'intersect',
    relationExplicit: true,
    matchLevel: 'security',
    schema: querySchema(query, 'titans'),
  };
}

/** Does an attached query already cover this holder? (its filer name or label mentions it) */
export function queryCovers(item, name) {
  const want = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
  if (!want || item?.kind !== 'query') return false;
  const hay = [item.entityName, item.schema?.entity?.text, item.label, item.query]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return want.split(/\s+/).every((w) => hay.includes(w));
}
