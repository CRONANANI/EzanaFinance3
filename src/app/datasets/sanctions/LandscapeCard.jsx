'use client';

/**
 * Sanctions landscape: the four headline measures over the address-country
 * map. Oct 16: the program treemap moved to its own card below, so the whole
 * map is on screen when the page opens on a desktop, with Fastest-rising
 * countries beside it. Countries write the page's shared filter, so picking
 * one filters the timeline, the explorer and the listings.
 */
import LandscapeStats from './LandscapeStats';
import MapCard from './MapCard';

export default function LandscapeCard({ summary, kpis, map, filter, pulses, handlers }) {
  return (
    <section className="snx-card snx-landscape" aria-labelledby="snx-landscape-title">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-landscape-title" className="snx-card-title">
            Sanctions landscape
          </h2>
          <p className="snx-card-sub">
            How big the list is and where listed parties are based. Select a country to filter the
            rest of the page.
          </p>
        </div>
      </div>

      <LandscapeStats summary={summary} kpis={kpis} syncedAt={summary.synced} />

      <MapCard
        embedded
        map={map}
        summary={summary}
        filter={filter}
        pulses={pulses}
        onPickCountry={handlers.pickCountry}
        onClearCountry={handlers.clearCountry}
        onPickProgram={handlers.pickProgram}
        onClearProgram={handlers.clearProgram}
        onShowListings={handlers.toTable}
      />
    </section>
  );
}
