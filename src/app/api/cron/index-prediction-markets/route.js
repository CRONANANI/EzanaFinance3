import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';

/**
 * Populate prediction_market_index for the semantic matcher. Pulls active
 * Polymarket markets (Gamma), embeds each market's `question` via the Supabase
 * gte-small edge function (384-dim), and upserts idempotently on market_id.
 *
 * Structured so a Kalshi loader can be added later behind the same MappedMarket
 * shape (platform column) without touching the matcher. Budget-capped per run
 * (bounds embed-function calls); CRON_SECRET bearer (or ?key= fallback).
 *   GET /api/cron/index-prediction-markets?maxMarkets=400&pageSize=100
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const DEFAULT_MAX = 400; // markets per run (bounds edge-embed calls)
const EMBED_CONCURRENCY = 5; // parallel embed requests
const UPSERT_CHUNK = 100;

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

/** first outcome price → implied YES probability (0..1) or null. */
function yesProbability(m) {
  const raw = m?.outcomePrices ?? m?.lastTradePrice;
  if (typeof raw === 'number' && raw > 0 && raw < 1) return raw;
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (Array.isArray(arr) && arr.length) {
    const f = Number(arr[0]);
    if (Number.isFinite(f) && f > 0 && f < 1) return f;
  }
  return null;
}

/**
 * Event-level deep link — STRICT. Polymarket's page is the EVENT, and the real
 * event slug lives on events[0].slug (top-level eventSlug/groupSlug are usually
 * empty). A market-level slug placed in an /event/ URL 404s, so we NEVER fall
 * back to it — return null when there's no verified event slug and let the row
 * carry a null link (dropped downstream instead of linking to a dead page).
 */
function marketLink(m) {
  const ev = Array.isArray(m?.events) && m.events.length ? m.events[0] : null;
  const eventSlug = m?.eventSlug || ev?.slug || m?.event_slug || m?.groupSlug || m?.group_slug;
  if (eventSlug) return `https://polymarket.com/event/${eventSlug}`;
  return null;
}

/** Gamma market → { question, row } (MappedMarket shape, platform=polymarket). */
function toRow(m) {
  const question = String(m?.question ?? m?.title ?? '').trim();
  const marketId = String(m?.id ?? m?.conditionId ?? '');
  if (!marketId || !question) return null;
  return {
    question,
    row: {
      market_id: marketId,
      adj_ticker: null,
      platform: 'polymarket',
      question,
      description: typeof m?.description === 'string' ? m.description : null,
      probability: yesProbability(m),
      volume: Number(m?.volume ?? m?.volumeNum ?? 0) || 0,
      liquidity: Number(m?.liquidity ?? 0) || 0,
      end_date: m?.endDate || m?.end_date_iso || null,
      status: 'active',
      link: marketLink(m),
      category: m?.category || null,
    },
  };
}

async function fetchGammaPage(offset, pageSize) {
  const params = new URLSearchParams({
    closed: 'false',
    active: 'true',
    limit: String(pageSize),
    offset: String(offset),
    order: 'volume',
    ascending: 'false',
  });
  try {
    const res = await fetch(`${GAMMA_BASE}/markets?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : payload?.data;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Embed `items[].question` with bounded concurrency → attaches .embedding. */
async function embedAll(items) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      items[i].embedding = await embedViaSupabase(items[i].question);
    }
  }
  await Promise.all(Array.from({ length: Math.min(EMBED_CONCURRENCY, items.length) }, worker));
  return items;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!supaEmbedConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const maxMarkets = Math.min(
    Math.max(Number(searchParams.get('maxMarkets')) || DEFAULT_MAX, 1),
    2000,
  );
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 100, 1), 100);

  const admin = getAdminClient();
  const errors = [];

  // 1) paginate Gamma → dedup
  const byId = new Map();
  for (let offset = 0; byId.size < maxMarkets; offset += pageSize) {
    const page = await fetchGammaPage(offset, pageSize);
    if (!page.length) break;
    for (const m of page) {
      const mapped = toRow(m);
      if (mapped && !byId.has(mapped.row.market_id)) byId.set(mapped.row.market_id, mapped);
      if (byId.size >= maxMarkets) break;
    }
    if (page.length < pageSize) break;
  }
  const items = [...byId.values()];
  if (!items.length) {
    return NextResponse.json({ ok: true, fetched: 0, embedded: 0, upserted: 0, errors });
  }

  // 2) embed questions (bounded concurrency)
  await embedAll(items);
  const stamp = new Date().toISOString();
  const rows = items
    .filter((it) => Array.isArray(it.embedding) && it.embedding.length === 384)
    .map((it) => ({
      ...it.row,
      embedding: JSON.stringify(it.embedding), // pgvector text form
      indexed_at: stamp,
    }));
  const embedded = rows.length;
  if (!embedded) {
    return NextResponse.json({
      ok: false,
      fetched: items.length,
      embedded: 0,
      upserted: 0,
      errors: ['embed produced no vectors (edge fn unreachable or gte-small disabled)'],
    });
  }

  // 3) upsert in chunks
  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await admin
      .from('prediction_market_index')
      .upsert(chunk, { onConflict: 'market_id' });
    if (error) errors.push(`upsert @${i}: ${error.message}`);
    else upserted += chunk.length;
  }

  // 4) prune long-resolved rows so the index stays bounded
  let pruned = 0;
  try {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await admin
      .from('prediction_market_index')
      .delete({ count: 'exact' })
      .lt('end_date', cutoff);
    pruned = count || 0;
  } catch {
    /* best-effort */
  }

  return NextResponse.json({
    ok: true,
    fetched: items.length,
    embedded,
    upserted,
    pruned,
    errors: errors.slice(0, 10),
  });
}
