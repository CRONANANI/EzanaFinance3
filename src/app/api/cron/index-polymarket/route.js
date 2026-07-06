import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedTexts, EMBED_MODEL, hasEmbeddingKey } from '@/lib/embeddings';

/**
 * Rebuild the Polymarket semantic index (polymarket_market_index).
 *
 * Polymarket has thousands of active markets — far too many to embed per
 * request — so this cron paginates Gamma (closed=false&active=true, by volume),
 * embeds each market's `question + description` (text-embedding-3-small), and
 * upserts the vector + metadata. findMatchingMarkets then does a pgvector
 * nearest-neighbour query against an article embedding. Market text is stable
 * enough to cache and re-index every couple hours. NO mock data.
 *
 * Auth: CRON_SECRET bearer (or ?key= fallback for header-less cron platforms).
 *   GET /api/cron/index-polymarket?maxMarkets=1500&pageSize=100
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const EMBED_BATCH = 100; // strings per OpenAI embeddings request
const DEFAULT_MAX = 1500; // markets per run (bounds embedding cost)

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

const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Parse a market's first outcome price → yes probability (0..1) or null. */
function yesPrice(m) {
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

function marketTags(m) {
  const out = [];
  for (const t of Array.isArray(m?.tags) ? m.tags : []) {
    const s = typeof t === 'string' ? t : t?.slug || t?.label;
    if (s) out.push(String(s));
  }
  return out;
}

/** Gamma market → { row (no embedding), text } for embedding + upsert. */
function toRow(m) {
  const question = String(m?.question ?? m?.title ?? '').trim();
  const description = typeof m?.description === 'string' ? m.description : '';
  const marketId = String(m?.id ?? m?.conditionId ?? '');
  if (!marketId || !question) return null;
  return {
    text: `${question}\n${description}`.trim(),
    row: {
      market_id: marketId,
      question,
      description,
      group_slug: m?.groupSlug || m?.group_slug || null,
      event_slug: m?.eventSlug || m?.event_slug || null,
      slug: m?.slug || m?.marketSlug || null,
      volume: Number(m?.volume ?? m?.volumeNum ?? 0) || 0,
      volume24hr: Number(m?.volume24hr ?? m?.volume24Hr ?? 0) || 0,
      liquidity: Number(m?.liquidity ?? 0) || 0,
      end_date: m?.endDate || m?.end_date_iso || null,
      yes_price: yesPrice(m),
      icon: m?.icon || m?.image || null,
      category: m?.category || null,
      tags: marketTags(m),
      active: Boolean(m?.active) && !m?.closed,
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!supaConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
  }
  if (!hasEmbeddingKey()) {
    return NextResponse.json(
      { ok: false, error: 'OPENAI_API_KEY not configured' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const maxMarkets = Math.min(
    Math.max(Number(searchParams.get('maxMarkets')) || DEFAULT_MAX, 1),
    5000,
  );
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 100, 1), 100);

  const admin = getAdminClient();
  const errors = [];

  // 1) paginate Gamma → dedup rows
  const rowsById = new Map();
  for (let offset = 0; rowsById.size < maxMarkets; offset += pageSize) {
    const page = await fetchGammaPage(offset, pageSize);
    if (!page.length) break;
    for (const m of page) {
      const mapped = toRow(m);
      if (mapped && !rowsById.has(mapped.row.market_id)) rowsById.set(mapped.row.market_id, mapped);
      if (rowsById.size >= maxMarkets) break;
    }
    if (page.length < pageSize) break; // last page
  }
  const items = [...rowsById.values()];
  if (!items.length) {
    return NextResponse.json({ ok: true, fetched: 0, embedded: 0, upserted: 0, errors });
  }

  // 2) embed in batches, 3) upsert with the vector
  let embedded = 0;
  let upserted = 0;
  const stamp = new Date().toISOString();
  for (let i = 0; i < items.length; i += EMBED_BATCH) {
    const batch = items.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch.map((b) => b.text));
    if (!vectors) {
      errors.push(`embed batch @${i}: failed`);
      break; // stop on embedding failure (don't burn budget on a broken key)
    }
    const upsertRows = [];
    for (let j = 0; j < batch.length; j++) {
      const vec = vectors[j];
      if (!Array.isArray(vec) || !vec.length) continue;
      embedded += 1;
      upsertRows.push({
        ...batch[j].row,
        // pgvector accepts its text form '[.. ]'; JSON.stringify yields exactly that
        embedding: JSON.stringify(vec),
        embed_model: EMBED_MODEL,
        indexed_at: stamp,
      });
    }
    if (upsertRows.length) {
      const { error } = await admin
        .from('polymarket_market_index')
        .upsert(upsertRows, { onConflict: 'market_id' });
      if (error) errors.push(`upsert @${i}: ${error.message}`);
      else upserted += upsertRows.length;
    }
  }

  // 4) prune long-resolved markets so the index stays bounded
  let pruned = 0;
  try {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await admin
      .from('polymarket_market_index')
      .delete({ count: 'exact' })
      .lt('end_date', cutoff);
    pruned = count || 0;
  } catch {
    /* prune is best-effort */
  }

  return NextResponse.json({
    ok: true,
    fetched: items.length,
    embedded,
    upserted,
    pruned,
    model: EMBED_MODEL,
    errors: errors.slice(0, 10),
  });
}
