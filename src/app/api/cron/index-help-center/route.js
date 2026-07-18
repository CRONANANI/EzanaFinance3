import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import {
  USER_ARTICLES,
  PARTNER_ARTICLES,
} from '@/lib/help-center-content';

/**
 * Populate help_center_articles for the help-center RAG matcher. Reads the
 * static article corpus (src/lib/help-center-content.js — the source of truth),
 * strips each article's HTML to plain text, embeds title+body via the Supabase
 * gte-small edge function (384-dim), and upserts idempotently on (audience, slug).
 *
 * /api/help-center/ask embeds the visitor's question and nearest-neighbour
 * queries this table via match_help_articles to ground a cited answer.
 * CRON_SECRET bearer (or ?key= fallback). Run after editing help-center-content.
 *   GET /api/cron/index-help-center
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

/** Strip HTML tags/entities to plain text for embedding + grounding context. */
function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Flatten a { slug: { title, category, content } } map → indexable items. */
function toItems(articles, audience) {
  const items = [];
  for (const [slug, art] of Object.entries(articles || {})) {
    if (!slug || !art?.title) continue;
    const text = htmlToText(art.content);
    items.push({
      // gte-small embeds title + body so the match reflects both.
      embedText: `${art.title}. ${text}`.slice(0, 4000),
      row: {
        audience,
        slug,
        title: art.title,
        category: art.category || null,
        url: `/help-center/${audience}/article/${slug}`,
        content: text.slice(0, 8000), // stored for grounding; body can be long
      },
    });
  }
  return items;
}

/** Embed `items[].embedText` with bounded concurrency → attaches .embedding. */
async function embedAll(items) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor;
      cursor += 1;
      // eslint-disable-next-line no-await-in-loop
      items[i].embedding = await embedViaSupabase(items[i].embedText);
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

  const items = [
    ...toItems(USER_ARTICLES, 'user'),
    ...toItems(PARTNER_ARTICLES, 'partner'),
  ];
  if (!items.length) {
    return NextResponse.json({ ok: true, articles: 0, embedded: 0, upserted: 0 });
  }

  // Embed (bounded concurrency), keep only rows that produced a 384-dim vector.
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
      articles: items.length,
      embedded: 0,
      upserted: 0,
      errors: ['embed produced no vectors (edge fn unreachable or gte-small disabled)'],
    });
  }

  // Upsert in chunks on (audience, slug).
  const errors = [];
  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await getAdminClient()
      .from('help_center_articles')
      .upsert(chunk, { onConflict: 'audience,slug' });
    if (error) errors.push(`upsert @${i}: ${error.message}`);
    else upserted += chunk.length;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    articles: items.length,
    embedded,
    upserted,
    errors: errors.slice(0, 10),
  });
}
