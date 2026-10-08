/**
 * The Capitol Watch hub (/datasets/capitol-watch). The other six dimension
 * hubs keep the shared template in ../page.js; this one is the approved
 * redesign (docs/design/capitol-watch-hub). Every module streams on its own
 * Suspense boundary with a skeleton, so one slow read never holds the page.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { HubQueryProvider } from '@/components/datasets/hub/HubClient';
import { getLinkage } from '@/lib/datasets/hub-data';
import { getCapitolEvents } from '@/lib/datasets/capitol-hub/events';
import { getHeatmap, getPortfolio } from '@/lib/datasets/capitol-hub/data';
import { summaryFor } from '../HubCards';
import { fmt } from '../hub-format';
import CwhProvider from './CwhProvider';
import CwhHeader from './CwhHeader';
import SignalCarousel from './SignalCarousel';
import RuleBuilder from './RuleBuilder';
import SignalsPanel from './SignalsPanel';
import { TABS } from './tabs';
import Heatmap from './Heatmap';
import Leaderboard from './Leaderboard';
import Portfolio from './Portfolio';
import './capitol-hub.css';

const DASH = '–';

const DATASET_ICON = {
  'Politician Tracker': 'bi-bank',
  'Campaign Finance Records': 'bi-cash-stack',
  'Lobbying Activity': 'bi-megaphone',
  'Government Contracts': 'bi-briefcase',
  'Committee Assignments': 'bi-diagram-3',
};

/* ── modules ──────────────────────────────────────────────────────────── */

async function TopSignals() {
  const { events, days, error } = await getCapitolEvents();
  return <SignalCarousel events={events} days={days} error={Boolean(error)} />;
}

function TopSignalsSkeleton() {
  return (
    <section className="cwh-section cwh-top" aria-busy="true" aria-label="Top signals loading">
      <div className="cwh-top-head">
        <h2 className="cwh-h2">Top signals this week</h2>
      </div>
      <div className="cwh-card cwh-event cwh-event--skel">
        <div className="cwh-event-text">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="cwh-skel" />
          ))}
        </div>
        <div className="cwh-event-chart">
          <span className="cwh-skel cwh-skel--chart" />
        </div>
      </div>
    </section>
  );
}

async function Panel() {
  const loaded = await Promise.all(TABS.map((t) => getLinkage(t.id)));
  const data = Object.fromEntries(TABS.map((t, i) => [t.key, loaded[i]]));
  return <SignalsPanel data={data} />;
}

function PanelSkeleton() {
  return (
    <section className="cwh-section" aria-busy="true" aria-label="Signals across datasets loading">
      <div className="cwh-section-head">
        <h2 className="cwh-h2">Signals across datasets</h2>
      </div>
      <div className="cwh-card cwh-panel cwh-panel--skel">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="cwh-skel" />
        ))}
      </div>
    </section>
  );
}

async function HeatmapModule() {
  const [house, senate] = await Promise.all([getHeatmap('house'), getHeatmap('senate')]);
  return <Heatmap house={house} senate={senate} />;
}

async function LeaderboardModule() {
  const { rows, error } = await getLinkage('capitol-award-leaders');
  return <Leaderboard rows={rows} error={Boolean(error)} />;
}

async function PortfolioModule() {
  const initial = await getPortfolio(null, null);
  return <Portfolio initial={initial} />;
}

function CardSkeleton({ label, className = '' }) {
  return (
    <section className={`cwh-card ${className}`} aria-busy="true" aria-label={`${label} loading`}>
      <h2 className="cwh-h4">{label}</h2>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="cwh-skel" />
      ))}
    </section>
  );
}

async function DatasetCard({ item }) {
  const s = await summaryFor(item.label);
  const ok = s && !s.empty && !s.error;
  const lead = ok ? s.numbers?.[0] : null;
  const second = ok ? s.numbers?.[1] : null;
  return (
    <article className="cwh-card cwh-ds" title={item.description}>
      <h3 className="cwh-ds-title">
        <i className={`bi ${DATASET_ICON[item.label] || 'bi-database'}`} aria-hidden="true" />
        {item.label}
      </h3>
      {s?.error ? (
        <p className="cwh-caption">Figures unavailable just now</p>
      ) : !ok ? (
        <p className="cwh-caption">No records yet</p>
      ) : (
        <>
          <p className="cwh-ds-lead">{fmt(lead.kind, lead.value) ?? DASH}</p>
          <p className="cwh-ds-label">{lead.label}</p>
          {second ? (
            <p className="cwh-ds-second">
              {fmt(second.kind, second.value) ?? DASH} {second.label.toLowerCase()}
            </p>
          ) : null}
        </>
      )}
      <div className="cwh-ds-foot">
        <span className="cwh-ds-fresh">
          {ok && s.freshest ? fmt('date', s.freshest).toUpperCase() : ''}
        </span>
        <Link href={item.href} className="cwh-open" aria-label={`Open ${item.label}`}>
          Open <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function DatasetSkeleton({ item }) {
  return (
    <article className="cwh-card cwh-ds" aria-busy="true">
      <h3 className="cwh-ds-title">
        <i className={`bi ${DATASET_ICON[item.label] || 'bi-database'}`} aria-hidden="true" />
        {item.label}
      </h3>
      <span className="cwh-skel" />
      <span className="cwh-skel cwh-skel--short" />
    </article>
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */

export default function CapitolWatchHub({ dimension }) {
  const intro = (
    <>
      <p className="cwh-eyebrow">
        <i className={`bi ${dimension.biIcon}`} aria-hidden="true" /> DATASETS · CAPITOL WATCH
      </p>
      <h1 className="cwh-title">{dimension.label}</h1>
      <p className="cwh-purpose">
        What Congress is doing with money right now: trades, committees, campaign cash, lobbying and
        the contracts that follow.
      </p>
    </>
  );

  return (
    <HubQueryProvider>
      <CwhProvider>
        <div className="cwh-tokens cwh-page">
          <CwhHeader intro={intro} />

          <Suspense fallback={<TopSignalsSkeleton />}>
            <TopSignals />
          </Suspense>

          <RuleBuilder />

          <Suspense fallback={<PanelSkeleton />}>
            <Panel />
          </Suspense>

          <div className="cwh-row">
            <Suspense
              fallback={
                <CardSkeleton label="Where oversight and ownership overlap" className="cwh-heat" />
              }
            >
              <HeatmapModule />
            </Suspense>
            <Suspense
              fallback={
                <CardSkeleton label="Who reads contract awards best" className="cwh-lead" />
              }
            >
              <LeaderboardModule />
            </Suspense>
          </div>

          <Suspense
            fallback={
              <CardSkeleton label="Congress's portfolio" className="cwh-section cwh-port" />
            }
          >
            <PortfolioModule />
          </Suspense>

          <section className="cwh-section cwh-datasets" aria-labelledby="cwh-ds-h">
            <div className="cwh-section-head">
              <h2 className="cwh-h2" id="cwh-ds-h">
                The five datasets
              </h2>
              <span className="cwh-caption">open any for the full table</span>
            </div>
            <div className="cwh-ds-grid">
              {dimension.items.map((item) => (
                <Suspense key={item.label} fallback={<DatasetSkeleton item={item} />}>
                  <DatasetCard item={item} />
                </Suspense>
              ))}
            </div>
          </section>
        </div>
        <footer className="cwh-tokens cwh-sources">
          <p>
            <i className="bi bi-file-earmark-text" aria-hidden="true" /> Sources: House Clerk and
            Senate eFD (STOCK Act), FEC, Senate LDA filings, USAspending.gov, congress-legislators,
            SEC Forms 4, 13F, 13D/G. Amounts are disclosed ranges; holdings are inferred from
            disclosures. Nothing here is investment advice.
          </p>
        </footer>
      </CwhProvider>
    </HubQueryProvider>
  );
}
