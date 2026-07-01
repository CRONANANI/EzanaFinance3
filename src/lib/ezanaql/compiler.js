/**
 * EzanaQL compiler helpers: RLS injection, relative-date resolution, and the
 * predicate/scalar evaluators used by the executor.
 *
 * SECURITY: RLS is injected here for user_private datasets and cannot be removed
 * via query text. Filters that CAN be pushed to the source are applied through
 * the Supabase client's parameterized methods (.eq/.gte/.in/…) — never by string
 * concatenation. The full WHERE predicate is always re-evaluated in-engine over
 * the fetched rows, so OR/derived/text predicates stay correct and no user input
 * is ever interpolated into a query string.
 */
import { EzanaQLError } from './parser';

/* ── relative dates → concrete ISO date (UTC) or numeric fiscal year ── */
function usFiscalYear(d) {
  // US federal FY starts Oct 1: Oct–Dec belong to the next calendar year's FY.
  const y = d.getUTCFullYear();
  return d.getUTCMonth() >= 9 ? y + 1 : y;
}

export function resolveRelDate(node, now) {
  const nowD = now instanceof Date ? now : new Date(now);
  switch (node.kind) {
    case 'ytd':
      return { kind: 'date', value: `${nowD.getUTCFullYear()}-01-01` };
    case 'last_days': {
      const d = new Date(nowD.getTime() - node.n * 86400000);
      return { kind: 'date', value: d.toISOString().slice(0, 10) };
    }
    case 'last_quarter': {
      const d = new Date(nowD.getTime() - 91 * 86400000);
      return { kind: 'date', value: d.toISOString().slice(0, 10) };
    }
    case 'fiscal_year':
      return { kind: 'fiscal_year', value: node.year };
    default:
      throw new EzanaQLError('Unsupported relative date.');
  }
}

/* ── scalar evaluation over a normalized row (catalog-field keyed) ── */
export function evalScalar(expr, row, ctx) {
  switch (expr.type) {
    case 'lit':
      return expr.value;
    case 'field':
      return row[expr.name];
    case 'reldate': {
      const r = resolveRelDate(expr, ctx.now);
      return r.value;
    }
    case 'func':
      return evalScalarFunc(expr, row, ctx);
    default:
      return null;
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function evalScalarFunc(fn, row, ctx) {
  const a = fn.args.map((x) => evalScalar(x, row, ctx));
  switch (fn.name) {
    case 'ABS':
      return a[0] == null ? null : Math.abs(toNum(a[0]));
    case 'ROUND': {
      const d = a[1] != null ? toNum(a[1]) : 0;
      return a[0] == null ? null : Number(toNum(a[0]).toFixed(d));
    }
    case 'UPPER':
      return a[0] == null ? null : String(a[0]).toUpperCase();
    case 'LOWER':
      return a[0] == null ? null : String(a[0]).toLowerCase();
    case 'TRIM':
      return a[0] == null ? null : String(a[0]).trim();
    case 'CONCAT':
      return a.map((x) => (x == null ? '' : String(x))).join('');
    case 'COALESCE':
      return a.find((x) => x != null) ?? null;
    case 'IF':
      return a[0] ? a[1] : a[2];
    case 'YEAR': {
      const d = toDate(a[0]);
      return d ? d.getUTCFullYear() : null;
    }
    case 'MONTH': {
      const d = toDate(a[0]);
      return d ? d.getUTCMonth() + 1 : null;
    }
    case 'QUARTER': {
      const d = toDate(a[0]);
      return d ? Math.floor(d.getUTCMonth() / 3) + 1 : null;
    }
    case 'FISCAL_YEAR': {
      const d = toDate(a[0]);
      return d ? usFiscalYear(d) : null;
    }
    case 'NOW':
      return new Date(ctx.now).toISOString();
    case 'DAYS_AGO':
      return new Date(new Date(ctx.now).getTime() - toNum(a[0]) * 86400000)
        .toISOString()
        .slice(0, 10);
    case 'PCT_CHANGE': {
      const f = toNum(a[0]);
      const t = toNum(a[1]);
      return f ? ((t - f) / Math.abs(f)) * 100 : null;
    }
    // Aggregations/window fns are handled at the group level, not per-row.
    default:
      return null;
  }
}

/* ── boolean predicate evaluation over a normalized row ── */
export function evalPredicate(pred, row, ctx) {
  if (!pred) return true;
  switch (pred.type) {
    case 'and':
      return evalPredicate(pred.left, row, ctx) && evalPredicate(pred.right, row, ctx);
    case 'or':
      return evalPredicate(pred.left, row, ctx) || evalPredicate(pred.right, row, ctx);
    case 'not':
      return !evalPredicate(pred.expr, row, ctx);
    case 'isnull': {
      const v = evalScalar(pred.expr, row, ctx);
      const isNull = v == null;
      return pred.negate ? !isNull : isNull;
    }
    case 'in': {
      const v = evalScalar(pred.expr, row, ctx);
      const set = pred.list.map((x) => evalScalar(x, row, ctx));
      const hit = set.some((s) => looseEq(s, v));
      return pred.negate ? !hit : hit;
    }
    case 'between': {
      const v = toComparable(evalScalar(pred.expr, row, ctx));
      const lo = toComparable(evalScalar(pred.lo, row, ctx));
      const hi = toComparable(evalScalar(pred.hi, row, ctx));
      return v != null && lo != null && hi != null && v >= lo && v <= hi;
    }
    case 'text': {
      const v = pred.expr ? String(evalScalar(pred.expr, row, ctx) ?? '') : '';
      const pat = String(evalScalar(pred.value, row, ctx) ?? '');
      return matchText(pred.op, v, pat);
    }
    case 'compare': {
      const l = evalScalar(pred.left, row, ctx);
      const r = evalScalar(pred.right, row, ctx);
      return compareOp(pred.op, l, r);
    }
    default:
      return true;
  }
}

function looseEq(a, b) {
  if (a == null || b == null) return a === b;
  if (typeof a === 'number' || typeof b === 'number') return toNum(a) === toNum(b);
  return String(a) === String(b);
}
function toComparable(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(String(v))) return d.getTime();
  const n = Number(v);
  return Number.isFinite(n) && String(v).trim() !== '' ? n : String(v);
}
function compareOp(op, l, r) {
  if (op === '=') return looseEq(l, r);
  if (op === '!=') return !looseEq(l, r);
  const a = toComparable(l);
  const b = toComparable(r);
  if (a == null || b == null) return false;
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    default:
      return false;
  }
}
function matchText(op, v, pat) {
  const val = v.toLowerCase();
  const p = pat.toLowerCase();
  switch (op) {
    case 'contains':
      return val.includes(p);
    case 'starts':
      return val.startsWith(p);
    case 'ends':
      return val.endsWith(p);
    case 'like': {
      // SQL LIKE: % → .*, _ → .
      const re = new RegExp(
        '^' +
          p
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/%/g, '.*')
            .replace(/_/g, '.') +
          '$',
      );
      return re.test(val);
    }
    default:
      return false;
  }
}

/**
 * RLS predicate for a user_private dataset. Returned as a structured filter the
 * executor applies via the parameterized Supabase client — the user's query text
 * can never remove or override it.
 */
export function rlsFilter(dataset, userId) {
  if (dataset.access !== 'user_private') return null;
  if (!dataset.rlsColumn)
    throw new EzanaQLError('Internal: user_private dataset missing rlsColumn.');
  if (!userId) throw new EzanaQLError('Authentication required to query your private data.');
  return { column: dataset.rlsColumn, value: userId };
}
