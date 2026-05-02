import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { REGIONS, fetchMassiveNews, normalizeArticle } from '@/lib/massive-news';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLL_INTERVAL_SECONDS = 60;

/**
 * GET /api/news/massive/poll
 *
 * Triggered by client polling. Self-rate-limits via news_poll_state:
 *   - If <60s since last fetch, returns cached articles only (no API call).
 *   - Otherwise fetches the next region in rotation, dedupes, upserts cache.
 *
 * Response: { fetched: bool, region?: string, inserted?: int, articles: [...] }
 */
export async function GET() {
  try {
    const { data: state, error: stateErr } = await supabaseAdmin
      .from('news_poll_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (stateErr) throw new Error(`State read failed: ${stateErr.message}`);

    const now = new Date();
    const lastFetched = new Date(state.last_fetched_at);
    const elapsedSec = (now.getTime() - lastFetched.getTime()) / 1000;

    if (elapsedSec < POLL_INTERVAL_SECONDS) {
      const articles = await loadRecentCache(50);
      return NextResponse.json({
        fetched: false,
        nextFetchInSec: Math.ceil(POLL_INTERVAL_SECONDS - elapsedSec),
        articles,
      });
    }

    const regionIndex = Number(state.last_region_index) % REGIONS.length;
    const region = REGIONS[regionIndex];

    let raw = [];
    let fetchError = null;
    try {
      raw = await fetchMassiveNews(region.tickers, 50);
    } catch (e) {
      fetchError = e?.message || String(e);
    }

    let inserted = 0;
    if (raw.length > 0) {
      const normalized = raw
        .filter((a) => a?.id && a?.article_url)
        .map((a) => normalizeArticle(a, region));

      if (normalized.length > 0) {
        const { data: upserted, error: upsertErr } = await supabaseAdmin
          .from('news_articles_cache')
          .upsert(normalized, { onConflict: 'id', ignoreDuplicates: true })
          .select('id');

        if (upsertErr) {
          console.error('[news/massive/poll] upsert', upsertErr.message);
        } else {
          inserted = upserted?.length ?? normalized.length;
        }
      }
    }

    const nextIndex = (regionIndex + 1) % REGIONS.length;
    const todayStr = now.toISOString().slice(0, 10);
    const lastDateStr =
      state.last_reset_date != null ? String(state.last_reset_date).slice(0, 10) : '';
    const isNewDay = lastDateStr !== todayStr;

    await supabaseAdmin
      .from('news_poll_state')
      .update({
        last_fetched_at: now.toISOString(),
        last_region_index: nextIndex,
        total_calls_today: isNewDay ? 1 : Number(state.total_calls_today || 0) + 1,
        last_reset_date: todayStr,
      })
      .eq('id', 1);

    const articles = await loadRecentCache(50);

    return NextResponse.json({
      fetched: true,
      region: region.id,
      regionLabel: region.label,
      raw_count: raw.length,
      inserted,
      error: fetchError,
      total_calls_today: isNewDay ? 1 : Number(state.total_calls_today || 0) + 1,
      articles,
    });
  } catch (e) {
    console.error('[news/massive/poll]', e);
    return NextResponse.json({ fetched: false, error: e.message, articles: [] }, { status: 500 });
  }
}

async function loadRecentCache(limit) {
  const { data } = await supabaseAdmin
    .from('news_articles_cache')
    .select('*')
    .order('published_utc', { ascending: false })
    .limit(limit);
  return data || [];
}
