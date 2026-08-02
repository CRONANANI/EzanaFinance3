import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { chunkDocument } from '@/lib/rag/chunker';

/**
 * Populate echo_articles.embedding for the research copilot's Echo retriever.
 * Pulls PUBLISHED Echo articles, embeds title + excerpt + body via the Supabase
 * gte-small edge function (384-dim), and writes the vector back on id.
 *
 * Also maintains the chunk-level index (echo_article_chunks, RAG_SYSTEM.md §3 P1):
 * each article body is chunked heading-aware (~500-token chunks), every chunk is
 * embedded, and the article's chunk rows are replaced (delete-then-insert so a
 * re-chunk after an edit never leaves stale trailing chunks). The article-level
 * pass is the fallback; the chunk pass is additive.
 * CRON_SECRET bearer (or ?key= fallback). Re-run after publishing new articles.
 *   GET /api/cron/index-echo-articles?limit=500[&force=1]
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

  const force = searchParams.get('force') === '1';

  const { data, error } = await admin
    .from('echo_articles')
    .select('id, article_title, article_excerpt, article_body, updated_at, embedded_at')
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

  // ── Chunk pass (additive) — chunk each article body, embed each chunk, and
  // replace the article's chunk rows. Skips articles whose embedding is fresh
  // (embedded_at >= updated_at) AND that already have chunks, unless ?force=1.
  let chunked = 0;
  let chunksWritten = 0;
  for (const a of articles) {
    if (!force) {
      const fresh =
        a.embedded_at && a.updated_at && new Date(a.embedded_at) >= new Date(a.updated_at);
      if (fresh) {
        // eslint-disable-next-line no-await-in-loop
        const { count } = await admin
          .from('echo_article_chunks')
          .select('id', { count: 'exact', head: true })
          .eq('article_id', a.id);
        if ((count ?? 0) > 0) continue;
      }
    }

    const chunks = chunkDocument(a.article_body || '');
    if (!chunks.length) continue;

    const chunkItems = chunks.map((c) => ({ ...c, text: c.content }));
    // eslint-disable-next-line no-await-in-loop
    await embedAll(chunkItems);

    const rows = chunkItems
      .filter((c) => Array.isArray(c.embedding) && c.embedding.length === 384)
      .map((c) => ({
        article_id: a.id,
        chunk_index: c.chunkIndex,
        section_anchor: c.sectionAnchor,
        section_title: c.sectionTitle,
        content: c.content,
        token_estimate: c.tokenEstimate,
        embedding: JSON.stringify(c.embedding),
      }));

    // Only replace when we have fresh vectors — never wipe chunks if the edge
    // function is down and every chunk embed came back null.
    if (!rows.length) continue;

    // eslint-disable-next-line no-await-in-loop
    await admin.from('echo_article_chunks').delete().eq('article_id', a.id);
    // eslint-disable-next-line no-await-in-loop
    const { error: cErr } = await admin.from('echo_article_chunks').insert(rows);
    if (cErr) {
      errors.push(`chunks ${a.id}: ${cErr.message}`);
    } else {
      chunked += 1;
      chunksWritten += rows.length;
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    published: articles.length,
    embedded,
    updated,
    chunked,
    chunksWritten,
    errors: errors.slice(0, 10),
  });
}
