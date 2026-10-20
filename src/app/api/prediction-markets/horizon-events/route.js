/**
 * GET /api/prediction-markets/horizon-events
 *
 * Scheduled events for the Event Horizon card on /datasets/prediction-markets,
 * twelve months ahead (the card trims to 3M or 6M client-side):
 *   macro     US releases rated high impact on the economic calendar
 *   earnings  the 24 largest scheduled reports by consensus revenue
 *   congress  upcoming committee meetings already ingested from Congress.gov
 *
 * Each source fails open: a source that errors or has no key returns no rows
 * and is reported 'unavailable' in `sources`, and the card says so. Nothing is
 * estimated: every row is a dated, scheduled event from its source.
 * Public, rate limited by withApiGuard, cached for 30 minutes at the CDN and
 * six hours in the warm instance.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP = 'https://financialmodelingprep.com/stable';
const DAY = 86400000;
const CHUNK_DAYS = 90;
const MONTHS = 12;
const TTL = 6 * 3600000;
const CACHE = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600';
const EARNINGS_KEEP = 24;

let memo = { at: 0, key: '', body: null };

const ymd = (t) => new Date(t).toISOString().slice(0, 10);

/** [from, to] date pairs of at most CHUNK_DAYS covering [t0, t1]. */
function chunks(t0, t1) {
  const out = [];
  for (let a = t0; a <= t1; a += (CHUNK_DAYS + 1) * DAY) {
    out.push([ymd(a), ymd(Math.min(t1, a + CHUNK_DAYS * DAY))]);
  }
  return out;
}

async function fmpRange(path, t0, t1, extra = {}) {
  const key = getFmpKey();
  if (!key) throw new Error('no key');
  const lists = await Promise.all(
    chunks(t0, t1).map(async ([from, to]) => {
      const qs = new URLSearchParams({ from, to, apikey: key, ...extra });
      const res = await fetch(`${FMP}${path}?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const j = await res.json();
      return Array.isArray(j) ? j : [];
    }),
  );
  return lists.flat();
}

/** FMP economic calendar dates are UTC 'YYYY-MM-DD HH:MM:SS'. */
const fmpIso = (s) => {
  const v = String(s || '').trim();
  if (!v) return null;
  const d = new Date(v.includes('T') ? v : `${v.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const numOrNull = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

async function macro(t0, t1) {
  const rows = await fmpRange('/economic-calendar', t0, t1, { country: 'US' });
  const seen = new Set();
  return rows
    .filter((r) => String(r?.impact || '').toLowerCase() === 'high' && r?.event)
    .map((r) => {
      const date = fmpIso(r.date);
      return {
        id: `macro:${date}:${r.event}`,
        kind: 'macro',
        date,
        title: String(r.event),
        detail: [
          numOrNull(r.estimate) != null ? `Consensus ${r.estimate}${r.unit || ''}` : null,
          numOrNull(r.previous) != null ? `Previous ${r.previous}${r.unit || ''}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    })
    .filter((e) => {
      if (!e.date || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
}

async function earnings(t0, t1) {
  const rows = await fmpRange('/earnings-calendar', t0, t1);
  return rows
    .filter((r) => r?.symbol && r?.date && numOrNull(r.revenueEstimated) > 0)
    .sort((a, b) => numOrNull(b.revenueEstimated) - numOrNull(a.revenueEstimated))
    .slice(0, EARNINGS_KEEP)
    .map((r) => ({
      id: `earnings:${r.symbol}:${r.date}`,
      kind: 'earnings',
      date: new Date(`${String(r.date).slice(0, 10)}T12:00:00Z`).toISOString(),
      title: `${r.symbol} earnings`,
      symbol: String(r.symbol),
      detail:
        numOrNull(r.epsEstimated) != null
          ? `EPS consensus ${Number(r.epsEstimated).toFixed(2)}`
          : '',
      revenueEstimated: numOrNull(r.revenueEstimated),
    }));
}

async function congress(t0, t1) {
  if (!isServerSupabaseConfigured()) throw new Error('not configured');
  const { data, error } = await getAdminClient()
    .from('congress_meetings')
    .select('event_id,chamber,committee,meeting_date,title')
    .gte('meeting_date', ymd(t0))
    .lte('meeting_date', ymd(t1))
    .order('meeting_date', { ascending: true })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((m) => m.meeting_date && (m.title || m.committee))
    .map((m) => ({
      id: `congress:${m.event_id}`,
      kind: 'congress',
      date: new Date(
        String(m.meeting_date).length <= 10 ? `${m.meeting_date}T15:00:00Z` : m.meeting_date,
      ).toISOString(),
      title: String(m.title || m.committee),
      detail: [m.chamber, m.committee].filter(Boolean).join(' · '),
    }));
}

async function settle(name, fn) {
  try {
    return { ok: true, rows: await fn() };
  } catch (e) {
    console.warn('[horizon-events]', name, e?.message || e);
    return { ok: false, rows: [] };
  }
}

export const GET = withApiGuard(
  async () => {
    const now = Date.now();
    const key = ymd(now);
    if (memo.body && memo.key === key && now - memo.at < TTL) {
      return NextResponse.json(memo.body, { headers: { 'Cache-Control': CACHE } });
    }
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + MONTHS);
    const t1 = end.getTime();
    const [m, e, c] = await Promise.all([
      settle('macro', () => macro(now, t1)),
      settle('earnings', () => earnings(now, t1)),
      settle('congress', () => congress(now, t1)),
    ]);
    const events = [...m.rows, ...e.rows, ...c.rows].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const body = {
      events,
      sources: {
        macro: m.ok ? 'ok' : 'unavailable',
        earnings: e.ok ? 'ok' : 'unavailable',
        congress: c.ok ? 'ok' : 'unavailable',
      },
      updatedAt: new Date(now).toISOString(),
    };
    if (m.ok || e.ok || c.ok) memo = { at: now, key, body };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': m.ok || e.ok || c.ok ? CACHE : 'no-store' },
    });
  },
  { requireAuth: false },
);
