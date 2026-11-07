import { timed } from '@/lib/perf/timed';
import {
  getConflictCountry,
  getConflictMap,
  getConflictOverview,
  normIso3,
} from '@/lib/ucdp/store';
import { conflictWorld } from '@/lib/ucdp/world';
import ConflictClient from './ConflictClient';

/**
 * Armed Conflict Tracker: deaths and events in organized violence from the UCDP
 * Georeferenced Event Dataset (Uppsala Conflict Data Program, CC BY 4.0), loaded weekly into
 * public.ucdp_ged_events by the ucdp macro-sync adapter. Aggregates come from three cached
 * RPCs (src/lib/ucdp/store.js); the map and country panel page through
 * /api/datasets/conflict/*. ?country=SDN opens a country (Sonar links here). Every read
 * degrades to an explicit unavailable state, never a guessed number.
 */
export const dynamic = 'force-dynamic';

export default async function ConflictPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const iso3 = normIso3(sp.country);
  const [overview, map, country] = await Promise.all([
    timed('/datasets/conflict', getConflictOverview, 'getConflictOverview')(),
    timed('/datasets/conflict', getConflictMap, 'getConflictMap')(12, null),
    iso3 ? timed('/datasets/conflict', getConflictCountry, 'getConflictCountry')(iso3) : null,
  ]);
  return (
    <ConflictClient
      overview={overview}
      initialMap={map}
      world={conflictWorld()}
      initialCountry={country}
    />
  );
}
