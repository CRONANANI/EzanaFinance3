import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withApiGuard } from '@/lib/api-guard';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* Schedule-event enrichment: for each event, attach a real news article
   (ticker events) or a short AI market-implications blurb (economic / fed /
   ticker events with no news). One batch call per visible schedule window. */

const MAX_EVENTS = 20;
const ARTICLE_MAX_AGE_MS = 14 * 86400000; // prefer articles within ~14 days
const BLURB_MODEL = 'claude-opus-4-8';
const BLURB_SYSTEM =
  'You are a concise financial analyst. In 2-3 sentences, explain the market ' +
  'implications of the given upcoming event: what it could signal, and which ' +
  'sectors or industries it could most impact. Be specific and neutral. ' +
  'No preamble, no disclaimers, just the analysis.';

// In-memory enrichment cache. The implication of a fixed event ("June CPI")
// doesn't change hour to hour, so cache by event id + date for ~6h to avoid
// re-generating blurbs (and re-hitting the news API) on every page load.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 1000;
const cache = new Map(); // key -> { at, value: { article, blurb } }

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at >= CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

/** Parse Alpha Vantage's `YYYYMMDDTHHMMSS` timestamp to epoch ms (0 if unknown). */
function parseAvTime(ts) {
  if (!ts || ts.length < 8) return 0;
  const y = Number(ts.slice(0, 4));
  const mo = Number(ts.slice(4, 6)) - 1;
  const d = Number(ts.slice(6, 8));
  const hh = Number(ts.slice(9, 11)) || 0;
  const mm = Number(ts.slice(11, 13)) || 0;
  if (!y || Number.isNaN(mo) || !d) return 0;
  return Date.UTC(y, mo, d, hh, mm);
}

/** Most relevant recent article for a ticker, or null. */
async function fetchTickerArticle(symbol) {
  if (!symbol || !getAlphaVantageApiKey()) return null;
  const sym = String(symbol).toUpperCase();
  try {
    const data = await fetchAV(
      { function: 'NEWS_SENTIMENT', tickers: sym, limit: '10', sort: 'LATEST' },
      900,
    );
    const feed = Array.isArray(data?.feed) ? data.feed : [];
    const parsed = feed
      .map((a) => ({
        headline: a.title,
        url: a.url,
        source: a.source,
        when: parseAvTime(a.time_published),
      }))
      .filter((a) => a.headline && a.url)
      .sort((a, b) => b.when - a.when);
    if (parsed.length === 0) return null;

    const cutoff = Date.now() - ARTICLE_MAX_AGE_MS;
    const recent = parsed.filter((a) => a.when >= cutoff);
    const pool = recent.length ? recent : parsed;
    // Prefer an article whose headline names the ticker; else the most recent.
    const pick = pool.find((a) => a.headline.toUpperCase().includes(sym)) || pool[0];
    return pick ? { headline: pick.headline, url: pick.url, source: pick.source } : null;
  } catch {
    return null;
  }
}

/** 2-3 sentence market-implications blurb via Claude, or null. */
async function generateBlurb(event) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const date = event.fullDate ? ` Date: ${String(event.fullDate).slice(0, 10)}.` : '';
    const userText = `Event: ${event.title || 'Upcoming market event'}. Category: ${
      event.category || event.type || 'general'
    }.${date}`;
    // Opus 4.8: thinking off (omitted) for a fast, cheap short generation; no
    // temperature/top_p (removed on 4.8). A 2-3 sentence answer fits easily.
    const msg = await anthropic.messages.create({
      model: BLURB_MODEL,
      max_tokens: 200,
      system: BLURB_SYSTEM,
      messages: [{ role: 'user', content: userText }],
    });
    const text = (msg.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[event-context] blurb generation failed:', err?.message || err);
    return null;
  }
}

/** Enrich a single event. Article preferred; blurb fallback; never throws. */
async function enrichEvent(ev) {
  const id = ev?.id;
  const key = `${id}|${ev?.fullDate || ''}`;
  if (id) {
    const cached = cacheGet(key);
    if (cached) return { id, ...cached };
  }

  let value = { article: null, blurb: null };
  try {
    if (ev?.symbol) {
      const article = await fetchTickerArticle(ev.symbol);
      if (article) value = { article, blurb: null };
    }
    if (!value.article) {
      const blurb = await generateBlurb(ev || {});
      if (blurb) value = { article: null, blurb };
    }
  } catch {
    value = { article: null, blurb: null };
  }

  // Cache only successful enrichments so transient failures retry next time.
  if (id && (value.article || value.blurb)) cacheSet(key, value);
  return { id, ...value };
}

export const POST = withApiGuard(
  async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON', results: [] }, { status: 400 });
    }

    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
    if (events.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // One event's failure must never break the batch.
    const settled = await Promise.allSettled(events.map((ev) => enrichEvent(ev)));
    const results = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { id: events[i]?.id, article: null, blurb: null },
    );

    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=3600' } },
    );
  },
  { requireAuth: false },
);
