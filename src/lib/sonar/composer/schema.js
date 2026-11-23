/**
 * Research Composer 4.0: an EzanaQL attachment's output schema (Nov 23 2026). Pure and
 * client-safe (the parser and catalog are plain modules).
 *
 * The relationship engine needs to know what a query returns before it runs: securities
 * (rows keyed by CUSIP or ticker), transactions, or an aggregate. That decides which
 * analytical relationships it can offer (a holdings intersection needs security identifiers;
 * a single aggregate number cannot be intersected with anything).
 *
 *   querySchema(text, dimension) ->
 *     { ok, error?, dataset, datasetLabel, dimension, fields, identifiers: ['cusip','ticker'],
 *       shape: 'securities' | 'transactions' | 'aggregate' | 'records',
 *       semantics: 'reported_holdings' | 'congress_trades' | ..., entity: { text, role } | null,
 *       limit, orderBy, period }
 */

import { parse } from '@/lib/ezanaql/parser';
import { CATALOG } from '@/lib/ezanaql/catalog';

/** What a row of each dataset means. Only these semantics can join portfolio operations. */
const SEMANTICS = {
  'titans.holdings_13f': 'reported_holdings',
  'titans.etf_holdings': 'fund_holdings',
  'titans.insider_trades': 'insider_trades',
  'capitol.congress_trades': 'congress_trades',
};

/** The entity a query is about, read from its WHERE clause (filer, politician, fund). */
const ENTITY_FIELDS = {
  filer: 'institution',
  politician: 'politician',
  fund: 'fund',
  etf: 'fund',
};

function fieldName(expr) {
  return expr?.type === 'field' ? expr.name : null;
}

function walkWhere(node, out = []) {
  if (!node) return out;
  if (node.type === 'and' || node.type === 'or') {
    walkWhere(node.left, out);
    walkWhere(node.right, out);
  } else if (node.type === 'not') walkWhere(node.expr, out);
  else out.push(node);
  return out;
}

function entityFrom(where) {
  for (const c of walkWhere(where)) {
    const f = fieldName(c.expr) || fieldName(c.left);
    const role = f && ENTITY_FIELDS[f];
    if (!role) continue;
    const lit = c.value?.value ?? c.right?.value;
    if (typeof lit !== 'string') continue;
    const text = lit.replace(/%/g, ' ').replace(/\s+/g, ' ').trim();
    if (text)
      return { text: text.replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => a + b.toLowerCase()), role };
  }
  return null;
}

function periodFrom(where) {
  for (const c of walkWhere(where)) {
    const f = fieldName(c.left) || fieldName(c.expr);
    if (f !== 'period') continue;
    const r = c.right;
    if (r?.type === 'field' && r.name === 'LATEST') return 'latest';
    if (r?.type === 'lit') return String(r.value);
    return 'filtered';
  }
  return null;
}

/** The EzanaQL text inside an attachment's text ("EzanaQL (titans):\nFROM ..."). */
export function extractQuery(text = '') {
  const s = String(text || '');
  const i = s.search(/\bFROM\s+[a-z]+\.[a-z_0-9]+/i);
  if (i < 0) return '';
  const rest = s.slice(i);
  const end = rest.search(/;|\n\s*\n|\nPreview \(/);
  return (end >= 0 ? rest.slice(0, end) : rest).trim();
}

export function querySchema(text, dimension = null) {
  const query = String(text || '').trim();
  if (!query) return { ok: false, error: 'No EzanaQL text.' };
  let ast;
  try {
    ast = parse(query.endsWith(';') ? query : `${query};`);
  } catch (e) {
    return { ok: false, error: e?.message || 'The query could not be read.' };
  }
  const ds = CATALOG[ast.from];
  if (!ds) return { ok: false, error: `Unknown dataset ${ast.from}.` };
  const select = Array.isArray(ast.select) && ast.select.length ? ast.select : null;
  const fields = select
    ? select.map((s) => s.alias || fieldName(s.expr) || 'value')
    : [...(ds.defaultProjection || [])];
  const plain = select ? select.map((s) => fieldName(s.expr)).filter(Boolean) : fields;
  const aggregated = select ? select.some((s) => s.expr && s.expr.type !== 'field') : false;
  const groupBy = (ast.groupBy || []).map((g) => g.name || g.field || g).filter(Boolean);
  const identifiers = ['cusip', 'ticker'].filter(
    (f) => plain.includes(f) || (!select && ds.fields?.[f]),
  );
  const byIdentifier = !aggregated || groupBy.some((g) => g === 'ticker' || g === 'cusip');
  const semantics = SEMANTICS[ds.name] || 'records';
  const shape =
    aggregated && !byIdentifier
      ? 'aggregate'
      : identifiers.length && byIdentifier
        ? semantics === 'congress_trades' || semantics === 'insider_trades'
          ? 'transactions'
          : 'securities'
        : 'records';
  return {
    ok: true,
    query,
    dataset: ds.name,
    datasetLabel: ds.label,
    dimension,
    fields,
    identifiers,
    shape,
    semantics,
    entity: entityFrom(ast.where),
    period: periodFrom(ast.where),
    limit: ast.limit ?? ds.defaultLimit ?? null,
    orderBy: ast.orderBy?.[0] || null,
  };
}

/** Why a schema cannot take part in a portfolio operation, or null when it can. */
export function portfolioGap(schema) {
  if (!schema?.ok) return schema?.error || 'The query could not be read.';
  if (schema.shape === 'aggregate')
    return 'It returns aggregate figures, not individual securities, so it cannot be matched against holdings.';
  if (!schema.identifiers.length)
    return 'Its output has no ticker or CUSIP column, so its rows cannot be matched to securities. Add ticker or cusip to SELECT.';
  if (schema.shape === 'transactions')
    return 'It returns transactions, not holdings. A trade is not a position, so it is not intersected with a portfolio.';
  if (schema.shape !== 'securities') return 'Its rows are not securities.';
  return null;
}
