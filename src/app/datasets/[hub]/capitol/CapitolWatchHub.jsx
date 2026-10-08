/**
 * The Capitol Watch hub (/datasets/capitol-watch). The other six dimension
 * hubs keep the shared template in ../page.js; this one is the approved
 * redesign (docs/design/capitol-watch-hub). Every module streams on its own
 * Suspense boundary with a skeleton, so one slow read never holds the page.
 */
import { Suspense } from 'react';
import { HubQueryProvider } from '@/components/datasets/hub/HubClient';
import { getLinkage } from '@/lib/datasets/hub-data';
import { getCapitolEvents } from '@/lib/datasets/capitol-hub/events';
import {
  getAwardReaders,
  getHeatmap,
  getLobbyingRatio,
  getPortfolio,
} from '@/lib/datasets/capitol-hub/data';
import CwhProvider from './CwhProvider';
import CwhHeader from './CwhHeader';
import SignalCarousel from './SignalCarousel';
import RuleBuilder from './RuleBuilder';
import SignalsPanel from './SignalsPanel';
import { TABS } from './tabs';
import Heatmap from './Heatmap';
import Leaderboard from './Leaderboard';
import Portfolio from './Portfolio';
import DatasetTiles, { TilesSkeleton } from './DatasetTiles';
import './capitol-hub.css';

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

/* Tab D reads the lobbying-to-award ratio instead of its linkage loader;
   tab B adds every trader near an award to the linkage's company list. */
async function Panel() {
  const linked = TABS.filter((t) => t.key !== 'lobbying');
  const [loaded, readers, ratio] = await Promise.all([
    Promise.all(linked.map((t) => getLinkage(t.id))),
    getAwardReaders(),
    getLobbyingRatio(1),
  ]);
  const data = Object.fromEntries(linked.map((t, i) => [t.key, loaded[i]]));
  data.readers = { rows: [], extra: data.readers?.extra || null, readers };
  data.lobbying = { rows: [], ratio };
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

/* The House renders on the server; the Senate loads on demand in the card. */
async function HeatmapModule() {
  const house = await getHeatmap('house');
  return <Heatmap house={house} />;
}

async function LeaderboardModule() {
  const [readers, leaders] = await Promise.all([
    getAwardReaders(),
    getLinkage('capitol-award-leaders'),
  ]);
  return <Leaderboard readers={readers} companies={leaders?.extra?.companies || []} />;
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
            <Suspense fallback={<TilesSkeleton items={dimension.items} />}>
              <DatasetTiles items={dimension.items} />
            </Suspense>
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
