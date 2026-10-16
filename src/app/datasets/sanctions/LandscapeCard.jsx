'use client';

/**
 * Sanctions landscape (Oct 15): one card for the whole picture, replacing
 * the four KPI cards and the side-by-side "Programs by size" and "Where
 * listed parties are based" cards (which left an empty gap under the shorter
 * one). Top to bottom: the four headline measures, the program treemap, then
 * the address-country map. Programs and countries both write the page's
 * shared filter, so the left filter rail is gone: picking a tile or a
 * country here filters the timeline, the explorer and the listings.
 */
import LandscapeStats from './LandscapeStats';
import MapCard from './MapCard';
import ProgramsCard from './ProgramsCard';

export default function LandscapeCard({ summary, kpis, map, filter, pulses, handlers }) {
  return (
    <section className="snx-card snx-landscape" aria-labelledby="snx-landscape-title">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-landscape-title" className="snx-card-title">
            Sanctions landscape
          </h2>
          <p className="snx-card-sub">
            How big the list is, the programs behind it and where listed parties are based. Select a
            program or a country to filter the rest of the page.
          </p>
        </div>
      </div>

      <LandscapeStats summary={summary} kpis={kpis} syncedAt={summary.synced} />

      <ProgramsCard
        embedded
        programs={summary.programs}
        themes={summary.themes}
        selected={filter.program}
        onPick={handlers.pickProgram}
      />

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
