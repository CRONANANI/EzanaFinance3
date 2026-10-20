import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { resolveDimension, taxonomyCounts } from './sonar/derive';
import { SonarSelectionProvider } from './sonar/SonarSelection';
import OrbitalMap from './sonar/OrbitalMap';
import IngestionStreams from './sonar/IngestionStreams';
import OrbitalNewsTicker from './sonar/OrbitalNewsTicker';
import { buildNewsItems } from './sonar/news-feed';
import { readOrbitalFeed } from '@/lib/datasets/orbital-feed';
import GlobeBackground from './sonar/GlobeBackground';
import { SonarExperience } from '@/components/sonar/SonarExperience';
import './sonar/sonar.css';

/**
 * Datasets index: the Sonar search on the landing Sonar band's green ground,
 * over a green-tinted globe of flickering city lights.
 * The orbital map card ("Everything below feeds Ezana Sonar") sits under the
 * search bar; sending a ping hides it, shows the stacked-block loader, then
 * the results. Every mark on the map is derived from taxonomy.js; the
 * notification cards around it are real rows from the Politician Tracker and
 * Government Contracts feeds (readOrbitalFeed). The ingestion streams
 * (Oct 20) draw the seven dimensions as sources feeding the device.
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

export default async function DatasetsIndexPage({ searchParams }) {
  let feed = { trades: [], awards: [] };
  try {
    feed = await readOrbitalFeed();
  } catch {
    /* No feed, no cards: the map still renders. */
  }
  const newsItems = buildNewsItems(feed, DATASET_TAXONOMY);
  const selected = resolveDimension(DATASET_TAXONOMY, searchParams?.dimension);

  const map = (
    <SonarSelectionProvider initial={selected} ids={DIM_IDS}>
      <OrbitalNewsTicker items={newsItems}>
        <section
          className="dso-sonar dso-sonar--solo"
          aria-label="The seven dataset dimensions that feed Ezana Sonar"
        >
          <IngestionStreams dims={ORBIT_DIMS}>
            <OrbitalMap dims={ORBIT_DIMS} pinging={COUNTS.live} silent={COUNTS.roadmap} />
          </IngestionStreams>
        </section>
      </OrbitalNewsTicker>
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
