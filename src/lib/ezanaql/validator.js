/**
 * EzanaQL validator — the security boundary. Rejects anything where the dataset
 * isn't in the catalog (or isn't available), a field isn't in the dataset, a
 * function is unknown/misused, the limit exceeds the hard cap, an operator isn't
 * whitelisted, or a join isn't declared in joinableWith. Produces clear,
 * user-facing errors — never stack traces or DB internals.
 */
import { EzanaQLError } from './parser';
import { getDataset, CATALOG } from './catalog';

export const AGGREGATIONS = new Set([
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COUNT',
  'MEDIAN',
  'STDDEV',
  'PERCENTILE',
]);
export const SCALAR_FUNCTIONS = new Set([
  'ABS',
  'ROUND',
  'PCT_CHANGE',
  'YOY',
  'CAGR',
  'RANK',
  'MOVING_AVG',
  'YEAR',
  'QUARTER',
  'MONTH',
  'DATE_TRUNC',
  'NOW',
  'DAYS_AGO',
  'FISCAL_YEAR',
  'UPPER',
  'LOWER',
  'TRIM',
  'CONCAT',
  'IF',
  'COALESCE',
]);

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function suggest(name, candidates) {
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = levenshtein(name.toLowerCase(), c.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= Math.max(2, Math.floor(name.length / 3)) ? best : null;
}

/**
 * Validate an AST against the catalog. Returns { dataset } (the resolved catalog
 * entry) on success; throws EzanaQLError otherwise.
 */
export function validate(ast) {
  const dataset = getDataset(ast.from);
  if (!dataset) {
    const s = suggest(ast.from, Object.keys(CATALOG));
    throw new EzanaQLError(`Unknown dataset "${ast.from}".${s ? ` Did you mean "${s}"?` : ''}`);
  }
  if (!dataset.available) {
    throw new EzanaQLError(
      `Dataset "${dataset.name}" (${dataset.label}) is declared in the catalog but its query source is not wired yet — it isn't available for EzanaQL queries.`,
    );
  }

  const validFields = new Set(Object.keys(dataset.fields));
  const aliases = new Set();

  const checkField = (name) => {
    if (validFields.has(name) || aliases.has(name)) return;
    const s = suggest(name, [...validFields]);
    throw new EzanaQLError(
      `Unknown field "${name}" in ${dataset.name}.${s ? ` Did you mean "${s}"?` : ''}`,
    );
  };

  const walkValue = (v) => {
    if (!v || typeof v !== 'object') return;
    switch (v.type) {
      case 'field':
        checkField(v.name);
        return;
      case 'func':
        validateFunction(v);
        v.args.forEach(walkValue);
        return;
      case 'lit':
      case 'reldate':
        return;
      default:
        return;
    }
  };

  const walkPredicate = (p) => {
    if (!p) return;
    switch (p.type) {
      case 'and':
      case 'or':
        walkPredicate(p.left);
        walkPredicate(p.right);
        return;
      case 'not':
        walkPredicate(p.expr);
        return;
      case 'compare':
        walkValue(p.left);
        walkValue(p.right);
        return;
      case 'isnull':
        walkValue(p.expr);
        return;
      case 'in':
        walkValue(p.expr);
        p.list.forEach(walkValue);
        return;
      case 'between':
        walkValue(p.expr);
        walkValue(p.lo);
        walkValue(p.hi);
        return;
      case 'text':
        walkValue(p.expr);
        walkValue(p.value);
        return;
      default:
        return;
    }
  };

  // JOIN — only if both datasets declare each other joinable.
  if (ast.join) {
    const other = getDataset(ast.join.dataset);
    if (!other) throw new EzanaQLError(`Unknown dataset "${ast.join.dataset}" in JOIN.`);
    if (!dataset.joinableWith.includes(other.name) || !other.joinableWith.includes(dataset.name)) {
      throw new EzanaQLError(
        `Datasets ${dataset.name} and ${other.name} are not declared joinable. Joins are only allowed between catalog-declared joinable datasets.`,
      );
    }
  }

  // WHERE (RLS is injected later by the compiler and cannot be removed here).
  if (ast.where) walkPredicate(ast.where);

  // SELECT projection — collect aliases first so ORDER BY/HAVING can reference them.
  if (ast.select) {
    for (const item of ast.select) {
      walkValue(item.expr);
      if (item.alias) aliases.add(item.alias);
    }
  }

  if (ast.groupBy) ast.groupBy.forEach(checkField);
  if (ast.having) walkPredicate(ast.having);
  if (ast.orderBy) ast.orderBy.forEach((s) => checkField(s.field));

  // LIMIT within hard cap.
  if (ast.limit != null) {
    if (ast.limit < 0) throw new EzanaQLError('LIMIT cannot be negative.');
    if (ast.limit > dataset.hardLimit) {
      throw new EzanaQLError(
        `LIMIT ${ast.limit} exceeds the max of ${dataset.hardLimit} for ${dataset.name}.`,
      );
    }
  }
  if (ast.offset != null && ast.offset < 0) throw new EzanaQLError('OFFSET cannot be negative.');

  return { dataset };
}

function validateFunction(fn) {
  const name = fn.name;
  if (!AGGREGATIONS.has(name) && !SCALAR_FUNCTIONS.has(name)) {
    const s = suggest(name, [...AGGREGATIONS, ...SCALAR_FUNCTIONS]);
    throw new EzanaQLError(`Unknown function ${name}().${s ? ` Did you mean ${s}()?` : ''}`);
  }
  // arity checks for the common ones
  const arity = {
    COUNT: [0, 1],
    SUM: [1, 1],
    AVG: [1, 1],
    MIN: [1, 1],
    MAX: [1, 1],
    MEDIAN: [1, 1],
    STDDEV: [1, 1],
    PERCENTILE: [2, 2],
    ABS: [1, 1],
    ROUND: [1, 2],
    PCT_CHANGE: [2, 2],
    YOY: [1, 1],
    CAGR: [2, 2],
    YEAR: [1, 1],
    QUARTER: [1, 1],
    MONTH: [1, 1],
    FISCAL_YEAR: [1, 1],
    DATE_TRUNC: [2, 2],
    NOW: [0, 0],
    DAYS_AGO: [1, 1],
    UPPER: [1, 1],
    LOWER: [1, 1],
    TRIM: [1, 1],
    CONCAT: [2, 8],
    IF: [3, 3],
    COALESCE: [1, 8],
    MOVING_AVG: [2, 2],
    RANK: [0, 0],
  }[name];
  if (arity) {
    const [min, max] = arity;
    if (fn.args.length < min || fn.args.length > max) {
      throw new EzanaQLError(
        `${name}() expects ${min === max ? min : `${min}–${max}`} argument(s), got ${fn.args.length}.`,
      );
    }
  }
}
