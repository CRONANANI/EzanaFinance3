/**
 * Server read model for the Lobbying Activity page: one cached aggregate per
 * (view, filters), backed by the lobbying_page_* SQL functions. Shared by
 * GET /api/lobbying/page and the page's server render, which seeds the
 * above-the-fold cards so the first paint arrives with data. Server only.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import {
  CONTRIBUTION_TYPES,
  filterPayload,
  membersPayload,
  parseFilters,
  pickFilters,
  viewQuery,
} from '@/lib/lobbying/page-model';

export const LOBBYING_SOURCE = 'Senate LDA (lda.gov)';
export const LOBBYING_VIEWS = [
  'pulse',
  'issues',
  'leaders',
  'pressure',
  'rhythm',
  'door',
  'lens',
  'filings',
  'entity',
  'members',
];
const PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const KEY_RE = /^[A-Z0-9 ]{1,160}$/;
const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

async function rpc(fn, args) {
  const { data, error } = await getAdminClient().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

/* One cache entry per (view, args). The args are already validated and
   normalised, so the key space is bounded by the filter vocabulary. */
const cachedRead = unstable_cache(
  async (view, argsJson) => {
    const a = JSON.parse(argsJson);
    switch (view) {
      case 'pulse': {
        const [now, prior] = await Promise.all([
          rpc('lobbying_page_pulse', { p: a.p }),
          rpc('lobbying_page_pulse', { p: a.prior }),
        ]);
        return { now, prior };
      }
      case 'issues':
        return rpc('lobbying_page_issues', { p: a.p });
      case 'leaders':
        return rpc('lobbying_page_leaders', { p: a.p, p_by: a.by, p_limit: 15 });
      case 'pressure':
        return rpc('lobbying_page_pressure', { p: a.p });
      case 'rhythm':
        return rpc('lobbying_page_rhythm', { p: a.p });
      case 'door':
        return rpc('lobbying_page_door', { p: a.p, p_limit: 8 });
      case 'lens':
        return rpc('lobbying_page_lens', { p: a.p, p_limit: 8 });
      case 'filings':
        return rpc('lobbying_page_filings', {
          p: a.p,
          p_sort: a.sort,
          p_limit: a.pageSize,
          p_offset: (a.page - 1) * a.pageSize,
        });
      case 'entity':
        return rpc('lobbying_page_entity', { p: a.p, p_kind: a.kind, p_value: a.value });
      case 'members':
        return rpc('lobbying_page_members', { p: a.p, p_limit: 6 });
      default:
        throw new Error('unknown view');
    }
  },
  ['lobbying-page-v1'],
  { revalidate: 900, tags: ['lobbying-page'] },
);

/** Validated, view-specific args, or null when the request is malformed. */
export function argsFor(view, sp, now) {
  const filters = parseFilters(sp, now);
  const f = pickFilters(filters, view);
  switch (view) {
    case 'pulse':
      return { p: filterPayload(f, now), prior: filterPayload(f, now, 'prior') };
    case 'leaders':
      return { p: filterPayload(f, now), by: sp.get('by') === 'firm' ? 'firm' : 'client' };
    case 'filings': {
      const mode = ['public', 'largest', 'recent'].includes(sp.get('mode'))
        ? sp.get('mode')
        : 'public';
      const page = Math.min(Math.max(Math.floor(Number(sp.get('page')) || 1), 1), 400);
      const pageSize = Math.min(
        Math.max(Math.floor(Number(sp.get('pageSize')) || PAGE_SIZE), 1),
        MAX_PAGE_SIZE,
      );
      const scoped = mode === 'public' ? { ...f, public: true } : f;
      return {
        p: filterPayload(scoped, now),
        sort: mode === 'recent' ? 'recent' : 'amount',
        page,
        pageSize,
      };
    }
    case 'entity': {
      const kind = ['client', 'firm', 'ticker'].includes(sp.get('kind')) ? sp.get('kind') : null;
      const value = String(sp.get('value') || '')
        .toUpperCase()
        .trim();
      if (!kind || !(kind === 'ticker' ? TICKER_RE : KEY_RE).test(value)) return null;
      return { p: filterPayload(f, now), kind, value };
    }
    case 'members': {
      const types = String(sp.get('types') || '')
        .toLowerCase()
        .split(',')
        .filter((t) => CONTRIBUTION_TYPES.includes(t))
        .sort();
      return { p: membersPayload(filters, now, types) };
    }
    default:
      return { p: filterPayload(f, now) };
  }
}

/* The 90-day window moves every request; round it to the hour so it can
   share a cache entry. Everything else is already stable. */
function cacheKey(args) {
  return JSON.stringify(args).replace(
    /"(from|to)":"(\d{4}-\d{2}-\d{2}T\d{2}):[^"]*"/g,
    '"$1":"$2:00:00.000Z"',
  );
}

/**
 * Read one view for validated args (see argsFor). Throws on a database error.
 * @returns {Promise<any>}
 */
export function readView(view, args) {
  return cachedRead(view, cacheKey(args));
}

/* Above the fold: what the first screen shows. */
const FIRST_PAINT = [
  ['issues', {}],
  ['pulse', {}],
  ['leaders', { by: 'client' }],
];

/**
 * The above-the-fold views for a page request, keyed by the exact query
 * string the client asks for (viewQuery), so the page can paint them
 * without a round trip. Waits at most `budgetMs`; a view still loading by
 * then is left to the client (its read keeps warming the cache).
 * @param {Record<string, string|string[]|undefined>} searchParams
 * @returns {Promise<Record<string, any>>}
 */
export async function readFirstPaint(searchParams, budgetMs = 1200) {
  if (!isServerSupabaseConfigured()) return {};
  const now = Date.now();
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (typeof v === 'string') sp.set(k, v);
  }
  const filters = parseFilters(sp, now);
  const out = {};
  const reads = FIRST_PAINT.map(async ([view, extra]) => {
    const query = viewQuery(view, filters, now, extra);
    const args = argsFor(view, new URLSearchParams(query), now);
    if (!args) return;
    try {
      out[query] = await readView(view, args);
    } catch {
      /* the card fetches it itself and shows its own Retry */
    }
  });
  let timer;
  await Promise.race([
    Promise.all(reads),
    new Promise((resolve) => {
      timer = setTimeout(resolve, budgetMs);
    }),
  ]);
  clearTimeout(timer);
  return { ...out };
}
