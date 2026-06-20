/**
 * One-off generator: emit idempotent upsert SQL that loads the curated Echo
 * editorial catalog into public.echo_articles so the reader can be served
 * entirely from the database. Run:
 *   node scripts/echo-seed-gen.mjs > scripts/echo-seed.sql
 *
 * The curated article modules export plain, JSON-serializable objects, so the
 * full rich-article shape (contentBlocks, heroImage, tags, tickers) survives
 * the round-trip into JSONB columns.
 */
import { getAllArticles, ECHO_TRENDING } from '../src/lib/ezana-echo-mock.js';

const articles = getAllArticles();

const readsBySlug = {};
for (const r of ECHO_TRENDING.mostRead || []) readsBySlug[r.id] = r.reads;

function txt(v) {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function jsonb(v) {
  if (v == null) return 'NULL';
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}
function stripKw(s) {
  return String(s || '')
    .replace(/\[\[kw:[^\]]+\]\]/g, '')
    .replace(/\[\[\/kw\]\]/g, '');
}

// Build a plaintext body from blocks/paragraphs to satisfy NOT NULL + search.
function plainBody(a) {
  const parts = [];
  if (Array.isArray(a.contentBlocks)) {
    for (const b of a.contentBlocks) {
      if (b?.type === 'paragraph' || b?.type === 'heading') parts.push(stripKw(b.text));
      else if (b?.type === 'quote' && b.text) parts.push(stripKw(b.text));
    }
  }
  if (Array.isArray(a.contentParagraphs)) parts.push(...a.contentParagraphs.map(stripKw));
  const body = parts.join('\n\n').trim();
  return body || stripKw(a.excerpt) || a.title;
}

const cols = [
  'article_slug',
  'article_title',
  'article_excerpt',
  'article_body',
  'article_category',
  'content_blocks',
  'content_paragraphs',
  'hero_image',
  'tags',
  'tickers',
  'author_name',
  'is_featured',
  'article_status',
  'read_time_minutes',
  'view_count',
  'like_count',
  'published_at',
];

let out = '';
for (const a of articles) {
  const vals = [
    txt(a.id),
    txt(a.title),
    txt(a.excerpt),
    txt(plainBody(a)),
    txt(a.category || 'markets'),
    jsonb(a.contentBlocks || null),
    jsonb(a.contentParagraphs || null),
    jsonb(a.heroImage || null),
    jsonb(a.tags || null),
    jsonb(a.tickers || null),
    txt(a.author || 'Ezana Finance Editorial'),
    a.featured ? 'true' : 'false',
    `'published'`,
    Number.isFinite(a.readTime) ? a.readTime : 1,
    readsBySlug[a.id] || 0,
    0,
    a.publishedAt ? `${txt(a.publishedAt)}::timestamptz` : 'now()',
  ];
  out += `INSERT INTO public.echo_articles (${cols.join(', ')}) VALUES (${vals.join(', ')})
ON CONFLICT (article_slug) DO UPDATE SET
  article_title = EXCLUDED.article_title,
  article_excerpt = EXCLUDED.article_excerpt,
  article_body = EXCLUDED.article_body,
  article_category = EXCLUDED.article_category,
  content_blocks = EXCLUDED.content_blocks,
  content_paragraphs = EXCLUDED.content_paragraphs,
  hero_image = EXCLUDED.hero_image,
  tags = EXCLUDED.tags,
  tickers = EXCLUDED.tickers,
  author_name = EXCLUDED.author_name,
  is_featured = EXCLUDED.is_featured,
  article_status = 'published',
  read_time_minutes = EXCLUDED.read_time_minutes,
  view_count = GREATEST(public.echo_articles.view_count, EXCLUDED.view_count),
  published_at = EXCLUDED.published_at;\n\n`;
}

process.stdout.write(out);
