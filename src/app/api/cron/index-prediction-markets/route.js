import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { scoreTrendingBatch, spreadOf, unitPrice } from '@/lib/prediction-markets/trending';
import { attachWindowMetrics, writeSnapshots } from '@/lib/prediction-markets/snapshot-store';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/* Logged once per instance when the events refresh function is missing. */
let warnedEventsMissing = false;

/**
 * Populate prediction_market_index (Polymarket rows) for the semantic matcher
 * and The Hive. Pulls open Polymarket markets from Gamma, highest dollar volume
 * first, embeds new or changed questions with the Supabase gte-small edge
 * function (384-dim), reuses stored vectors for unchanged questions, and
 * upserts on market_id. Kalshi has its own loader (index-kalshi) on the same
 * table. Each run also stores the market's Polymarket tag ids (mapped to the
 * page taxonomy by normalizeCategory), its 7d/30d window figures from the
 * snapshot history, and a fresh snapshot (prediction_market_snapshots). Markets past their end date are closed; markets not refreshed in
 * STALE_DAYS are marked stale so old odds are never shown as current.
 *   GET /api/cron/index-prediction-markets?maxMarkets=2000&pageSize=100
 * Auth: Bearer cron secret, checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const DEFAULT_MAX = 400; // markets per run
const EMBED_CONCURRENCY = 5; // parallel embed requests
const UPSERT_CHUNK = 100;
const LOOKUP_CHUNK = 200; // ids per existing-embedding lookup
const STALE_DAYS = 3;
// Extra pages ordered by 24h volume, so a market heating up today is indexed
// even when its lifetime volume sits below the main cut.
const TRENDING_PAGES = 3;

const finite = (v) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : null;
};

/** CLOB token id for outcome 0 (the YES side we store as probability), or null. */
function yesTokenId(m) {
  let ids = m?.clobTokenIds;
  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch {
      return null;
    }
  }
  return Array.isArray(ids) && ids[0] ? String(ids[0]) : null;
}

/** Tag ids from a Gamma market fetched with include_tag=true, as strings. */
function tagIds(m) {
  const tags = Array.isArray(m?.tags) ? m.tags : [];
  const ids = tags.map((t) => (t && t.id != null ? String(t.id) : null)).filter(Boolean);
  return ids.length ? ids : null;
}

/** First outcome price as implied YES probability (0..1), or null. */
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
 * Event-level deep link, strict. Polymarket's page is the EVENT, and the real
 * event slug lives on events[0].slug. A market-level slug in an /event/ URL
 * 404s, so we never fall back to it; no verified slug means a null link.
 */
function marketLink(m) {
  const ev = Array.isArray(m?.events) && m.events.length ? m.events[0] : null;
  const eventSlug = m?.eventSlug || ev?.slug || m?.event_slug || m?.groupSlug || m?.group_slug;
  if (eventSlug) return `https://polymarket.com/event/${eventSlug}`;
  return null;
}

/**
 * Event grouping fields from Gamma. Outcomes of one event share event_key so
 * trending shows one card per event. recurrence is the series cadence; the
 * scorer skips short cycles (daily, hourly) that are re-listed every period.
 */
function eventInfo(m) {
  const ev = Array.isArray(m?.events) && m.events.length ? m.events[0] : null;
  const evId = ev?.id ?? ev?.slug ?? null;
  const series = Array.isArray(ev?.series) && ev.series.length ? ev.series[0] : null;
  const label = String(m?.groupItemTitle || '').trim();
  return {
    event_key: evId != null && evId !== '' ? `polymarket:${evId}` : null,
    event_title: typeof ev?.title === 'string' && ev.title.trim() ? ev.title.trim() : null,
    outcome_label: label || null,
    recurrence:
      typeof series?.recurrence === 'string' && series.recurrence.trim()
        ? series.recurrence.trim().toLowerCase()
        : null,
  };
}

/** Gamma market to { question, row } (MappedMarket shape, platform=polymarket). */
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
      ...eventInfo(m),
      question,
      description: typeof m?.description === 'string' ? m.description : null,
      probability: yesProbability(m),
      // volumeNum is the numeric field; volume is the same figure as a string.
      volume: Number(m?.volumeNum ?? m?.volume ?? 0) || 0,
      volume_unit: 'usd',
      volume_24h: finite(m?.volume24hr) ?? 0,
      price_change_24h: finite(m?.oneDayPriceChange),
      best_bid: unitPrice(m?.bestBid),
      best_ask: unitPrice(m?.bestAsk),
      spread:
        spreadOf(unitPrice(m?.bestBid), unitPrice(m?.bestAsk)) ??
        (finite(m?.spread) != null && finite(m?.spread) >= 0 && finite(m?.spread) < 1
          ? finite(m.spread)
          : null),
      yes_token_id: yesTokenId(m),
      liquidity: Number(m?.liquidityNum ?? m?.liquidity ?? 0) || 0,
      end_date: m?.endDate || m?.end_date_iso || null,
      status: 'active',
      link: marketLink(m),
      category: m?.category || null,
      tag_ids: tagIds(m),
    },
  };
}

async function fetchGammaPage(offset, pageSize, order = 'volumeNum') {
  const params = new URLSearchParams({
    closed: 'false',
    active: 'true',
    limit: String(pageSize),
    offset: String(offset),
    // volumeNum, not volume: volume is a string and sorts as text.
    order,
    ascending: 'false',
    // Tags inline, so each row carries its categories without extra calls.
    include_tag: 'true',
  });
  try {
    const res = await fetch(`${GAMMA_BASE}/markets?${params}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : payload?.data;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Embed items[].question with bounded concurrency; attaches .embedding. */
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

/** market_id -> stored question, for rows that already carry an embedding. */
async function embeddedQuestions(admin, ids) {
  const known = new Map();
  for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('prediction_market_index')
      .select('market_id, question')
      .in('market_id', ids.slice(i, i + LOOKUP_CHUNK))
      .not('embedding', 'is', null);
    if (error) throw new Error(error.message);
    for (const r of data || []) known.set(r.market_id, r.question);
  }
  return known;
}

async function upsertChunks(admin, rows, errors, label) {
  let n = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('prediction_market_index')
      .upsert(chunk, { onConflict: 'market_id' });
    if (error) errors.push(`${label} upsert @${i}: ${error.message}`);
    else n += chunk.length;
  }
  return n;
}

async function run(request) {
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

  // 1) paginate Gamma, highest dollar volume first, dedupe
  const byId = new Map();
  for (let offset = 0; byId.size < maxMarkets; offset += pageSize) {
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchGammaPage(offset, pageSize);
    if (!page.length) break;
    for (const m of page) {
      const mapped = toRow(m);
      if (mapped && !byId.has(mapped.row.market_id)) byId.set(mapped.row.market_id, mapped);
      if (byId.size >= maxMarkets) break;
    }
    if (page.length < pageSize) break;
  }
  // 1b) the most active by 24h volume, deduped into the same map
  for (let n = 0, offset = 0; n < TRENDING_PAGES; n += 1, offset += pageSize) {
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchGammaPage(offset, pageSize, 'volume24hr');
    if (!page.length) break;
    for (const m of page) {
      const mapped = toRow(m);
      if (mapped && !byId.has(mapped.row.market_id)) byId.set(mapped.row.market_id, mapped);
    }
    if (page.length < pageSize) break;
  }
  const items = [...byId.values()];
  if (!items.length) {
    return NextResponse.json({ ok: true, fetched: 0, embedded: 0, reused: 0, upserted: 0, errors });
  }
  // Score before the rows are split into fresh/reuse batches below.
  scoreTrendingBatch(items.map((it) => it.row));
  // 7d/30d figures from the snapshot history, on the same row objects.
  const runAt = new Date();
  const wm = await attachWindowMetrics(
    admin,
    items.map((it) => it.row),
    runAt,
  );
  if (!wm.ok) errors.push(wm.error);

  // 2) embed only new or changed questions; reuse the stored vector otherwise
  let known = new Map();
  try {
    known = await embeddedQuestions(
      admin,
      items.map((it) => it.row.market_id),
    );
  } catch (e) {
    errors.push(`lookup: ${e?.message || e}`);
  }
  const reuse = items.filter((it) => known.get(it.row.market_id) === it.question);
  const fresh = items.filter((it) => known.get(it.row.market_id) !== it.question);
  await embedAll(fresh);

  const stamp = new Date().toISOString();
  const freshRows = fresh
    .filter((it) => Array.isArray(it.embedding) && it.embedding.length === 384)
    .map((it) => ({
      ...it.row,
      embedding: JSON.stringify(it.embedding), // pgvector text form
      indexed_at: stamp,
    }));
  // No embedding key at all, so the upsert leaves the stored vector untouched.
  const reuseRows = reuse.map((it) => ({ ...it.row, indexed_at: stamp }));

  if (!freshRows.length && !reuseRows.length) {
    return NextResponse.json({
      ok: false,
      fetched: items.length,
      embedded: 0,
      reused: 0,
      upserted: 0,
      errors: ['embed produced no vectors (edge fn unreachable or gte-small disabled)'],
    });
  }

  // 3) upsert: two homogeneous batches so no row overwrites a vector with null
  const upserted =
    (await upsertChunks(admin, freshRows, errors, 'fresh')) +
    (await upsertChunks(admin, reuseRows, errors, 'reuse'));

  // 3b) one snapshot per indexed market, then prune past the retention window
  const snap = await writeSnapshots(admin, 'polymarket', [...freshRows, ...reuseRows], stamp);
  errors.push(...snap.errors);

  // 4) close ended markets, mark unrefreshed ones stale, prune long-resolved rows
  const nowIso = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400000).toISOString();
  let closed = 0;
  let stale = 0;
  let pruned = 0;
  try {
    const r1 = await admin
      .from('prediction_market_index')
      .update({ status: 'closed' }, { count: 'exact' })
      .eq('platform', 'polymarket')
      .eq('status', 'active')
      .lt('end_date', nowIso);
    closed = r1.count || 0;
    const r2 = await admin
      .from('prediction_market_index')
      .update({ status: 'stale' }, { count: 'exact' })
      .eq('platform', 'polymarket')
      .eq('status', 'active')
      .lt('indexed_at', staleCutoff);
    stale = r2.count || 0;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const r3 = await admin
      .from('prediction_market_index')
      .delete({ count: 'exact' })
      .eq('platform', 'polymarket')
      .lt('end_date', cutoff);
    pruned = r3.count || 0;
  } catch (e) {
    errors.push(`cleanup: ${e?.message || e}`);
  }

  // The dimension hubs summarise this table.
  if (upserted || closed || stale || pruned) {
    revalidateTag('hubs');
    revalidateTag('api-v1-hive');
  }

  // 5) refresh the API's events read model (prediction_events_mat). The
  // function ships in a hand-applied SQL file; until it exists this is a
  // soft skip, logged once per instance.
  let eventsRefreshed = false;
  try {
    const { error: refreshError } = await admin.rpc('refresh_prediction_events');
    if (!refreshError) {
      eventsRefreshed = true;
      revalidateTag('pm-api');
    } else if (refreshError.code === 'PGRST202' || refreshError.code === '42883') {
      if (!warnedEventsMissing) {
        warnedEventsMissing = true;
        console.warn('[index-prediction-markets] refresh_prediction_events() is not installed yet');
      }
    } else {
      errors.push(`events refresh: ${refreshError.message}`);
    }
  } catch (e) {
    errors.push(`events refresh: ${e?.message || e}`);
  }

  return NextResponse.json({
    ok: true,
    fetched: items.length,
    embedded: freshRows.length,
    reused: reuseRows.length,
    upserted,
    closed,
    stale,
    pruned,
    snapshots: snap.written,
    snapshotsPruned: snap.pruned,
    eventsRefreshed,
    errors: errors.slice(0, 10),
  });
}

export const GET = cronRoute('index-prediction-markets', run, { ttlSeconds: 360 });
