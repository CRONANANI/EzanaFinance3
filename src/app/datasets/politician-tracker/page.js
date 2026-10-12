import ReactDOM from 'react-dom';
import { unstable_cache } from 'next/cache';
import PoliticianTracker from '@/components/datasets/politician-tracker/PoliticianTracker';
import {
  chamberParam,
  partyParam,
  queryParam,
  daysParam,
  readSummary,
} from '@/lib/politicians/congress-store';
import { periodMeta } from '@/lib/politicians/tracker-model';

export const metadata = {
  title: 'Politician tracker | Ezana',
  description:
    'Every member of the U.S. House and Senate with disclosed trades under the STOCK Act, ranked by disclosed volume, with each politician’s trade activity, the members they trade most like, and the federal contractors among the companies they trade. Amounts are the ranges members disclose.',
};

/* Portrait origins. The avatars load unoptimized, straight from these
   hosts, so warming the connections during the HTML response saves a
   DNS + TLS round trip on every first portrait. No crossOrigin: the img
   requests are not CORS, and a CORS preconnect sits in a separate pool. */
function preconnectPortraits() {
  if (typeof ReactDOM.preconnect !== 'function') return;
  ReactDOM.preconnect('https://unitedstates.github.io');
  const sb = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (sb) {
    try {
      ReactDOM.preconnect(new URL(sb).origin);
    } catch {
      /* malformed env: skip the hint */
    }
  }
}

/* Mirrors PERIODS in lib/politicians/tracker-model.js. */
const PERIOD_KEYS = ['30d', '90d', '6m', '1y', '2y', 'all'];

/* The ranking, monthly counts, top and most held tickers for the first
   paint, computed in SQL on the server and cached for 15 minutes per
   filter set (the same window the /api/politicians/summary route uses).
   The client renders the Top eight and the list from it immediately instead
   of waiting for its own round trip. Null when the database is not
   configured or the RPCs are unavailable: the client then fetches as before
   and falls back to its local model. */
const cachedSummary = unstable_cache(
  async (chamber, party, q, sort, windowDays) => {
    const summary = await readSummary({ chamber, party, q, sort, windowDays });
    if (summary.error) return null;
    return { ok: true, windowDays, sort, ...summary, error: undefined };
  },
  ['politician-tracker-summary'],
  { revalidate: 900 },
);

async function initialSummaryFor({ chamber, party, q, sort, period }) {
  try {
    return await cachedSummary(
      chamberParam(chamber ? chamber.toLowerCase() : null),
      partyParam(party),
      queryParam(q || null),
      sort,
      daysParam(String(periodMeta(period).days)),
    );
  } catch {
    return null;
  }
}

const str = (v) => (typeof v === 'string' ? v : null);

/* Query params the page honours on first paint: ?member= opens the panel,
   ?chamber= (from the old per-chamber redirects) preselects the chamber
   filter, ?party=, ?sort=, ?period= and ?q= restore the toolbar. Defaults are omitted
   from the URL the page writes back. */
export default async function Page({ searchParams }) {
  preconnectPortraits();
  const ch = String(str(searchParams?.chamber) || '').toLowerCase();
  const party = String(str(searchParams?.party) || '').toUpperCase();
  const sort = str(searchParams?.sort);
  const period = str(searchParams?.period);
  const initial = {
    initialMember: str(searchParams?.member),
    initialChamber: ch === 'house' ? 'House' : ch === 'senate' ? 'Senate' : null,
    initialParty: ['D', 'R', 'I'].includes(party) ? party : null,
    initialSort: ['volume', 'trades', 'latest'].includes(sort) ? sort : 'volume',
    initialPeriod: PERIOD_KEYS.includes(period) ? period : '1y',
    initialQuery: str(searchParams?.q) || '',
  };
  const initialSummary = await initialSummaryFor({
    chamber: initial.initialChamber,
    party: initial.initialParty,
    q: initial.initialQuery,
    sort: initial.initialSort,
    period: initial.initialPeriod,
  });
  return <PoliticianTracker {...initial} initialSummary={initialSummary} />;
}
