import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';

/**
 * Populate echo_articles.embedding for the research copilot's Echo retriever.
 * Pulls PUBLISHED Echo articles, embeds title + excerpt + body via the Supabase
 * gte-small edge function (384-dim), and writes the vector back on id.
 * CRON_SECRET bearer (or ?key= fallback). Re-run after publishing new articles.
 *   GET /api/cron/index-echo-articles?limit=500
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMBED_CONCURRENCY = 5;
const DEFAULT_LIMIT = 500;

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

/** Build the text to embed from an article row (title carries the most signal). */
function embedTextFor(a) {
  return [a.article_title, a.article_excerpt, a.article_body]
    .filter(Boolean)
    .join('. ')
    .replace(/\s+/g, ' ')
    .slice(0, 4000);
}

async function embedAll(items) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      items[i].embedding = await embedViaSupabase(items[i].text);
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
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 1), 2000);
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('echo_articles')
    .select('id, article_title, article_excerpt, article_body')
    .eq('article_status', 'published')
    .limit(limit);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const articles = Array.isArray(data) ? data : [];
  if (!articles.length) {
    return NextResponse.json({ ok: true, published: 0, embedded: 0, updated: 0 });
  }

  const items = articles.map((a) => ({ id: a.id, text: embedTextFor(a) }));
  await embedAll(items);
  const stamp = new Date().toISOString();

  const errors = [];
  let updated = 0;
  let embedded = 0;
  for (const it of items) {
    if (!Array.isArray(it.embedding) || it.embedding.length !== 384) continue;
    embedded += 1;
    // eslint-disable-next-line no-await-in-loop
    const { error: upErr } = await admin
      .from('echo_articles')
      .update({ embedding: JSON.stringify(it.embedding), embedded_at: stamp })
      .eq('id', it.id);
    if (upErr) errors.push(`update ${it.id}: ${upErr.message}`);
    else updated += 1;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    published: articles.length,
    embedded,
    updated,
    errors: errors.slice(0, 10),
  });
}
