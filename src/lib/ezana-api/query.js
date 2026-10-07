/**
 * Shared list behaviour for every live /v1 list endpoint. Pure (tested by
 * scripts/check-ezana-api.mjs).
 *
 *   parseParams(endpoint, searchParams)  validate against the registry: types,
 *                                        lengths, formats, enums; unknown
 *                                        params are an error
 *   encodeCursor / decodeCursor          opaque base64url cursor over the
 *                                        sort key values of the last row
 *   keysetOr(keys, values)               the PostgREST `or` filter that
 *                                        continues after that row
 *   delayCutoff(days, now)               newest date a delayed key may see
 */
import { PARAMS } from './registry';

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;
const MAX_TICKERS = 20;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Validate the query string for an endpoint. Returns a plain object with
 * typed values (tickers upper-cased into an array; limit defaulted).
 * Throws ApiError(400, 'invalid_param') on anything else.
 */
export function parseParams(endpoint, searchParams) {
  const allowed = new Set(endpoint.params || []);
  const out = {};
  for (const name of new Set(searchParams.keys())) {
    if (!allowed.has(name)) {
      throw new ApiError(400, 'invalid_param', `Unknown parameter "${name}" for ${endpoint.path}.`);
    }
    const spec = PARAMS[name];
    const values = searchParams.getAll(name);
    if (!spec.repeatable && values.length > 1) {
      throw new ApiError(400, 'invalid_param', `"${name}" may appear only once.`);
    }
    const parsed = values.map((raw) => {
      const v = String(raw).trim();
      if (!v) throw new ApiError(400, 'invalid_param', `"${name}" is empty.`);
      if (spec.max && spec.type === 'string' && v.length > spec.max) {
        throw new ApiError(400, 'invalid_param', `"${name}" is too long.`);
      }
      switch (spec.type) {
        case 'date':
          if (!validDate(v))
            throw new ApiError(400, 'invalid_param', `"${name}" must be a date like 2026-01-31.`);
          return v;
        case 'int': {
          if (!/^\d+$/.test(v))
            throw new ApiError(400, 'invalid_param', `"${name}" must be a whole number.`);
          const n = Number(v);
          if ((spec.min != null && n < spec.min) || (spec.max != null && n > spec.max)) {
            throw new ApiError(
              400,
              'invalid_param',
              `"${name}" must be between ${spec.min} and ${spec.max}.`,
            );
          }
          return n;
        }
        case 'number': {
          const n = Number(v);
          if (!/^\d+(\.\d+)?$/.test(v) || !Number.isFinite(n))
            throw new ApiError(400, 'invalid_param', `"${name}" must be a non-negative number.`);
          return n;
        }
        default:
          if (spec.enum && !spec.enum.includes(v))
            throw new ApiError(
              400,
              'invalid_param',
              `"${name}" must be one of ${spec.enum.join(', ')}.`,
            );
          if (spec.pattern && !spec.pattern.test(v))
            throw new ApiError(400, 'invalid_param', `"${name}" is not in the expected format.`);
          return v;
      }
    });
    out[name] = spec.repeatable ? parsed : parsed[0];
  }
  if (out.ticker) {
    if (out.ticker.length > MAX_TICKERS)
      throw new ApiError(400, 'invalid_param', `At most ${MAX_TICKERS} tickers per request.`);
    out.ticker = [...new Set(out.ticker.map((t) => t.toUpperCase()))];
  }
  if (out.from && out.to && out.from > out.to) {
    throw new ApiError(400, 'invalid_param', '"from" is after "to".');
  }
  if (allowed.has('limit')) out.limit = out.limit ?? DEFAULT_LIMIT;
  if (out.cursor != null) out.cursor = decodeCursor(out.cursor);
  return out;
}

/** Cursor: base64url JSON array of the last row's sort key values. */
export function encodeCursor(values) {
  return Buffer.from(JSON.stringify(values)).toString('base64url');
}

export function decodeCursor(cursor) {
  try {
    const v = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (Array.isArray(v) && v.length && v.every((x) => ['string', 'number'].includes(typeof x))) {
      return v;
    }
  } catch {
    /* fall through */
  }
  throw new ApiError(400, 'invalid_param', 'The cursor is not valid. Start again without it.');
}

/* PostgREST value quoting inside or(): double-quote and escape. */
const q = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * Keyset continuation for a descending sort over `keys` (all non-null):
 * (k1 < v1) or (k1 = v1 and k2 < v2) or ... as a PostgREST or() string.
 */
export function keysetOr(keys, values, dir = 'desc') {
  if (keys.length !== values.length)
    throw new ApiError(400, 'invalid_param', 'The cursor is not valid.');
  const cmp = dir === 'desc' ? 'lt' : 'gt';
  const terms = keys.map((k, i) => {
    const eqs = keys.slice(0, i).map((kk, j) => `${kk}.eq.${q(values[j])}`);
    const last = `${k}.${cmp}.${q(values[i])}`;
    return eqs.length ? `and(${[...eqs, last].join(',')})` : last;
  });
  return terms.join(',');
}

/** ISO date: rows newer than this are hidden from a key delayed by `days`. */
export function delayCutoff(days, now = new Date()) {
  if (!days) return null;
  return new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
}

/**
 * Page envelope from `limit + 1` fetched rows: { rows, page } where page.next
 * is the cursor after the last returned row.
 */
export function pageOf(rows, limit, keyOf) {
  const has_more = rows.length > limit;
  const kept = has_more ? rows.slice(0, limit) : rows;
  return {
    rows: kept,
    page: {
      limit,
      has_more,
      next: has_more && kept.length ? encodeCursor(keyOf(kept[kept.length - 1])) : null,
    },
  };
}
