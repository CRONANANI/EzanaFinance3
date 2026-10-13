/**
 * The component cards each live dataset offers to its dimension's hub. One
 * async server component per card, each reading through the dataset page's
 * own loader (already cached), so a card shows the same figures as the page
 * it comes from. Register new ones in DATASET_CARDS below.
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
import { lighthouseLatest } from '@/lib/lighthouse/store';
import { usd, shortDate } from '@/lib/titans/format';

const n = (v) => (v == null ? null : Number(v).toLocaleString('en-US'));

/* ── Capitol Watch ──────────────────────────────────────────────────── */

async function MostHeld() {
  const s = await readSummary({ tickerLimit: 10 }).catch(() => ({ error: 'read' }));
  const rows = (s?.held || []).slice(0, 8).map((h) => ({
    key: h.ticker,
    name: h.company || h.ticker,
    meta: h.lastBuy ? `${h.ticker} · last buy ${shortDate(h.lastBuy)}` : h.ticker,
    value: `${n(h.holders)} holding`,
    href: `/datasets/politician-tracker`,
  }));
  return (
    <ListCard
      id="most-held"
      title="Most held companies"
      dataset="Politician Tracker"
      href="/datasets/politician-tracker"
      desc="The companies the most members of Congress still hold, inferred from disclosures."
      rows={rows}
      error={Boolean(s?.error)}
      empty="Appears once holdings are inferred from disclosures."
      foot="Holding means a disclosed purchase not followed by a full sale. House Clerk and Senate eFD."
    />
  );
}

async function HouseVsSenate() {
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
  return (
    <ListCard
      id="house-senate"
      title="House vs Senate, trailing 12 months"
      dataset="Politician Tracker"
      href="/datasets/politician-tracker"
      desc="Members trading, disclosed trades and disclosed volume by chamber."
      rows={rows}
      error={Boolean(s?.error)}
      empty="Appears once disclosures are loaded."
      foot="Volume is the sum of the midpoints of disclosed ranges."
    />
  );
}

/* ── Titans Shadow ──────────────────────────────────────────────────── */

async function WidelyHeld() {
  const o = await getInstitutionalOverview().catch(() => null);
  const rows = (o?.widelyHeld || []).slice(0, 8).map((r) => ({
    key: r.cusip || r.ticker || r.issuer,
    name: r.issuer || r.ticker,
    meta: r.ticker || null,
    value: `${n(r.holders)} funds`,
    href: '/datasets/institutional',
  }));
  return (
    <ListCard
      id="widely-held"
      title={
        o?.quarterLabel
          ? `Most widely held by funds, ${o.quarterLabel}`
          : 'Most widely held by funds'
      }
      dataset="Institutional"
      href="/datasets/institutional"
      desc="Securities held by the most 13F filers in the latest complete quarter."
      rows={rows}
      error={o === null}
      empty="Appears once a complete 13F quarter is indexed."
      foot="SEC EDGAR Form 13F."
    />
  );
}

async function InsiderBuys() {
  const o = await getInsiderOverview().catch(() => null);
  const rows = (o?.topBuys || []).slice(0, 8).map((r) => ({
    key: `${r.ticker}-${r.insider}-${r.date}`,
    name: r.company || r.ticker,
    meta: `${r.insider || 'Insider'} · ${shortDate(r.date)}`,
    value: usd(r.value),
    href: '/datasets/insider',
  }));
  return (
    <ListCard
      id="insider-buys"
      title="Largest insider buys, last 30 days"
      dataset="Insider Trading"
      href="/datasets/insider"
      desc="Open-market purchases by officers, directors and large holders, by value."
      rows={rows}
      error={o === null}
      empty="Appears as Form 4 filings are indexed."
      foot="SEC EDGAR Form 4, transaction code P."
    />
  );
}

/* ── Global Empire Lighthouse ───────────────────────────────────────── */

async function FastestGrowth() {
  const obs = await lighthouseLatest('worldbank', ['NY.GDP.MKTP.KD.ZG']).catch(() => null);
  const rows = (obs || [])
    .filter((o) => o.latest_value != null)
    .sort((a, b) => Number(b.latest_value) - Number(a.latest_value))
    .slice(0, 8)
    .map((o) => ({
      key: o.ref_area,
      name: o.ref_area_name || o.ref_area,
      meta: `Real GDP growth, ${String(o.latest_period).slice(0, 4)}`,
      value: `${Number(o.latest_value).toFixed(1)}%`,
      href: '/datasets/world-bank',
    }));
  return (
    <ListCard
      id="fastest-growth"
      title="Fastest-growing economies"
      dataset="World Bank Economic Indicators"
      href="/datasets/world-bank"
      desc="Countries with the highest real GDP growth in their latest reported year."
      rows={rows}
      error={obs === null}
      empty="Appears once the World Bank data is loaded."
      foot="World Bank Indicators API (CC BY 4.0)."
    />
  );
}

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
      'Fastest-growing economies',
      'bi-graph-up-arrow',
      'Highest real GDP growth, latest reported year.',
      FastestGrowth,
    ),
  ],
};

export const datasetCardsFor = (dimensionId) => DATASET_CARDS[dimensionId] || [];
