/**
 * GET /api/lobbying/page?view=<view>&<filters>
 *
 * The Lobbying Activity page's read model: one cache-only aggregate per card,
 * backed by the lobbying_page_* SQL functions (migration
 * 20261021120000_lobbying_page_aggregates.sql). Filters are parsed by the
 * same page-model.js the page uses, and each view reads only the filters its
 * card applies (FILTERS_APPLY), so server and client always agree.
 *
 * views
 *   pulse      { now, prior }            Influence Pulse, current and same period last year
 *   issues     { total, issues[] }       every issue area with filing counts (chips + landscape)
 *   leaders    { totalSpend, rows[] }    ?by=client|firm
 *   pressure   { total, issues, entities, cells }   filing counts only, never dollars
 *   rhythm     [{ year, quarter, filings, spend }]
 *   door       { filings, doorFilings, lobbyists, firms[] }
 *   lens       [{ ticker, company, verified, spend, filings, topIssue }]
 *   filings    { count, rows[] }         ?mode=public|largest|recent&page=
 *   entity     drawer / company modal    ?kind=client|firm|ticker&value=
 *   members    LD-203 totals and rankings ?types=feca,he,...
 *
 * Shape: { ok, source, view, data } (data null when the store is not
 * configured). Errors are 503 so a card can show its own Retry. Public,
 * rate limited, cached 15 minutes per view and filter set. No mock data.
 */
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  CONTRIBUTION_TYPES,
  filterPayload,
  membersPayload,
  parseFilters,
  pickFilters,
} from '@/lib/lobbying/page-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'Senate LDA (lda.gov)';
const VIEWS = [
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
function argsFor(view, sp, now) {
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

export async function GET(request) {
  const rl = await checkRateLimit(`lobbying:page:${getClientIp(request)}`, { limit: 240 });
  if (!rl.success) return rateLimitResponse(rl);

  const sp = new URL(request.url).searchParams;
  const view = sp.get('view');
  if (!VIEWS.includes(view)) {
    return NextResponse.json({ ok: false, error: 'Unknown view' }, { status: 400 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ ok: true, source: SOURCE, view, data: null });
  }

  const now = Date.now();
  const args = argsFor(view, sp, now);
  if (!args) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });

  /* The 90-day window moves every request; round it to the hour so it can
     share a cache entry. Everything else is already stable. */
  const key = JSON.stringify(args).replace(
    /"(from|to)":"(\d{4}-\d{2}-\d{2}T\d{2}):[^"]*"/g,
    '"$1":"$2:00:00.000Z"',
  );

  try {
    const data = await cachedRead(view, key);
    return NextResponse.json(
      { ok: true, source: SOURCE, view, data },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } },
    );
  } catch (err) {
    console.error('[lobbying/page]', view, err?.message);
    return NextResponse.json(
      { ok: false, source: SOURCE, view, error: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
