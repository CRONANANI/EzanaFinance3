/**
 * The Capitol Watch hub (/datasets/capitol-watch). The other six dimension
 * hubs keep the shared template in ../page.js; this one is the approved
 * redesign (docs/design/capitol-watch-hub). Every module streams on its own
 * Suspense boundary with a skeleton, so one slow read never holds the page.
 *
 * Below the header (EzanaQL editor and result table, fixed), every module is
 * a card on the HubCanvas: draggable, resizable, removable, and addable from
 * the side drawer. Signed-out visitors keep three (the `guest` cards).
 */
import { Suspense, cache } from 'react';
import { HubQueryProvider } from '@/components/datasets/hub/HubClient';
import HubCanvas from '@/components/datasets/hub/canvas/HubCanvas';
import { getLinkage } from '@/lib/datasets/hub-data';
import { getCapitolEvents } from '@/lib/datasets/capitol-hub/events';
import {
  getAwardReaders,
  getHeatmap,
  getLobbyingRatio,
  getPortfolio,
} from '@/lib/datasets/capitol-hub/data';
import { getDatasetVisuals } from '@/lib/datasets/capitol-hub/dataset-visuals';
import { summaryFor } from '../HubCards';
import { DatasetTile, DatasetTileSkeleton, orderTiles } from './DatasetTiles';
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

/* One visuals read per request, shared by the five tiles. */
const visualsOnce = cache(() => getDatasetVisuals());

async function DatasetTileAsync({ item, index }) {
  const [summary, visuals] = await Promise.all([summaryFor(item.label), visualsOnce()]);
  return <DatasetTile item={item} summary={summary} visuals={visuals} index={index} />;
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

  /* The canvas registry, in default (member) order. `w` is the default column
     span on 12; `guest` marks the three cards a signed-out visitor can place.
     Each node keeps its own Suspense boundary, so loading is unchanged. */
  const cards = [
    {
      id: 'top-signals',
      title: 'Top signals this week',
      icon: 'bi-lightning-charge',
      blurb: 'The week’s strongest trades, awards and filings, ranked.',
      w: 12,
      minW: 6,
      guest: true,
      node: (
        <Suspense fallback={<TopSignalsSkeleton />}>
          <TopSignals />
        </Suspense>
      ),
    },
    {
      id: 'rule-builder',
      title: 'Signal rule builder',
      icon: 'bi-sliders',
      blurb: 'Compose your own signal from trades, committees and awards.',
      w: 12,
      minW: 6,
      node: <RuleBuilder />,
    },
    {
      id: 'signals',
      title: 'Signals across datasets',
      icon: 'bi-diagram-3',
      blurb: 'Trades near contract awards, committee overlaps and lobbying ratios.',
      w: 12,
      minW: 6,
      guest: true,
      node: (
        <Suspense fallback={<PanelSkeleton />}>
          <Panel />
        </Suspense>
      ),
    },
    {
      id: 'heatmap',
      title: 'Where oversight and ownership overlap',
      icon: 'bi-grid-3x3-gap',
      blurb: 'Committee seats against the sectors their members trade.',
      w: 7,
      minW: 5,
      node: (
        <Suspense
          fallback={
            <CardSkeleton label="Where oversight and ownership overlap" className="cwh-heat" />
          }
        >
          <HeatmapModule />
        </Suspense>
      ),
    },
    {
      id: 'leaderboard',
      title: 'Who reads contract awards best',
      icon: 'bi-trophy',
      blurb: 'Traders whose moves around federal awards paid off most often.',
      w: 5,
      minW: 4,
      node: (
        <Suspense
          fallback={<CardSkeleton label="Who reads contract awards best" className="cwh-lead" />}
        >
          <LeaderboardModule />
        </Suspense>
      ),
    },
    {
      id: 'portfolio',
      title: 'Congress’s portfolio',
      icon: 'bi-pie-chart',
      blurb: 'What sitting members hold, by stock and by sector, estimated from filings.',
      w: 12,
      minW: 6,
      guest: true,
      node: (
        <Suspense
          fallback={<CardSkeleton label="Congress's portfolio" className="cwh-section cwh-port" />}
        >
          <PortfolioModule />
        </Suspense>
      ),
    },
    {
      id: 'datasets',
      title: 'The five datasets',
      icon: 'bi-collection',
      blurb: 'Open any Capitol Watch dataset for its full table.',
      w: 12,
      minW: 6,
      node: (
        <section className="cwh-section cwh-datasets" aria-labelledby="cwh-ds-h">
          <div className="cwh-section-head">
            <h2 className="cwh-h2" id="cwh-ds-h">
              The five datasets
            </h2>
            <span className="cwh-caption">open any for the full table</span>
          </div>
          <div className="cwh-dst-grid">
            {orderTiles(dimension.items).map((item, index) => (
              <Suspense
                key={item.label}
                fallback={<DatasetTileSkeleton item={item} index={index} />}
              >
                <DatasetTileAsync item={item} index={index} />
              </Suspense>
            ))}
          </div>
        </section>
      ),
    },
  ];

  return (
    <HubQueryProvider>
      <CwhProvider>
        <div className="cwh-tokens cwh-page">
          <CwhHeader intro={intro} />

          <HubCanvas hubId="capitol" label="Capitol Watch cards" cards={cards} />
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
