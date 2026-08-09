/**
 * Server-only seed source for the curated Echo editorial catalog.
 *
 * The curated articles ship as plain, JSON-serializable modules. This module
 * imports them ONCE to populate the database; the reader never imports them —
 * it reads exclusively from public.echo_articles. Seeding is idempotent
 * (upsert on article_slug) and guarded so it runs at most once per process.
 *
 * Server-only: depends on the service-role admin client.
 */
import { africaBillionCompaniesArticle } from '@/lib/ezana-echo-article-africa-billion-companies.js';
import { nvidiaSecondMostValuableArticle } from '@/lib/ezana-echo-article-nvidia-most-valuable.js';
import { iranWarCommoditiesArticle2026 } from '@/lib/ezana-echo-article-iran-commodities-2026.js';
import { sectorDominanceArticle } from '@/lib/ezana-echo-article-sector-dominance.js';
import { fiberOpticArticle } from '@/lib/ezana-echo-article-fiber-optic.js';
import { hantavirusArticle } from '@/lib/ezana-echo-article-hantavirus.js';
import { semiconductorArticle } from '@/lib/ezana-echo-article-semiconductors.js';
import { trumpPortfolio2026 } from '@/lib/ezana-echo-article-trump-portfolio-2026.js';
import { peterThiel2026 } from '@/lib/ezana-echo-article-peter-thiel-2026.js';
import { privateCreditMaturityWallArticle2026 } from '@/lib/ezana-echo-article-private-credit-maturity-wall-2026.js';
import { criticalMineralsArticle2026 } from '@/lib/ezana-echo-article-critical-minerals-2026.js';
import { ballroomDonorsContracts2026 } from '@/lib/ezana-echo-article-ballroom-donors-contracts-2026.js';
import { fdaPeptidesBpc157Article2026 } from '@/lib/ezana-echo-article-fda-peptides-bpc157-2026.js';
import { africaRefiningArticle2026 } from '@/lib/ezana-echo-article-africa-refining-2026.js';
import { dataConsolidationArticle2026 } from '@/lib/ezana-echo-article-data-consolidation-2026.js';
import { johnnyMnemonicConsolidation2026 } from '@/lib/ezana-echo-article-johnny-mnemonic-consolidation-2026.js';
import { tokenizationCollateral2026 } from '@/lib/ezana-echo-article-tokenization-collateral-2026.js';
import { empireRankings2026 } from '@/lib/ezana-echo-article-empire-rankings-2026.js';

const SOURCE = [
  johnnyMnemonicConsolidation2026,
  tokenizationCollateral2026,
  empireRankings2026,
  dataConsolidationArticle2026,
  africaRefiningArticle2026,
  fdaPeptidesBpc157Article2026,
  ballroomDonorsContracts2026,
  criticalMineralsArticle2026,
  peterThiel2026,
  trumpPortfolio2026,
  nvidiaSecondMostValuableArticle,
  sectorDominanceArticle,
  iranWarCommoditiesArticle2026,
  africaBillionCompaniesArticle,
  fiberOpticArticle,
  hantavirusArticle,
  semiconductorArticle,
  privateCreditMaturityWallArticle2026,
];

/**
 * Slug → globeRail for the curated catalog. Server-only fallback used by the
 * reader when the DB row's globe_rail is null (e.g. migration not yet applied
 * or reconcile not yet fired on this deploy). Curated rails therefore render
 * deterministically regardless of DB state; DB-authored articles are
 * unaffected and read globe_rail from their row as usual.
 */
export const CURATED_GLOBE_RAILS = Object.fromEntries(
  SOURCE.filter((a) => a.globeRail).map((a) => [a.id, a.globeRail]),
);

// Seeded read counts for the curated set (so the trending widget has signal).
const SEED_READS = {
  'peter-thiel-worldview-2026': 11200,
  'trump-portfolio-q1-2026': 9800,
  'nvidia-worlds-second-most-valuable-asset-2026': 15200,
  'dominating-us-stock-market-sectors-through-the-times': 12400,
  'fiber-optic-cable-ai-boom-benny-fazio': 5840,
  'best-performing-commodities-iran-war-2026': 8900,
  'africa-billion-dollar-companies-2026': 4200,
};

// Strip inline entity markup ([[kw:…]]…[[/kw]] and [[person:…]]…[[/person]]) so
// the plaintext body carries no raw tags — used for the search-indexed body.
function stripKw(s) {
  return String(s || '')
    .replace(/\[\[(?:kw|person):[^\]]+\]\]/g, '')
    .replace(/\[\[\/(?:kw|person)\]\]/g, '');
}

// Plaintext body from blocks/paragraphs — satisfies NOT NULL + powers search.
function plainBody(a) {
  const parts = [];
  if (Array.isArray(a.contentBlocks)) {
    for (const b of a.contentBlocks) {
      if (b?.type === 'paragraph' || b?.type === 'heading' || b?.type === 'quote') {
        if (b.text) parts.push(stripKw(b.text));
      }
    }
  }
  if (Array.isArray(a.contentParagraphs)) parts.push(...a.contentParagraphs.map(stripKw));
  return parts.join('\n\n').trim() || stripKw(a.excerpt) || a.title;
}

export const CURATED_SLUGS = SOURCE.map((a) => a.id);

// Non-fatal completeness check — surfaces taxonomy gaps in Vercel logs on every
// seed pass without ever blocking readers. The seven core dimensions must be
// non-empty on every article; an empty one is a publishing defect to fix in the
// article module (see docs/ECHO_ARTICLE_AUTHORING.md), not here.
const CORE_META_DIMS = ['sectors', 'industries', 'institutions', 'geos', 'assetClasses', 'themes'];
function warnIfIncompleteMeta(a) {
  const missing = CORE_META_DIMS.filter((d) => !a.meta?.[d]?.length);
  if (!a.tickers?.length) missing.unshift('tickers');
  if (missing.length) {
    console.warn(
      `[echo] curated seed: "${a.id}" has empty core metadata dims: ${missing.join(', ')}`,
    );
  }
}

function toRow(a) {
  warnIfIncompleteMeta(a);
  return {
    article_slug: a.id,
    article_title: a.title,
    article_excerpt: a.excerpt,
    article_body: plainBody(a),
    article_category: a.category || 'markets',
    content_blocks: a.contentBlocks || null,
    content_paragraphs: a.contentParagraphs || null,
    globe_rail: a.globeRail || null,
    hero_image: a.heroImage || null,
    tags: a.tags || null,
    tickers: a.tickers || null,
    // Partner byline (optional): rides inside article_meta so no schema
    // change is needed. The metadata card reads only its fixed dimension
    // keys, so this is inert there; the hub card mapper surfaces it.
    article_meta: a.partner ? { ...(a.meta || {}), partner: a.partner } : a.meta || {},
    author_name: a.author || 'Ezana Finance Editorial',
    author_id: null,
    is_featured: !!a.featured,
    article_status: 'published',
    read_time_minutes: Number.isFinite(a.readTime) ? a.readTime : 1,
    view_count: SEED_READS[a.id] || 0,
    like_count: 0,
    published_at: a.publishedAt || new Date().toISOString(),
  };
}

/**
 * Editorial content for a curated row, WITHOUT engagement metrics or lifecycle
 * fields. Used to reconcile edits to already-seeded articles (e.g. new inline
 * keywords or copy fixes) on a fresh process. Partial upserts only touch the
 * columns present here, so accumulated view_count/like_count and any admin
 * archive state (article_status) are preserved.
 */
function toContentRow(a) {
  return {
    article_slug: a.id,
    article_title: a.title,
    article_excerpt: a.excerpt,
    article_body: plainBody(a),
    article_category: a.category || 'markets',
    content_blocks: a.contentBlocks || null,
    content_paragraphs: a.contentParagraphs || null,
    globe_rail: a.globeRail || null,
    hero_image: a.heroImage || null,
    tags: a.tags || null,
    tickers: a.tickers || null,
    // Partner byline (optional): rides inside article_meta so no schema
    // change is needed. The metadata card reads only its fixed dimension
    // keys, so this is inert there; the hub card mapper surfaces it.
    article_meta: a.partner ? { ...(a.meta || {}), partner: a.partner } : a.meta || {},
    author_name: a.author || 'Ezana Finance Editorial',
    is_featured: !!a.featured,
    read_time_minutes: Number.isFinite(a.readTime) ? a.readTime : 1,
    published_at: a.publishedAt || new Date().toISOString(),
  };
}

// Bump when a metadata (or other content) change must force a re-sync even on
// warm infra — the value is logged after each reconcile so the fired pass is
// visible in Vercel logs post-deploy.
const SEED_VERSION = '2026-08-globe-rail-v2';

let seedPromise = null;

/**
 * Ensure the curated catalog exists in the DB. Idempotent and cached per
 * process. Never throws — a failed seed must not break the reader.
 */
export function ensureCuratedSeeded(admin) {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const { count } = await admin
        .from('echo_articles')
        .select('id', { count: 'exact', head: true })
        .in('article_slug', CURATED_SLUGS);

      // Phase 1 — seed any missing curated articles in full (with seeded reads).
      if ((count ?? 0) < CURATED_SLUGS.length) {
        const rows = SOURCE.map(toRow);
        const { error } = await admin
          .from('echo_articles')
          .upsert(rows, { onConflict: 'article_slug' });
        if (error) console.error('[echo] curated seed upsert failed:', error.message);
      }

      // Phase 2 — reconcile editorial content for already-seeded rows so copy
      // edits (e.g. new inline keywords) AND metadata backfills (article_meta)
      // reach the reader. This reconcile is THE meta-refresh mechanism: it runs
      // on every cold process (the missing-rows check above only guards the
      // expensive Phase-1 full seed), re-writing article_meta from the JS
      // modules. Metric-safe: this payload omits view_count/like_count and
      // article_status, so a partial upsert leaves engagement counts and admin
      // archive state untouched.
      const contentRows = SOURCE.map(toContentRow);
      const { error: reconcileError } = await admin
        .from('echo_articles')
        .upsert(contentRows, { onConflict: 'article_slug' });
      if (reconcileError) {
        console.error(
          '[echo] curated content reconcile failed:',
          reconcileError.message,
          '— if this mentions "globe_rail", apply supabase/migrations/20260807_echo_globe_rail.sql in the SQL Editor',
        );
      } else {
        console.log('[echo] curated seed reconcile', SEED_VERSION, contentRows.length);
      }
    } catch (e) {
      console.error('[echo] curated seed error:', e?.message || e);
      // allow a retry on a later request
      seedPromise = null;
    }
  })();
  return seedPromise;
}

/**
 * Force a fresh reconcile on the NEXT ensureCuratedSeeded call by clearing the
 * per-process cache. Admin-triggered (see /api/echo/admin/reseed) to push
 * content/metadata/globe_rail backfills to the DB without waiting for a cold
 * serverless boot. Returns nothing; callers await ensureCuratedSeeded after.
 */
export function resetCuratedSeedCache() {
  seedPromise = null;
}
