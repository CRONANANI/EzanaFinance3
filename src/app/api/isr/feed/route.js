import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { getSeedIsrEvents } from '@/lib/isr/seed-events';

export const dynamic = 'force-dynamic';

const SEVERITY_ORDER = { Low: 0, Medium: 1, High: 2, Critical: 3 };

/** Map ISR card filter codes → cache `region` ids (Massive REGIONS). */
const FILTER_TO_CACHE_REGION = new Map([
  ['GB', 'UK'],
  ['RU', 'RUUA'],
  ['JP', 'JPKR'],
  ['OC', 'OCE'],
]);

function expandCountryFilters(codes) {
  const set = new Set();
  for (const raw of codes) {
    const u = (raw || '').toUpperCase();
    set.add(u);
    const mapped = FILTER_TO_CACHE_REGION.get(u);
    if (mapped) set.add(mapped);
  }
  return set;
}

/**
 * Map cache row → IsrEvent shape (compatible with seed-events.js).
 */
function cacheRowToEvent(row) {
  return {
    id: row.id,
    headline: row.title,
    summary: row.description,
    source: row.publisher_name || 'Unknown',
    url: row.article_url,
    publishedAt: row.published_utc,
    country: row.region_label,
    countryCode: row.region,
    topic: row.topic || 'Economy',
    severity: row.severity || 'Low',
    impactedSymbols: row.tickers || [],
    impactedKeywords: row.keywords || [],
  };
}

/**
 * ISR feed — reads from news_articles_cache (populated by /api/news/massive/poll).
 * Falls back to seed events only when the cache has zero rows (pre-poll / empty DB).
 * If the cache has rows but filters exclude all of them, returns an empty list
 * with source `cache-empty-filtered` (no seed substitution).
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const countriesRaw = url.searchParams.get('countries') || '';
    const countries = countriesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const topic = url.searchParams.get('topic') || 'All';
    const minSeverity = url.searchParams.get('minSeverity') || 'Low';
    const window = url.searchParams.get('window') || '24h';

    const since =
      window === '1h'
        ? new Date(Date.now() - 3600000)
        : window === '6h'
          ? new Date(Date.now() - 6 * 3600000)
          : window === '7d'
            ? new Date(Date.now() - 7 * 86400000)
            : new Date(Date.now() - 24 * 3600000);

    let q = supabaseAdmin
      .from('news_articles_cache')
      .select('*')
      .gte('published_utc', since.toISOString())
      .order('published_utc', { ascending: false })
      .limit(200);

    if (topic !== 'All') {
      q = q.eq('topic', topic);
    }

    const { data: cacheRows, error } = await q;
    if (error) console.error('[isr/feed] cache read', error.message);

    let events = (cacheRows || []).map(cacheRowToEvent);

    const minLevel = SEVERITY_ORDER[minSeverity] ?? 0;
    events = events.filter((e) => (SEVERITY_ORDER[e.severity] ?? 0) >= minLevel);

    if (countries.length > 0) {
      const set = expandCountryFilters(countries);
      events = events.filter((e) => set.has((e.countryCode || '').toUpperCase()));
    }

    const cacheIsEmpty = !cacheRows || cacheRows.length === 0;
    if (events.length === 0 && cacheIsEmpty) {
      const seeds = getSeedIsrEvents({ countries, topic, minSeverity, window });
      return NextResponse.json(
        { events: seeds, source: 'seed' },
        { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } }
      );
    }

    const source =
      events.length === 0 && !cacheIsEmpty
        ? 'cache-empty-filtered'
        : cacheRows && cacheRows.length > 0
          ? 'cache'
          : 'empty';

    return NextResponse.json(
      { events, source },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } }
    );
  } catch (err) {
    console.error('[isr/feed]', err);
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
