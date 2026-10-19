import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import {
  changeOf,
  scoreTrendingBatch,
  spreadOf,
  unitPrice,
} from '@/lib/prediction-markets/trending';

/**
 * Kalshi open markets into prediction_market_index (platform=kalshi). Public
 * market data, no auth. Multivariate combo markets (KXMVE tickers) are
 * excluded. Volume is contracts traded (volume_unit=contracts), never added to
 * Polymarket dollars. Rows carry no embedding, so the related-markets matcher
 * (labelled Polymarket) does not surface them yet.
 *   GET /api/cron/index-kalshi?maxMarkets=600
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const KALSHI_BASE = 'https://external-api.kalshi.com/trade-api/v2';
const DEFAULT_MAX = 600;
const MAX_PAGES = 25;
const PAGE_LIMIT = 200;
const UPSERT_CHUNK = 200;
const STALE_DAYS = 3;
// Also keep the markets most traded in the last 24h, beyond the lifetime-volume cut.
const TRENDING_EXTRA = 200;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

const fp = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const isCombo = (s) => /^KXMVE/i.test(String(s || ''));

/** Last traded price, else the bid/ask midpoint, as YES probability (0..1). */
function probability(m) {
  const last = fp(m?.last_price_dollars);
  if (last != null && last > 0 && last < 1) return last;
  const bid = fp(m?.yes_bid_dollars);
  const ask = fp(m?.yes_ask_dollars);
  if (bid != null && ask != null && bid > 0 && ask > 0 && ask < 1 && ask >= bid) {
    return (bid + ask) / 2;
  }
  return null;
}

/** Series page. Verified in Step 0; return null if the format does not resolve. */
function seriesLink(ev) {
  const s = String(ev?.series_ticker || '').trim();
  return s ? `https://kalshi.com/markets/${s.toLowerCase()}` : null;
}

function toRow(ev, m, siblings) {
  const ticker = String(m?.ticker || '');
  if (!ticker || isCombo(ticker) || isCombo(ev?.event_ticker) || m?.mve_collection_ticker) {
    return null;
  }
  const status = String(m?.status || '').toLowerCase();
  if (status && status !== 'active' && status !== 'open') return null;
  const evTitle = String(ev?.title || '').trim();
  const sub = String(m?.yes_sub_title || '').trim();
  const question = (
    siblings > 1 && evTitle && sub ? `${evTitle}: ${sub}` : String(m?.title || evTitle)
  ).trim();
  if (!question) return null;
  const bid = unitPrice(m?.yes_bid_dollars);
  const ask = unitPrice(m?.yes_ask_dollars);
  return {
    market_id: `kalshi:${ticker}`,
    adj_ticker: null,
    platform: 'kalshi',
    event_key: ev?.event_ticker ? `kalshi:${ev.event_ticker}` : null,
    event_title: evTitle || null,
    outcome_label: siblings > 1 && sub ? sub : null,
    recurrence: null,
    question,
    description:
      typeof m?.rules_primary === 'string' && m.rules_primary
        ? m.rules_primary.slice(0, 2000)
        : null,
    probability: probability(m),
    volume: fp(m?.volume_fp) ?? fp(m?.volume) ?? 0,
    volume_unit: 'contracts',
    volume_24h: fp(m?.volume_24h_fp) ?? fp(m?.volume_24h) ?? 0,
    price_change_24h: changeOf(
      unitPrice(m?.last_price_dollars),
      unitPrice(m?.previous_price_dollars),
    ),
    best_bid: bid,
    best_ask: ask,
    spread: spreadOf(bid, ask),
    liquidity: null,
    end_date: m?.close_time || null,
    status: 'active',
    link: seriesLink(ev),
    category: ev?.category || null,
  };
}

async function fetchEvents(cursor) {
  const params = new URLSearchParams({
    status: 'open',
    with_nested_markets: 'true',
    limit: String(PAGE_LIMIT),
  });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${KALSHI_BASE}/events?${params}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`kalshi events ${res.status}`);
  const json = await res.json();
  return {
    events: Array.isArray(json?.events) ? json.events : [],
    cursor: json?.cursor || null,
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const maxMarkets = Math.min(
    Math.max(Number(searchParams.get('maxMarkets')) || DEFAULT_MAX, 1),
    2000,
  );

  const admin = getAdminClient();
  const errors = [];

  // 1) walk open events with their markets
  const byId = new Map();
  let cursor = null;
  let pages = 0;
  for (; pages < MAX_PAGES; pages += 1) {
    let out;
    try {
      // eslint-disable-next-line no-await-in-loop
      out = await fetchEvents(cursor);
    } catch (e) {
      errors.push(String(e?.message || e));
      break;
    }
    for (const ev of out.events) {
      if (isCombo(ev?.event_ticker)) continue;
      const markets = Array.isArray(ev?.markets) ? ev.markets : [];
      for (const m of markets) {
        const row = toRow(ev, m, markets.length);
        if (row && !byId.has(row.market_id)) byId.set(row.market_id, row);
      }
    }
    if (!out.cursor || !out.events.length) break;
    cursor = out.cursor;
  }

  // 2) keep the most traded overall, plus the most traded in the last 24h,
  //    then score the kept batch for trending
  const stamp = new Date().toISOString();
  const traded = [...byId.values()].filter((r) => r.volume > 0);
  const keep = new Map();
  for (const r of [...traded].sort((a, b) => b.volume - a.volume).slice(0, maxMarkets)) {
    keep.set(r.market_id, r);
  }
  for (const r of [...traded]
    .sort((a, b) => b.volume_24h - a.volume_24h)
    .slice(0, TRENDING_EXTRA)) {
    keep.set(r.market_id, r);
  }
  const rows = scoreTrendingBatch([...keep.values()]).map((r) => ({ ...r, indexed_at: stamp }));

  // 3) upsert
  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('prediction_market_index')
      .upsert(chunk, { onConflict: 'market_id' });
    if (error) errors.push(`upsert @${i}: ${error.message}`);
    else upserted += chunk.length;
  }

  // 4) close ended, mark unrefreshed stale, prune long-resolved
  const nowIso = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400000).toISOString();
  let closed = 0;
  let stale = 0;
  let pruned = 0;
  try {
    const r1 = await admin
      .from('prediction_market_index')
      .update({ status: 'closed' }, { count: 'exact' })
      .eq('platform', 'kalshi')
      .eq('status', 'active')
      .lt('end_date', nowIso);
    closed = r1.count || 0;
    const r2 = await admin
      .from('prediction_market_index')
      .update({ status: 'stale' }, { count: 'exact' })
      .eq('platform', 'kalshi')
      .eq('status', 'active')
      .lt('indexed_at', staleCutoff);
    stale = r2.count || 0;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const r3 = await admin
      .from('prediction_market_index')
      .delete({ count: 'exact' })
      .eq('platform', 'kalshi')
      .lt('end_date', cutoff);
    pruned = r3.count || 0;
  } catch (e) {
    errors.push(`cleanup: ${e?.message || e}`);
  }

  if (upserted || closed || stale || pruned) revalidateTag('hubs');

  return NextResponse.json({
    ok: errors.length === 0 || upserted > 0,
    pages,
    seen: byId.size,
    upserted,
    closed,
    stale,
    pruned,
    errors: errors.slice(0, 10),
  });
}
