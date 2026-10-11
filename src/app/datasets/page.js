import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { radarLayout, resolveDimension, taxonomyCounts } from './sonar/derive';
import { SonarSelectionProvider } from './sonar/SonarSelection';
import OrbitalMap from './sonar/OrbitalMap';
import GlobeBackground from './sonar/GlobeBackground';
import { SonarExperience } from '@/components/sonar/SonarExperience';
import './sonar/sonar.css';

/**
 * Datasets index: the Sonar search on the landing Sonar band's green ground,
 * over a green-tinted globe of flickering city lights.
 * The orbital map card ("Everything below feeds Ezana Sonar") sits under the
 * search bar; sending a ping hides it, shows the stacked-block loader, then
 * the results. Every mark on the map is derived from taxonomy.js.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Datasets | Ezana',
  description:
    'Seven dimensions of public data, every dataset sourced and attributed, all of it feeding Ezana Sonar: congressional trades, federal contracts, SEC filings, patents, macro data and more.',
};

const COUNTS = taxonomyCounts(DATASET_TAXONOMY);
const DIM_IDS = DATASET_TAXONOMY.map((d) => d.id);

export default function DatasetsIndexPage({ searchParams }) {
  const selected = resolveDimension(DATASET_TAXONOMY, searchParams?.dimension);
  const blips = radarLayout(DATASET_TAXONOMY, selected);

  const map = (
    <SonarSelectionProvider initial={selected} ids={DIM_IDS}>
      <section className="dso-sonar dso-sonar--solo" aria-labelledby="dso-sonar-h">
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
        <OrbitalMap blips={blips} pinging={COUNTS.live} silent={COUNTS.roadmap} />
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
    </SonarSelectionProvider>
  );

  return (
    <div className="dso-ground">
      <div className="dso-ground-bg">
        <GlobeBackground />
      </div>
      <div className="dso-page dso-page--search">
        <SonarExperience variant="datasets" heroAddon={map} />
      </div>
    </div>
  );
}
