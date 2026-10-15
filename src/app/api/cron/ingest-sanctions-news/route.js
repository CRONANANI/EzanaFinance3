import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { fetchCityNews } from '@/lib/marketaux/client';
import { countriesInText } from '@/lib/sanctions/fx';
import { withIngestRun } from '@/lib/ingest-runs';

/**
 * Recent sanctions news, by the countries each story names, into
 * sanctions_news, for the pulsing dots on the Sanctions map. Marketaux
 * articles from the past 30 days matching sanctions terms; a story is kept
 * only when its headline or summary names at least one OFAC country (see
 * NEWS_COUNTRY_ALIASES). Rows older than 60 days are pruned.
 *   GET /api/cron/ingest-sanctions-news
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const SEARCHES = [
  'sanctions | sanctioned | OFAC',
  '"export controls" | embargo | "entity list"',
  '"Treasury sanctions" | "sanctions package" | designations',
];
const SANCTION_WORD = /\b(sanction|ofac|embargo|export control|entity list|designat|blacklist)/i;

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

async function handler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const stamp = new Date().toISOString();

  const rows = new Map();
  const errors = [];
  for (const search of SEARCHES) {
    // eslint-disable-next-line no-await-in-loop
    const { articles, error } = await fetchCityNews({ search, limit: 50, publishedAfter: since });
    if (error) errors.push(error);
    for (const a of articles || []) {
      const title = String(a?.title || '').trim();
      const url = String(a?.url || '');
      const summary = String(a?.description || a?.snippet || '').trim();
      const published = a?.published_at ? new Date(a.published_at) : null;
      if (!title || !/^https:\/\//.test(url) || !published || Number.isNaN(published.getTime())) {
        continue;
      }
      if (!SANCTION_WORD.test(`${title} ${summary}`)) continue;
      const countries = countriesInText(`${title} ${summary}`);
      if (!countries.length) continue;
      const id = crypto.createHash('sha1').update(url).digest('hex');
      rows.set(id, {
        id,
        title: title.slice(0, 300),
        url,
        source: String(a?.source || '').slice(0, 80) || null,
        published_at: published.toISOString(),
        countries,
        summary: summary.slice(0, 600) || null,
        synced_at: stamp,
      });
    }
  }

  const list = [...rows.values()];
  if (list.length) {
    const { error } = await admin.from('sanctions_news').upsert(list, { onConflict: 'id' });
    if (error) {
      return NextResponse.json({ ok: false, error: `upsert: ${error.message}` }, { status: 500 });
    }
  }
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from('sanctions_news').delete().lt('published_at', cutoff);
  revalidateTag('sanctions');
  return NextResponse.json({ ok: true, stored: list.length, errors });
}

/* Every run is logged to ingest_runs from this route's own JSON body. */
export const GET = withIngestRun('sanctions-news', handler);
