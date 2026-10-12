import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

/**
 * Manifold open binary questions into crowd_forecasts. Public API, no auth,
 * 500 requests a minute per IP. Manifold is play money, so these are kept out
 * of prediction_market_index and ranked by how many people forecast, not by
 * volume. Questions with fewer than MIN_FORECASTERS are skipped.
 *   GET /api/cron/index-manifold?max=500
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const MANIFOLD_BASE = 'https://api.manifold.markets/v0';
const DEFAULT_MAX = 500;
const PAGE = 250;
const MIN_FORECASTERS = 10;
const UPSERT_CHUNK = 200;
const STALE_DAYS = 3;
const USER_AGENT = 'EzanaFinance/1.0 (+https://ezana.world)';

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

function toRow(m) {
  const id = String(m?.id || '');
  const question = String(m?.question || '').trim();
  if (!id || !question || m?.isResolved) return null;
  const forecasters = Number(m?.uniqueBettorCount);
  if (!Number.isFinite(forecasters) || forecasters < MIN_FORECASTERS) return null;
  const p = Number(m?.probability);
  const close = Number(m?.closeTime);
  const vol = Number(m?.volume);
  return {
    forecast_id: `manifold:${id}`,
    platform: 'manifold',
    question,
    probability: Number.isFinite(p) && p >= 0 && p <= 1 ? p : null,
    forecasters: Math.round(forecasters),
    volume: Number.isFinite(vol) ? vol : null,
    volume_unit: 'mana',
    token: m?.token || 'MANA',
    close_date: Number.isFinite(close) && close > 0 ? new Date(close).toISOString() : null,
    status: 'open',
    link: typeof m?.url === 'string' ? m.url : null,
    category: null,
  };
}

async function fetchPage(offset) {
  const params = new URLSearchParams({
    term: '',
    filter: 'open',
    contractType: 'BINARY',
    sort: 'most-popular',
    limit: String(PAGE),
    offset: String(offset),
  });
  const res = await fetch(`${MANIFOLD_BASE}/search-markets?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`manifold search ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const max = Math.min(Math.max(Number(searchParams.get('max')) || DEFAULT_MAX, 1), 1000);

  const admin = getAdminClient();
  const errors = [];
  const byId = new Map();

  for (let offset = 0; offset < max; offset += PAGE) {
    let page;
    try {
      // eslint-disable-next-line no-await-in-loop
      page = await fetchPage(offset);
    } catch (e) {
      errors.push(String(e?.message || e));
      break;
    }
    for (const m of page) {
      const row = toRow(m);
      if (row && !byId.has(row.forecast_id)) byId.set(row.forecast_id, row);
    }
    if (page.length < PAGE) break;
  }

  const stamp = new Date().toISOString();
  const rows = [...byId.values()].map((r) => ({ ...r, indexed_at: stamp }));

  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('crowd_forecasts')
      .upsert(chunk, { onConflict: 'forecast_id' });
    if (error) errors.push(`upsert @${i}: ${error.message}`);
    else upserted += chunk.length;
  }

  const nowIso = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400000).toISOString();
  let closed = 0;
  let stale = 0;
  let pruned = 0;
  try {
    const r1 = await admin
      .from('crowd_forecasts')
      .update({ status: 'closed' }, { count: 'exact' })
      .eq('status', 'open')
      .lt('close_date', nowIso);
    closed = r1.count || 0;
    const r2 = await admin
      .from('crowd_forecasts')
      .update({ status: 'stale' }, { count: 'exact' })
      .eq('status', 'open')
      .lt('indexed_at', staleCutoff);
    stale = r2.count || 0;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const r3 = await admin
      .from('crowd_forecasts')
      .delete({ count: 'exact' })
      .lt('indexed_at', cutoff);
    pruned = r3.count || 0;
  } catch (e) {
    errors.push(`cleanup: ${e?.message || e}`);
  }

  if (upserted || closed || stale || pruned) revalidateTag('hubs');

  return NextResponse.json({
    ok: errors.length === 0 || upserted > 0,
    upserted,
    closed,
    stale,
    pruned,
    errors: errors.slice(0, 10),
  });
}
