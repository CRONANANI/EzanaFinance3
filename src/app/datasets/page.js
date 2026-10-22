import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { resolveDimension, taxonomyCounts } from './sonar/derive';
import { SonarSelectionProvider } from './sonar/SonarSelection';
import OrbitalMap from './sonar/OrbitalMap';
import ConsoleRail, { RailStatus } from './sonar/ConsoleRail';
import OrbitalNewsTicker from './sonar/OrbitalNewsTicker';
import { PulseProvider } from './sonar/PulseProvider';
import { PulseStage } from './sonar/PulseBrief';
import { readPulse } from '@/lib/datasets/pulse/read';
import GlobeBackground from './sonar/GlobeBackground';
import { SonarExperience } from '@/components/sonar/SonarExperience';
import './sonar/sonar.css';

/**
 * Datasets index: the Sonar search on the landing Sonar band's green ground,
 * over a green-tinted globe of flickering city lights.
 * The orbital map card ("Everything below feeds Ezana Sonar") sits under the
 * search bar; sending a ping hides it, shows the stacked-block loader, then
 * the results. Every mark on the map is derived from taxonomy.js.
 *
 * Oct 21: the top-bar belt carries the live pulse, the freshest signals from
 * every live dataset (src/lib/datasets/pulse), refreshed on the client every
 * five minutes. Clicking a signal opens its brief (findings, stats, chart) in
 * the deck's place (PulseStage); ?signal= reopens it. The console rail under
 * the deck is the "continuum" design: one trace through all seven dimensions.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Datasets | Ezana',
  description:
    'Seven dimensions of public data, every dataset sourced and attributed, all of it feeding Ezana Sonar: congressional trades, federal contracts, SEC filings, patents, macro data and more.',
};

const COUNTS = taxonomyCounts(DATASET_TAXONOMY);
const DIM_IDS = DATASET_TAXONOMY.map((d) => d.id);
/* What the scene draws: each dimension, its live count and its datasets. */
const ORBIT_DIMS = DATASET_TAXONOMY.map((d) => {
  const liveCount = d.items.filter((it) => it.live).length;
  return {
    id: d.id,
    label: d.label,
    live: liveCount > 0,
    liveCount,
    items: d.items.map((it) => ({ label: it.label, href: it.href, live: Boolean(it.live) })),
  };
});

const EMPTY_PULSE = { items: [], datasets: {}, partial: true };

export default async function DatasetsIndexPage({ searchParams }) {
  /* A short budget for first paint: anything still warming arrives with the
     client's first refresh a few seconds later. readPulse never throws. */
  let pulse = EMPTY_PULSE;
  try {
    pulse = await readPulse({ budgetMs: 1800 });
  } catch {
    /* No pulse, no belt: the map still renders. */
  }
  const selected = resolveDimension(DATASET_TAXONOMY, searchParams?.dimension);
  const signal = typeof searchParams?.signal === 'string' ? searchParams.signal : null;

  const map = (
    <SonarSelectionProvider initial={selected} ids={DIM_IDS}>
      <PulseProvider initial={pulse} initialKey={signal}>
        <OrbitalNewsTicker>
          <section
            className="dso-sonar dso-sonar--solo dcr-scope"
            aria-label="The seven dataset dimensions that feed Ezana Sonar"
          >
            <RailStatus dims={ORBIT_DIMS} live={COUNTS.live} total={COUNTS.live + COUNTS.roadmap} />
            <PulseStage>
              <OrbitalMap dims={ORBIT_DIMS} pinging={COUNTS.live} silent={COUNTS.roadmap} />
            </PulseStage>
            <ConsoleRail dims={ORBIT_DIMS} />
          </section>
        </OrbitalNewsTicker>
      </PulseProvider>
    </SonarSelectionProvider>
  );

  return (
    <div className="dso-ground">
      <div className="dso-ground-bg">
        <GlobeBackground />
      </div>
      <div className="dso-page dso-page--search">
        <SonarExperience
          variant="datasets"
          heroAddon={map}
          initialQuery={typeof searchParams?.q === 'string' ? searchParams.q : null}
        />
      </div>
    </div>
  );
}
