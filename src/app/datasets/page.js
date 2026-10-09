import { Suspense } from 'react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { hubHref } from '@/lib/datasets/hubs';
import {
  deriveDimensions,
  radarLayout,
  resolveDimension,
  taxonomyCounts,
  compactCount,
  rollup,
  MIDDOT,
} from './sonar/derive';
import { figuresFor, workedExample } from './sonar/data';
import { WORKED_EXAMPLE, TRY_CHIPS } from './sonar/worked-example';
import { SonarSelectionProvider, DimensionSlot } from './sonar/SonarSelection';
import Radar from './sonar/Radar';
import QueryConsole from './sonar/QueryConsole';
import OtherSix from './sonar/OtherSix';
import Arrivals from './sonar/Arrivals';
import { DetailPanel, DetailPanelSkeleton } from './sonar/DetailPanel';
import './sonar/sonar.css';

/**
 * Datasets index, "Sonar floor". Every dimension and dataset on this page is
 * derived from taxonomy.js; figures are real reads (each dataset's own
 * summary, cached 15 minutes) streamed on their own Suspense boundaries.
 *
 * Server-rendered: header, radar, every detail panel, the other six and the
 * console shell. Client islands: selection (which panel shows, ?dimension=),
 * the radar's motion, the console's actions and Arrivals (which also feeds the
 * layout's ticker slot). The route stays in STANDALONE_ROUTES, so the green
 * CategoryBar sits above it with no dimension active.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Datasets | Ezana',
  description:
    'Seven dimensions of public data, every dataset sourced and attributed, all of it feeding Ezana Sonar: congressional trades, federal contracts, SEC filings, patents, macro data and more.',
};

const DIMS = deriveDimensions(DATASET_TAXONOMY, hubHref);
const COUNTS = taxonomyCounts(DATASET_TAXONOMY);
const ALL_LIVE_LABELS = DIMS.flatMap((d) => d.live.map((x) => x.label));
const DIM_IDS = DIMS.map((d) => d.id);

async function RecordsTotal() {
  const figures = await figuresFor(ALL_LIVE_LABELS);
  const { records } = rollup(ALL_LIVE_LABELS, figures);
  return <>{compactCount(records) ?? MIDDOT}</>;
}

async function ConsoleWithExample({ dims }) {
  const run = await workedExample();
  return <QueryConsole example={WORKED_EXAMPLE} initial={run} chips={TRY_CHIPS} dims={dims} />;
}

export default function DatasetsIndexPage({ searchParams }) {
  const selected = resolveDimension(DATASET_TAXONOMY, searchParams?.dimension);
  const blips = radarLayout(DATASET_TAXONOMY, selected);

  return (
    <SonarSelectionProvider initial={selected} ids={DIM_IDS}>
      <div className="dso-page">
        <header className="dso-header">
          <div className="dso-header-copy">
            <p className="dso-eyebrow dso-mono">DATASETS</p>
            <h1 className="dso-title">Every signal on the sonar</h1>
            <p className="dso-sub">
              Seven dimensions, every dataset sourced and attributed, all of it feeding Ezana Sonar.
              Select a blip to inspect it, or just ask.
            </p>
          </div>
          <dl className="dso-header-stats">
            <div>
              <dt>Live</dt>
              <dd className="dso-mono dso-stat--live">{COUNTS.live}</dd>
            </div>
            <div>
              <dt>Roadmap</dt>
              <dd className="dso-mono dso-stat--road">{COUNTS.roadmap}</dd>
            </div>
            <div>
              <dt>Records</dt>
              <dd className="dso-mono">
                <Suspense fallback={<span className="dso-skel dso-skel--num" />}>
                  <RecordsTotal />
                </Suspense>
              </dd>
            </div>
          </dl>
        </header>

        <div className="dso-band1">
          <section className="dso-sonar" aria-labelledby="dso-sonar-h">
            <p className="dso-sonar-head dso-mono">
              <span className="dso-sonar-live">
                <span className="dso-live-dot" aria-hidden="true" /> LIVE SWEEP
              </span>
              <span>
                {COUNTS.live} DATASETS PINGING · {COUNTS.roadmap} SILENT UNTIL LIVE
              </span>
            </p>
            <h2 className="dso-sonar-title" id="dso-sonar-h">
              Everything below feeds Ezana Sonar
            </h2>
            <Radar blips={blips} pinging={COUNTS.live} silent={COUNTS.roadmap} />
            <p className="dso-legend dso-mono">
              <span>
                <i className="dso-legend-ping" aria-hidden="true" /> PING = NEW RECORDS ARRIVING
              </span>
              <span>
                <i className="dso-legend-dash" aria-hidden="true" /> DASHED = ROADMAP, NEVER FAKED
              </span>
              <span className="dso-legend-motion">SWEEP PAUSES UNDER REDUCED MOTION</span>
            </p>
          </section>

          <Suspense
            fallback={
              <QueryConsole
                example={WORKED_EXAMPLE}
                initial={null}
                pending
                chips={TRY_CHIPS}
                dims={DIMS}
              />
            }
          >
            <ConsoleWithExample dims={DIMS} />
          </Suspense>
        </div>

        <div className="dso-band2">
          <div className="dso-band2-main">
            <div id="dso-detail" className="dso-detail-anchor">
              {DIMS.map((dim) => (
                <DimensionSlot key={dim.id} id={dim.id}>
                  <Suspense fallback={<DetailPanelSkeleton dim={dim} />}>
                    <DetailPanel dim={dim} />
                  </Suspense>
                </DimensionSlot>
              ))}
            </div>
            <OtherSix dims={DIMS} />
          </div>
          <Arrivals />
        </div>

        <footer className="dso-foot">
          <i className="bi bi-file-earmark-text" aria-hidden="true" />
          <p>
            Sources are named per dataset: House Clerk, Senate eFD, FEC, Senate LDA,
            USAspending.gov, SEC EDGAR, USPTO, NASA, OECD and other public records. Roadmap datasets
            show no figures until they are live. Nothing here is investment advice.
          </p>
        </footer>
      </div>
    </SonarSelectionProvider>
  );
}
