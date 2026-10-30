import { timed } from '@/lib/perf/timed';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { taxonomyCounts } from './sonar/derive';
import { SonarSelectionProvider } from './sonar/SonarSelection';
import OrbitalMap from './sonar/OrbitalMap';
import ConsoleRail from './sonar/ConsoleRail';
import OrbitalNewsTicker from './sonar/OrbitalNewsTicker';
import { PulseProvider } from './sonar/PulseProvider';
import { PulseStage } from './sonar/PulseBrief';
import { readPulse } from '@/lib/datasets/pulse/read';
import GlobeBackground from './sonar/GlobeBackground';
import { SonarExperience } from '@/components/sonar/SonarExperience';
import './sonar/sonar.css';

/**
 * Datasets index (Oct 28 redesign, docs/design/datasets-index-handoff).
 *
 * Top to bottom: the bar with the live pulse belt, the hero and the Ping field
 * in its bracket frame, the Sonar stage (an isometric slab with the seven
 * dimension dots on its ring, OrbitalMap), and the seven dimension cards on a
 * bus (ConsoleRail). Clicking a belt signal opens its brief in the stage's
 * place (PulseStage, ?signal=). Choosing a dot or a card selects that
 * dimension (?dimension=) and expands its card's dataset list. A ping hides
 * the hero and shows Sonar's results (SonarExperience).
 *
 * Every count, status and dataset name comes from taxonomy.js; the pulse from
 * src/lib/datasets/pulse, refreshed on the client every five minutes.
 *
 * Oct 29: this body moved out of page.js so the in-app /sonar route renders
 * the exact same tree (stage="app"); /datasets and /sonar share one server
 * component and one ping pipeline.
 */
const COUNTS = taxonomyCounts(DATASET_TAXONOMY);
const DIM_IDS = DATASET_TAXONOMY.map((d) => d.id);
/* What the stage and the cards draw: each dimension, its icon and tagline,
   its live count and its datasets. No dimension has an activity series yet,
   so `series` is absent and every card draws the dashed baseline. */
const ORBIT_DIMS = DATASET_TAXONOMY.map((d) => {
  const liveCount = d.items.filter((it) => it.live).length;
  return {
    id: d.id,
    label: d.label,
    icon: d.biIcon,
    tagline: d.tagline,
    live: liveCount > 0,
    liveCount,
    items: d.items.map((it) => ({ label: it.label, href: it.href, live: Boolean(it.live) })),
  };
});

const EMPTY_PULSE = { items: [], datasets: {}, partial: true };

export default async function DatasetsSonarIndex({ searchParams, stage = 'datasets' }) {
  /* A short budget for first paint: anything still warming arrives with the
     client's first refresh a few seconds later. readPulse never throws. */
  let pulse = EMPTY_PULSE;
  try {
    pulse = await timed(
      stage === 'app' ? '/sonar' : '/datasets',
      readPulse,
      'readPulse',
    )({
      budgetMs: 1800,
    });
  } catch {
    /* No pulse, no belt: the page is still complete. */
  }
  /* Nothing is selected unless the URL names a real dimension. */
  const rawDim = typeof searchParams?.dimension === 'string' ? searchParams.dimension : null;
  const selected = rawDim && DIM_IDS.includes(rawDim) ? rawDim : null;
  const signal = typeof searchParams?.signal === 'string' ? searchParams.signal : null;

  const map = (
    <SonarSelectionProvider initial={selected} ids={DIM_IDS}>
      <PulseProvider initial={pulse} initialKey={signal}>
        <OrbitalNewsTicker>
          <PulseStage>
            <OrbitalMap dims={ORBIT_DIMS} pinging={COUNTS.live} silent={COUNTS.roadmap} />
          </PulseStage>
          <ConsoleRail dims={ORBIT_DIMS} />
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
          stage={stage}
          heroAddon={map}
          initialQuery={typeof searchParams?.q === 'string' ? searchParams.q : null}
        />
      </div>
    </div>
  );
}
