/**
 * Ezana Sonar — taxonomy-driven source registry (sonar-all-datasets spec, Step 2).
 *
 * The dataset taxonomy (src/lib/datasets/taxonomy.js) is the single source of
 * truth for which datasets exist as live pages. This registry couples each
 * LIVE dataset slug to how Sonar reaches it, so that adding a new live dataset
 * page forces a conscious decision: give it a first-class adapter, record that
 * an existing Sonar surface already reaches it, or list it in EXCLUDED with a
 * reason. `findMissingAdapters()` returns any live slug that is none of those,
 * and the coverage test (scripts/check-sonar-dataset-coverage.mjs) fails on a
 * non-empty result. No more silent gaps.
 *
 * Slug = the dataset page href after "/datasets/" (e.g. "sanctions",
 * "government/contracts"), which is how the taxonomy already identifies pages.
 */
import { DATASET_TAXONOMY, isFullyLive } from '@/lib/datasets/taxonomy';
import sanctions from './sanctions';
import ipoEvents from './ipo-events';

/** href -> slug (the part after /datasets/). */
export function slugFromHref(href) {
  const m = /^\/datasets\/(.+)$/.exec(String(href || '').trim());
  return m ? m[1].replace(/\/+$/, '') : null;
}

/** Every live (page-backed) dataset, as { slug, label, dimension }. */
export function liveDatasets() {
  const out = [];
  for (const dim of DATASET_TAXONOMY) {
    for (const item of dim.items) {
      if (!isFullyLive(item)) continue;
      const slug = slugFromHref(item.href);
      if (slug) out.push({ slug, label: item.label, dimension: dim.label });
    }
  }
  return out;
}

/**
 * First-class, taxonomy-driven Sonar adapters, keyed by slug. These run inside
 * the orchestrator (via their retriever wrapper) and the sweep helper.
 * @type {Record<string, import('./types').SonarSourceAdapter>}
 */
const ADAPTERS = {
  [sanctions.slug]: sanctions,
};

/**
 * Live datasets already reachable by an existing Sonar surface, with which one.
 * Q = /api/sonar/query corpus, V = /api/sonar/v2 sweep, P = /api/sonar/ping
 * (EzanaQL catalog). Migrating these to first-class adapters is tracked; until
 * then they count as covered so the guard stays honest without a false alarm.
 */
export const COVERED_BY_EXISTING = {
  'politician-tracker': 'Q congress + V sweepCongress + P capitol.congress_trades',
  'government/contracts': 'Q contracts + V sweepContracts + P gov.contracts',
  'government/lobbying': 'V sweepLobbying + P capitol.lobbying',
  'prediction-markets': 'Q markets + V sweepPredMarkets + P prediction.markets',
  institutional: 'V sweep13f + P titans.holdings_13f',
  campaignfinancerecords: 'P capitol.campaign_finance',
  committees: 'P capitol.committee_seats',
  patents: 'P eyes.patents',
  'supply-chain': 'P eyes.chokepoints + P eyes.ports',
  'oecd-macro': 'P lighthouse.oecd',
  'whale-moves': 'P titans.whale_moves',
};

/**
 * Live datasets intentionally without a Sonar source yet. Every entry needs a
 * reason. These fail no test, but they are the backlog the guard protects:
 * removing a slug from here without adding an adapter re-opens the gap and the
 * coverage test fails.
 */
export const EXCLUDED = {
  insider: 'EzanaQL catalog entry exists but is not yet populated; V sweep tracked.',
  'executive-compensation': 'EzanaQL catalog entry not yet populated; V sweep tracked.',
  'etf-holdings': 'EzanaQL catalog entry not yet populated; V sweep tracked.',
  'night-lights':
    'Monthly brightness time-series, no entity-level rows to cite yet; adapter tracked.',
  'commercial-real-estate':
    'Market-wide FRED series, no entity-level rows to cite yet; adapter tracked.',
  'world-bank': 'Country macro time-series, no entity-level rows to cite yet; adapter tracked.',
  'geopolitical-risk': 'Index time-series, no entity-level rows to cite yet; adapter tracked.',
  'global-empire-lighthouse':
    'Composite country rankings, reached via macro rank; dedicated adapter tracked.',
  'crowd-forecasts': 'Play-money crowd forecasts; relevance model and adapter tracked.',
};

/**
 * Core Sonar sources that are not one dataset page: they answer a kind of
 * question (an IPO) across the market rather than mirror a /datasets/ page,
 * so they sit outside the taxonomy coverage check. IPO filings belongs to
 * Titans Shadow (corporate filings) should it ever get a page of its own.
 * @type {Record<string, import('./types').SonarSourceAdapter>}
 */
export const CORE_SOURCES = {
  [ipoEvents.slug]: ipoEvents,
};

/** A core source by slug (e.g. 'ipo-events'), or null. */
export function getCoreSource(slug) {
  return CORE_SOURCES[slug] || null;
}

const TIER_RANK = { free: 0, pro: 1, org: 2 };

/** Live slugs that have no adapter, are not covered, and are not excluded. */
export function findMissingAdapters() {
  return liveDatasets()
    .map((d) => d.slug)
    .filter((slug) => !ADAPTERS[slug] && !COVERED_BY_EXISTING[slug] && !EXCLUDED[slug]);
}

/** First-class adapters this tier may run. */
export function getLiveSources(tier = 'free') {
  const rank = TIER_RANK[tier] ?? 0;
  return [...Object.values(ADAPTERS), ...Object.values(CORE_SOURCES)].filter(
    (a) => rank >= (TIER_RANK[a.minTier ?? 'free'] ?? 0),
  );
}

/** Structured view for reports and the coverage test. */
export function coverageReport() {
  const live = liveDatasets();
  return {
    liveCount: live.length,
    adapters: Object.keys(ADAPTERS),
    coreSources: Object.keys(CORE_SOURCES),
    covered: Object.keys(COVERED_BY_EXISTING),
    excluded: Object.keys(EXCLUDED),
    missing: findMissingAdapters(),
  };
}

/* Dev-time nudge: surface a gap in the server log without failing the process. */
if (process.env.NODE_ENV !== 'production') {
  const missing = findMissingAdapters();
  if (missing.length) {
    console.warn(`[sonar] Live datasets with no Sonar source: ${missing.join(', ')}`);
  }
}
