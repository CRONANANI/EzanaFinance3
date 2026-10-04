/**
 * EzanaQL executor — runs a validated AST via the existing data layer.
 *
 * Strategy: fetch rows through the parameterized Supabase client (RLS filter +
 * best-effort column filters pushed down), then evaluate SELECT / GROUP BY /
 * aggregations / HAVING / ORDER BY / LIMIT in-engine over the fetched rows. This
 * keeps every source access parameterized (no string-built SQL) while supporting
 * the full grammar. Enforces a row cap and a wall-clock timeout.
 *
 * Joins are two parameterized fetches, never a database join:
 *   SEMI JOIN  fetch the FROM rows, ask which of their keys exist on the other
 *              side (ezanaql_matching_keys RPC; paged .in() reads until the
 *              migration is applied), keep the FROM rows that match. No fields
 *              are added and no row is repeated, so sums stay sums.
 *   JOIN       fetch the FROM rows, then the joined rows whose key is among
 *              theirs, and emit one row per matching pair. The joined side's
 *              fields are keyed shortname.field, the spelling the validator
 *              resolved every reference to. WHERE conjuncts that touch only
 *              one side are pushed to that side's fetch. Aggregates see each
 *              side's rows once (sideRows): SUM(award_value) across contracts
 *              × holders is the sum of the awards, and COUNT(DISTINCT
 *              holdings.politician) the holders, in the same query.
 * Anything the caller should know about the answer (a row cap was hit, a
 * COUNT() counted pairs) comes back in `notes`, never silently.
 */
import { EzanaQLError } from './parser';
import { evalPredicate, evalScalar, rlsFilter, resolveRelDate } from './compiler';
import { shortName } from './catalog';

const TIMEOUT_MS = 10000;
/* Keys per ezanaql_matching_keys call (the function's own cap) and per
   PostgREST .in() read (kept small so the URL stays well under limits). */
const RPC_KEY_CHUNK = 5000;
const IN_KEY_CHUNK = 100;

/**
 * Derived fields, one small map of expressions rather than a special case per
 * dataset. A field whose columnMap entry is null is derived; its dataset says
 * which kind and over which inputs, and the kind is looked up here.
 *
 * This replaces a hardcoded fiscal_year branch that only gov.contracts could
 * ever use. Adding a derivation is now an entry in a dataset's `derived` block
 * plus, at most, a kind here.
 */
const DERIVATION_KINDS = {
  /* US federal fiscal year: starts 1 October, so Oct-Dec belong to the next. */
  fiscal_year(row, spec) {
    const d = row[spec.from] ? new Date(row[spec.from]) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  },
  /* Whole days between two dates, `to` minus `from`. Null when either is
     missing, which is the honest answer: a filing with no date has no lag, and
     a zero would read as same-day. */
  day_diff(row, spec) {
    const a = row[spec.from] ? new Date(row[spec.from]) : null;
    const b = row[spec.to] ? new Date(row[spec.to]) : null;
    if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  },
};

/** Normalize a raw DB row into a catalog-field-keyed record (+ derived fields). */
function normalizeRow(dataset, raw) {
  const out = {};
  for (const [field, col] of Object.entries(dataset.columnMap || {})) {
    if (col) out[field] = raw[col];
  }
  for (const [field, spec] of Object.entries(dataset.derived || {})) {
    const fn = DERIVATION_KINDS[spec.kind];
    out[field] = fn ? fn(out, spec) : null;
  }
  // coerce money/number columns to numbers
  for (const [field, meta] of Object.entries(dataset.fields)) {
    if (
      (meta.type === 'money' || meta.type === 'int' || meta.type === 'float') &&
      out[field] != null
    ) {
      const n = Number(out[field]);
      out[field] = Number.isFinite(n) ? n : out[field];
    }
  }
  return out;
}

/** Top-level AND conjuncts of a predicate (the whole predicate when not an AND). */
function conjuncts(where) {
  const flat = [];
  const collect = (p) => {
    if (!p) return;
    if (p.type === 'and') {
      collect(p.left);
      collect(p.right);
      return;
    }
    flat.push(p);
  };
  collect(where);
  return flat;
}

function andAll(preds) {
  return preds.reduce((acc, p) => (acc ? { type: 'and', left: acc, right: p } : p), null);
}

/** Every field name an AST fragment references. */
function fieldNames(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => fieldNames(n, out));
    return out;
  }
  if (node.type === 'field' && typeof node.name === 'string') out.add(node.name);
  for (const v of Object.values(node)) if (v && typeof v === 'object') fieldNames(v, out);
  return out;
}

/** Deep copy of an AST fragment with `prefix.` stripped from field names. */
function stripPrefix(node, prefix) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((n) => stripPrefix(n, prefix));
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = stripPrefix(v, prefix);
  if (out.type === 'field' && typeof out.name === 'string' && out.name.startsWith(`${prefix}.`)) {
    out.name = out.name.slice(prefix.length + 1);
  }
  return out;
}

/** Best-effort pushdown of simple top-level AND equality/range filters. The
 *  full predicate is still evaluated in-engine; this only narrows the read. */
function applyPushdownFilters(query, dataset, preds, now) {
  for (const p of preds) {
    if (p.type !== 'compare' || p.left.type !== 'field') continue;
    const col = dataset.columnMap?.[p.left.name];
    if (!col) continue; // derived/unmapped → evaluated in-engine only
    let v;
    if (p.right.type === 'lit' && p.right.value != null) v = p.right.value;
    else if (p.right.type === 'reldate') {
      /* LAST 5 YEARS etc. resolve to a date before the read, so a dated
         window narrows the fetch instead of being applied to a capped one. */
      const r = resolveRelDate(p.right, now);
      if (r?.kind !== 'date') continue;
      v = r.value;
    } else continue;
    switch (p.op) {
      case '=':
        query = query.eq(col, v);
        break;
      case '!=':
        query = query.neq(col, v);
        break;
      case '>':
        query = query.gt(col, v);
        break;
      case '>=':
        query = query.gte(col, v);
        break;
      case '<':
        query = query.lt(col, v);
        break;
      case '<=':
        query = query.lte(col, v);
        break;
      default:
        break;
    }
  }
  return query;
}

function assertWired(dataset) {
  if (!dataset.available || !dataset.table) {
    throw new EzanaQLError(`Dataset "${dataset.name}" has no wired query source.`);
  }
}

const capNote = (dataset, n) =>
  `Read the first ${n.toLocaleString('en-US')} rows of ${dataset.name} (its row cap), so the result may be incomplete. Narrow the WHERE to read fewer.`;

/**
 * Rows of one dataset, normalized to catalog field keys and filtered by
 * `where` (field names bare, as in the dataset). `keyIn` restricts the read
 * to rows whose `key` column is one of the given values, in chunks.
 * `keyNotNull` drops rows without a join key in the database: a join can
 * never match them, and on a wide table (contracts: ~50k rows, a few hundred
 * with a ticker) they would otherwise fill the row cap first.
 */
async function fetchRows({
  dataset,
  where,
  admin,
  userId,
  now,
  notes,
  keyIn = null,
  keyNotNull = null,
}) {
  assertWired(dataset);
  const cols = Object.values(dataset.columnMap || {}).filter(Boolean);
  const preds = conjuncts(where);
  const read = async (keyCol, keys, limit) => {
    let query = admin.from(dataset.table).select(cols.join(', ')).limit(limit);
    const rls = rlsFilter(dataset, userId);
    if (rls) query = query.eq(rls.column, rls.value);
    if (keyCol) query = query.in(keyCol, keys);
    if (keyNotNull) query = query.not(dataset.columnMap[keyNotNull], 'is', null);
    query = applyPushdownFilters(query, dataset, preds, now);
    const { data, error } = await query;
    if (error) throw new EzanaQLError('The query could not be executed against the data source.');
    return data || [];
  };

  let raw = [];
  if (!keyIn) {
    raw = await read(null, null, dataset.hardLimit);
  } else {
    const keyCol = dataset.columnMap?.[keyIn.field];
    for (let i = 0; i < keyIn.keys.length && raw.length < dataset.hardLimit; i += IN_KEY_CHUNK) {
      const chunk = keyIn.keys.slice(i, i + IN_KEY_CHUNK);
      raw = raw.concat(await read(keyCol, chunk, dataset.hardLimit - raw.length));
    }
  }
  if (raw.length >= dataset.hardLimit) notes.push(capNote(dataset, dataset.hardLimit));

  const ctx = { now };
  return raw.map((r) => normalizeRow(dataset, r)).filter((row) => evalPredicate(where, row, ctx));
}

const keyOf = (v) => (v == null || v === '' ? null : String(v).toUpperCase());

/**
 * Which of `keys` exist in the joined dataset's key column. One RPC per 5,000
 * keys; when the function is missing (migration not applied) or refuses,
 * falls back to paged .in() reads of the key column.
 */
async function matchingKeys({ joined, key, keys, admin, userId, notes }) {
  const col = joined.columnMap?.[key];
  const found = new Set();
  let rpcOk = typeof admin.rpc === 'function' && !rlsFilter(joined, userId);
  if (rpcOk) {
    for (let i = 0; i < keys.length; i += RPC_KEY_CHUNK) {
      const { data, error } = await admin.rpc('ezanaql_matching_keys', {
        p_table: joined.table,
        p_column: col,
        p_keys: keys.slice(i, i + RPC_KEY_CHUNK),
      });
      if (error || !Array.isArray(data)) {
        rpcOk = false;
        break;
      }
      data.forEach((k) => found.add(keyOf(k)));
    }
  }
  if (rpcOk) return found;

  found.clear();
  let capped = false;
  for (let i = 0; i < keys.length; i += IN_KEY_CHUNK) {
    const chunk = keys.slice(i, i + IN_KEY_CHUNK);
    let query = admin.from(joined.table).select(col).in(col, chunk).limit(joined.hardLimit);
    const rls = rlsFilter(joined, userId);
    if (rls) query = query.eq(rls.column, rls.value);
    const { data, error } = await query;
    if (error) throw new EzanaQLError('The query could not be executed against the data source.');
    (data || []).forEach((r) => found.add(keyOf(r[col])));
    if ((data || []).length >= joined.hardLimit) capped = true;
  }
  if (capped) {
    notes.push(
      `Some keys matched more than ${joined.hardLimit.toLocaleString('en-US')} ${joined.name} rows in one read, so a match may have been missed.`,
    );
  }
  return found;
}

/** The rows the rest of the pipeline works on, joins resolved. */
async function sourceRows({ ast, dataset, joined, admin, userId, now, notes }) {
  if (!ast.join || !joined) {
    return fetchRows({ dataset, where: ast.where, admin, userId, now, notes });
  }
  const key = ast.join.on;
  const prefix = shortName(joined.name);

  /* Split the WHERE: conjuncts naming only FROM fields narrow the FROM read,
     conjuncts naming only joined fields narrow the joined read, and the full
     predicate is evaluated again over the combined rows. */
  const fromPreds = [];
  const joinedPreds = [];
  for (const p of conjuncts(ast.where)) {
    const names = [...fieldNames(p)];
    if (names.every((n) => !n.startsWith(`${prefix}.`))) fromPreds.push(p);
    else if (names.every((n) => n.startsWith(`${prefix}.`)))
      joinedPreds.push(stripPrefix(p, prefix));
  }

  const fromRows = (
    await fetchRows({
      dataset,
      where: andAll(fromPreds),
      admin,
      userId,
      now,
      notes,
      keyNotNull: key,
    })
  ).filter((r) => keyOf(r[key]) != null);
  const keys = [...new Set(fromRows.map((r) => keyOf(r[key])))];
  if (!keys.length) return [];

  if (ast.join.semi) {
    const found = await matchingKeys({ joined, key, keys, admin, userId, notes });
    return fromRows.filter((r) => found.has(keyOf(r[key])));
  }

  const joinedRows = await fetchRows({
    dataset: joined,
    where: andAll(joinedPreds),
    admin,
    userId,
    now,
    notes,
    keyIn: { field: key, keys },
  });
  const byKey = new Map();
  joinedRows.forEach((j, idx) => {
    const k = keyOf(j[key]);
    if (k == null) return;
    const rec = { [JOINED_ROW]: idx };
    for (const [f, v] of Object.entries(j)) rec[`${prefix}.${f}`] = v;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(rec);
  });
  const ctx = { now };
  const out = [];
  fromRows.forEach((r, idx) => {
    for (const j of byKey.get(keyOf(r[key])) || []) {
      const row = { ...r, ...j, [FROM_ROW]: idx };
      if (evalPredicate(ast.where, row, ctx)) out.push(row);
    }
  });
  if (countsPairs(ast)) {
    notes.push(
      `COUNT() with no field counts matched pairs (one ${shortName(dataset.name)} row × one ${prefix} row). For rows of one side, count one of its fields, e.g. COUNT(DISTINCT ${prefix}.${Object.keys(joined.fields)[0]}).`,
    );
  }
  return out;
}

/* Symbols, so the origin tags never collide with a field and never reach a
   projection (projections read named fields only). */
const FROM_ROW = Symbol('fromRow');
const JOINED_ROW = Symbol('joinedRow');

/* Does any aggregate in the query count bare pairs? */
function countsPairs(ast) {
  let hit = false;
  const walk = (node) => {
    if (!node || typeof node !== 'object' || hit) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'func' && node.name === 'COUNT' && node.args.length === 0) hit = true;
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v);
  };
  walk(ast.select);
  walk(ast.having);
  return hit;
}

/**
 * The rows an aggregate should see. In a joined result every FROM row is
 * repeated once per match (and vice versa), so an aggregate over one side's
 * field is taken over that side's distinct rows: SUM(award_value) across a
 * contracts × trades join is the sum of the contracts, once each, and
 * COUNT(politician) is the number of trade rows, not trades × awards. An
 * expression that mixes both sides, and COUNT() with no field, see the pairs.
 */
function sideRows(fn, rows, ctx) {
  if (!rows.length || !(FROM_ROW in rows[0])) return rows;
  const prefix = ctx.joinPrefix;
  const names = [...fieldNames(fn.args)];
  if (!names.length) return rows;
  const joinedSide = names.every((n) => prefix && n.startsWith(`${prefix}.`));
  const fromSide = names.every((n) => !(prefix && n.startsWith(`${prefix}.`)));
  if (!joinedSide && !fromSide) return rows;
  const tag = joinedSide ? JOINED_ROW : FROM_ROW;
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const id = r[tag];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

/* ── aggregation over a group of rows ── */
function aggregate(fn, allRows, ctx) {
  const rows = sideRows(fn, allRows, ctx);
  const vals = (arg) => rows.map((r) => evalScalar(arg, r, ctx)).filter((v) => v != null);
  const nums = (arg) =>
    vals(arg)
      .map(Number)
      .filter((n) => Number.isFinite(n));
  switch (fn.name) {
    case 'COUNT':
      if (fn.args.length === 0) return rows.length;
      if (fn.distinct) return new Set(vals(fn.args[0])).size;
      return vals(fn.args[0]).length;
    case 'SUM':
      return nums(fn.args[0]).reduce((a, b) => a + b, 0);
    case 'AVG': {
      const n = nums(fn.args[0]);
      return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
    }
    case 'MIN': {
      const n = nums(fn.args[0]);
      return n.length ? Math.min(...n) : null;
    }
    case 'MAX': {
      const n = nums(fn.args[0]);
      return n.length ? Math.max(...n) : null;
    }
    case 'MEDIAN': {
      const n = nums(fn.args[0]).sort((a, b) => a - b);
      if (!n.length) return null;
      const m = Math.floor(n.length / 2);
      return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2;
    }
    case 'STDDEV': {
      const n = nums(fn.args[0]);
      if (n.length < 2) return null;
      const mean = n.reduce((a, b) => a + b, 0) / n.length;
      return Math.sqrt(n.reduce((s, x) => s + (x - mean) ** 2, 0) / (n.length - 1));
    }
    case 'PERCENTILE': {
      const n = nums(fn.args[0]).sort((a, b) => a - b);
      if (!n.length) return null;
      const p = Number(evalScalar(fn.args[1], rows[0], ctx));
      const idx = Math.min(n.length - 1, Math.max(0, Math.round(p * (n.length - 1))));
      return n[idx];
    }
    default:
      return null;
  }
}

const AGG_NAMES = new Set(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'MEDIAN', 'STDDEV', 'PERCENTILE']);
function isAggExpr(expr) {
  if (!expr || expr.type !== 'func') return false;
  if (AGG_NAMES.has(expr.name)) return true;
  return expr.args?.some(isAggExpr);
}

function evalProjection(expr, groupRows, ctx) {
  if (expr.type === 'func' && AGG_NAMES.has(expr.name)) return aggregate(expr, groupRows, ctx);
  // scalar over the first row of the group (valid for grouped non-agg = group key)
  return evalScalar(expr, groupRows[0], ctx);
}

/**
 * Execute a validated query. Returns { columns, rows } where rows are plain
 * objects keyed by column name (projection alias or field/expr label).
 */
export async function execute({ ast, dataset, joined = null, admin, userId, now = Date.now() }) {
  const ctx = { now, joinPrefix: joined ? shortName(joined.name) : null };
  const notes = [];

  const work = (async () => {
    let rows = await sourceRows({ ast, dataset, joined, admin, userId, now, notes });

    const hasGroupBy = Array.isArray(ast.groupBy) && ast.groupBy.length > 0;
    const selectHasAgg = ast.select?.some((s) => isAggExpr(s.expr));

    // Column labels
    const label = (item) =>
      item.alias ||
      (item.expr.type === 'field'
        ? item.expr.name
        : item.expr.type === 'func'
          ? `${item.expr.name.toLowerCase()}`
          : 'value');

    let outRows;
    let columns;

    if (hasGroupBy || selectHasAgg) {
      // group rows
      const groups = new Map();
      const keyOf = (r) => (hasGroupBy ? ast.groupBy.map((f) => r[f]).join(' ') : '__all__');
      for (const r of rows) {
        const k = keyOf(r);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      }
      const projection =
        ast.select ||
        (hasGroupBy
          ? ast.groupBy.map((f) => ({ expr: { type: 'field', name: f }, alias: null }))
          : []);
      columns = projection.map(label);
      outRows = [];
      for (const groupRows of groups.values()) {
        // HAVING (aggregate predicate over the group)
        if (ast.having && !evalGroupPredicate(ast.having, groupRows, ctx)) continue;
        const rec = {};
        projection.forEach((item, idx) => {
          rec[columns[idx]] = evalProjection(item.expr, groupRows, ctx);
        });
        outRows.push(rec);
      }
    } else {
      // row projection
      const defaults = [...dataset.defaultProjection];
      if (joined && ast.join && !ast.join.semi) {
        const prefix = shortName(joined.name);
        defaults.push(...joined.defaultProjection.map((f) => `${prefix}.${f}`));
      }
      const projection =
        ast.select || defaults.map((f) => ({ expr: { type: 'field', name: f }, alias: null }));
      columns = projection.map(label);
      outRows = rows.map((r) => {
        const rec = {};
        projection.forEach((item, idx) => {
          rec[columns[idx]] = evalScalar(item.expr, r, ctx);
        });
        return rec;
      });
    }

    // ORDER BY (supports select aliases / field names present in output)
    if (ast.orderBy?.length) {
      outRows.sort((ra, rb) => {
        for (const s of ast.orderBy) {
          const av = ra[s.field];
          const bv = rb[s.field];
          const cmp = compareVals(av, bv);
          if (cmp !== 0) return s.dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    // LIMIT / OFFSET (default limit from catalog if none given)
    const offset = ast.offset || 0;
    const limit = ast.limit != null ? ast.limit : dataset.defaultLimit;
    outRows = outRows.slice(offset, offset + limit);

    return { columns, rows: outRows, rowCount: outRows.length, notes };
  })();

  return Promise.race([
    work,
    new Promise((_, reject) =>
      setTimeout(() => reject(new EzanaQLError('Query timed out (10s limit).')), TIMEOUT_MS),
    ),
  ]);
}

function evalGroupPredicate(pred, groupRows, ctx) {
  // Evaluate a HAVING predicate whose comparands may be aggregates.
  const resolve = (expr) => {
    if (expr.type === 'func' && AGG_NAMES.has(expr.name)) return aggregate(expr, groupRows, ctx);
    return evalScalar(expr, groupRows[0], ctx);
  };
  const walk = (p) => {
    switch (p.type) {
      case 'and':
        return walk(p.left) && walk(p.right);
      case 'or':
        return walk(p.left) || walk(p.right);
      case 'not':
        return !walk(p.expr);
      case 'compare': {
        const l = resolve(p.left);
        const r = resolve(p.right);
        return compareVals(l, r) === 0
          ? p.op === '=' || p.op === '>=' || p.op === '<='
          : p.op === '!='
            ? true
            : p.op === '>' || p.op === '>='
              ? compareVals(l, r) > 0
              : p.op === '<' || p.op === '<='
                ? compareVals(l, r) < 0
                : false;
      }
      default:
        return true;
    }
  };
  return walk(pred);
}

function compareVals(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}
