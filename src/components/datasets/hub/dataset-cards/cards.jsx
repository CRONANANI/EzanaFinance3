/**
 * The component cards each live dataset offers to its dimension's hub. One
 * async server component per card, each reading through the dataset page's
 * own loader (already cached), so a card shows the same figures as the page
 * it comes from. Register new ones in DATASET_CARDS below.
 *
 * Each card's reading and row shaping is a load() function that returns the
 * ListCard props; the component here renders it on a hub, and
 * /api/datasets/cards calls the same function (CARD_LOADERS) for the
 * datasets search, so a card shows the same rows in both places.
 *
 * Keep each card to one list of up to eight rows: the hubs are canvases of
 * many cards, not a second copy of the dataset page. A dataset card is only
 * registered when the hub has no linkage card showing the same thing (the
 * Hive's markets, Lighthouse's risk and sanctions lists already exist as
 * linkages, so they are not repeated here).
 */
import { Suspense } from 'react';
import ListCard from './ListCard';
import { readSummary } from '@/lib/politicians/congress-store';
import { getInstitutionalOverview } from '@/lib/titans/store';
import { getInsiderOverview } from '@/lib/titans/insider-store';
import { lighthouseLatest, sanctionsEntries, openCrowdForecasts } from '@/lib/lighthouse/store';
import { getOpenMarkets } from '@/lib/hive/store';
import { usd, shortDate } from '@/lib/titans/format';
import { getMacroRankings } from '@/lib/sonar/macro/store';
import { rankedFrom } from '@/lib/sonar/macro/rank';

const n = (v) => (v == null ? null : Number(v).toLocaleString('en-US'));

/* ── Capitol Watch ──────────────────────────────────────────────────── */

export async function loadMostHeld() {
  const s = await readSummary({ tickerLimit: 10 }).catch(() => ({ error: 'read' }));
  const rows = (s?.held || []).slice(0, 8).map((h) => ({
    key: h.ticker,
    name: h.company || h.ticker,
    meta: h.lastBuy ? `${h.ticker} · last buy ${shortDate(h.lastBuy)}` : h.ticker,
    value: `${n(h.holders)} holding`,
    href: `/datasets/politician-tracker`,
  }));
  return {
    id: 'most-held',
    title: 'Most held companies',
    dataset: 'Politician Tracker',
    href: '/datasets/politician-tracker',
    desc: 'The companies the most members of Congress still hold, inferred from disclosures.',
    rows,
    error: Boolean(s?.error),
    empty: 'Appears once holdings are inferred from disclosures.',
    foot: 'Holding means a disclosed purchase not followed by a full sale. House Clerk and Senate eFD.',
  };
}
async function MostHeld() {
  return <ListCard {...await loadMostHeld()} />;
}

export async function loadHouseVsSenate() {
  const s = await readSummary({}).catch(() => ({ error: 'read' }));
  const by = {
    House: { members: 0, trades: 0, volume: 0 },
    Senate: { members: 0, trades: 0, volume: 0 },
  };
  for (const r of s?.rankings || []) {
    const c = by[r.chamber];
    if (!c) continue;
    c.members += 1;
    c.trades += r.count || 0;
    c.volume += r.volume || 0;
  }
  const rows = ['House', 'Senate']
    .filter((c) => by[c].members)
    .map((c) => ({
      key: c,
      name: c,
      meta: `${n(by[c].members)} members trading · ${(by[c].trades / Math.max(1, by[c].members)).toFixed(1)} trades per member`,
      value: `${n(by[c].trades)} trades · ${usd(by[c].volume) || '$0'}`,
      href: `/datasets/politician-tracker?chamber=${c.toLowerCase()}`,
    }));
  return {
    id: 'house-senate',
    title: 'House vs Senate, trailing 12 months',
    dataset: 'Politician Tracker',
    href: '/datasets/politician-tracker',
    desc: 'Members trading, disclosed trades and disclosed volume by chamber.',
    rows,
    error: Boolean(s?.error),
    empty: 'Appears once disclosures are loaded.',
    foot: 'Volume is the sum of the midpoints of disclosed ranges.',
  };
}
async function HouseVsSenate() {
  return <ListCard {...await loadHouseVsSenate()} />;
}

/* ── Titans Shadow ──────────────────────────────────────────────────── */

export async function loadWidelyHeld() {
  const o = await getInstitutionalOverview().catch(() => null);
  const rows = (o?.widelyHeld || []).slice(0, 8).map((r) => ({
    key: r.cusip || r.ticker || r.issuer,
    name: r.issuer || r.ticker,
    meta: r.ticker || null,
    value: `${n(r.holders)} funds`,
    href: '/datasets/institutional',
  }));
  return {
    id: 'widely-held',
    title: o?.quarterLabel
      ? `Most widely held by funds, ${o.quarterLabel}`
      : 'Most widely held by funds',
    dataset: 'Institutional',
    href: '/datasets/institutional',
    desc: 'Securities held by the most 13F filers in the latest complete quarter.',
    rows,
    error: o === null,
    empty: 'Appears once a complete 13F quarter is indexed.',
    foot: 'SEC EDGAR Form 13F.',
  };
}
async function WidelyHeld() {
  return <ListCard {...await loadWidelyHeld()} />;
}

export async function loadInsiderBuys() {
  const o = await getInsiderOverview().catch(() => null);
  const rows = (o?.topBuys || []).slice(0, 8).map((r) => ({
    key: `${r.ticker}-${r.insider}-${r.date}`,
    name: r.company || r.ticker,
    meta: `${r.insider || 'Insider'} · ${shortDate(r.date)}`,
    value: usd(r.value),
    href: '/datasets/insider',
  }));
  return {
    id: 'insider-buys',
    title: 'Largest insider buys, last 30 days',
    dataset: 'Insider Trading',
    href: '/datasets/insider',
    desc: 'Open-market purchases by officers, directors and large holders, by value.',
    rows,
    error: o === null,
    empty: 'Appears as Form 4 filings are indexed.',
    foot: 'SEC EDGAR Form 4, transaction code P.',
  };
}
async function InsiderBuys() {
  return <ListCard {...await loadInsiderBuys()} />;
}

/* ── Global Empire Lighthouse ───────────────────────────────────────── */

/**
 * Fastest growing economies, on ONE common year for every country (the
 * newest year >= 85% of sovereign economies report), regional aggregates
 * excluded and territories left out (sonar-country-ranking-fix). It used to
 * rank each country's own latest year, mixing 2025 with 2011. `entityIso3`
 * (a country the search named) is appended, highlighted, when it sits
 * outside the top rows; a country with no value for the year is not added.
 */
export async function loadFastestGrowth({ entityIso3 = null } = {}) {
  const payload = await getMacroRankings().catch(() => null);
  const ranked = rankedFrom(payload, 'gdp_growth_real');
  const year = payload?.metrics?.gdp_growth_real?.year || null;
  const row = (r, extra = {}) => ({
    key: r.iso3,
    rank: r.rank,
    name: r.name,
    meta: `Real GDP growth, ${year}`,
    value: `${Number(r.value).toFixed(1)}%`,
    href: '/datasets/world-bank',
    ...(r.iso3 === entityIso3 ? { highlight: true } : {}),
    ...extra,
  });
  const rows = ranked.slice(0, 8).map((r) => row(r));
  const me = entityIso3 ? ranked.find((r) => r.iso3 === entityIso3) : null;
  if (me && !rows.some((r) => r.key === entityIso3)) rows.push(row(me, { gapBefore: true }));
  return {
    id: 'fastest-growth',
    title: 'Fastest growing economies',
    dataset: 'World Bank Economic Indicators',
    href: '/datasets/world-bank',
    desc: year
      ? `Highest real GDP growth in ${year}, the latest year most economies have reported.`
      : 'Highest real GDP growth in the latest common year.',
    rows,
    entityRow: Boolean(me),
    error: payload === null,
    empty: 'Appears once the World Bank data is loaded.',
    foot: `World Bank, World Development Indicators (CC BY 4.0)${year ? ` · ${year}` : ''} · Excludes regional aggregates; territories labelled`,
  };
}
async function FastestGrowth() {
  return <ListCard {...await loadFastestGrowth()} />;
}

/* ── Search-only cards (the hubs already show these as linkages) ─────── */

const pct = (p) => (p == null ? null : `${Math.round(Number(p) * 100)}%`);

export async function loadBiggestMarkets() {
  const rows0 = await getOpenMarkets({ polymarket: 8, kalshi: 8 }).catch(() => null);
  const rows = (rows0 || [])
    .filter((m) => m.platform === 'polymarket')
    .slice(0, 8)
    .map((m) => ({
      key: m.market_id,
      name: m.question,
      meta: `${m.platform === 'kalshi' ? 'Kalshi' : 'Polymarket'}${m.end_date ? ` · closes ${shortDate(m.end_date)}` : ''}`,
      value: pct(m.probability),
      href: m.link || '/datasets/prediction-markets',
      external: Boolean(m.link),
    }));
  return {
    id: 'biggest-markets',
    title: 'Biggest open prediction markets',
    dataset: 'Prediction Markets',
    href: '/datasets/prediction-markets',
    desc: 'Open markets by dollars traded, with the crowd probability of yes.',
    rows,
    error: rows0 === null,
    empty: 'Appears once the market index is built.',
    foot: 'Polymarket. Probabilities are the market price of yes, not advice.',
  };
}

export async function loadCrowdForecasts() {
  const rows0 = await openCrowdForecasts(8).catch(() => null);
  const rows = (rows0 || []).slice(0, 8).map((f) => ({
    key: f.forecast_id,
    name: f.question,
    meta: `${n(f.forecasters)} forecasters${f.close_date ? ` · closes ${shortDate(f.close_date)}` : ''}`,
    value: pct(f.probability),
    href: f.link || '/datasets/crowd-forecasts',
    external: Boolean(f.link),
  }));
  return {
    id: 'crowd-forecasts',
    title: 'Most followed crowd forecasts',
    dataset: 'Crowdsourced Intelligence',
    href: '/datasets/crowd-forecasts',
    desc: 'Open questions with the most forecasters, and where the crowd sits.',
    rows,
    error: rows0 === null,
    empty: 'Appears once crowd forecasts are indexed.',
    foot: 'Manifold. Probabilities are the crowd estimate, not advice.',
  };
}

export async function loadSanctions() {
  const rows0 = await sanctionsEntries(8).catch(() => null);
  const rows = (rows0 || []).slice(0, 8).map((e) => ({
    key: String(e.ent_num),
    name: e.name,
    meta: [e.entry_type, (e.programs || []).slice(0, 2).join(', ')].filter(Boolean).join(' · '),
    value: e.first_seen ? shortDate(e.first_seen) : null,
    href: '/datasets/sanctions',
  }));
  return {
    id: 'sanctions',
    title: 'Newest sanctions designations',
    dataset: 'Sanctions',
    href: '/datasets/sanctions',
    desc: 'The latest names added to the sanctions list, with their programs.',
    rows,
    error: rows0 === null,
    empty: 'Appears once the sanctions list is synced.',
    foot: 'OFAC Specially Designated Nationals list.',
  };
}

/** Loaders by registry id (src/lib/datasets/card-registry.js). */
export const CARD_LOADERS = {
  'most-held': loadMostHeld,
  'house-senate': loadHouseVsSenate,
  'widely-held': loadWidelyHeld,
  'insider-buys': loadInsiderBuys,
  'fastest-growth': loadFastestGrowth,
  'biggest-markets': loadBiggestMarkets,
  'crowd-forecasts': loadCrowdForecasts,
  sanctions: loadSanctions,
};

/* ── registry ───────────────────────────────────────────────────────── */

function Skeleton({ title }) {
  return (
    <section className="hub-card hdc" aria-busy="true" aria-label={`${title} loading`}>
      <div className="hub-card-head">
        <h3 className="hub-card-title">{title}</h3>
      </div>
      <p className="hub-empty">Loading</p>
    </section>
  );
}

const card = (id, dataset, title, icon, blurb, Component, opts = {}) => ({
  id: `ds-${id}`,
  title,
  icon,
  blurb,
  tag: `From ${dataset}`,
  w: opts.w || 6,
  minW: 4,
  guest: Boolean(opts.guest),
  node: (
    <Suspense fallback={<Skeleton title={title} />}>
      <Component />
    </Suspense>
  ),
});

/** Component cards by dimension id. A dimension without live datasets has none. */
export const DATASET_CARDS = {
  capitol: [
    card(
      'most-held',
      'Politician Tracker',
      'Most held companies',
      'bi-building',
      'The companies the most members still hold.',
      MostHeld,
    ),
    card(
      'house-senate',
      'Politician Tracker',
      'House vs Senate, trailing 12 months',
      'bi-bar-chart-steps',
      'Members trading, trades and volume by chamber.',
      HouseVsSenate,
    ),
  ],
  titans: [
    card(
      'widely-held',
      'Institutional',
      'Most widely held by funds',
      'bi-bank',
      'Securities held by the most 13F filers.',
      WidelyHeld,
    ),
    card(
      'insider-buys',
      'Insider Trading',
      'Largest insider buys, last 30 days',
      'bi-person-check',
      'Open-market purchases by insiders, by value.',
      InsiderBuys,
    ),
  ],
  lighthouse: [
    card(
      'fastest-growth',
      'World Bank Economic Indicators',
      'Fastest growing economies',
      'bi-graph-up-arrow',
      'Highest real GDP growth, latest reported year.',
      FastestGrowth,
    ),
  ],
};

export const datasetCardsFor = (dimensionId) => DATASET_CARDS[dimensionId] || [];
