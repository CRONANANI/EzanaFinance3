import ReactDOM from 'react-dom';
import PoliticianTrackerByCountry from '@/components/datasets/politician-tracker/PoliticianTrackerByCountry';

export const metadata = {
  title: 'Politician tracker | Ezana',
  description:
    'Every member of the U.S. House and Senate with disclosed trades under the STOCK Act, ranked by disclosed volume, and Brazil’s elected officeholders ranked by the assets they declared to the Superior Electoral Court. Filter by country.',
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

const str = (v) => (typeof v === 'string' ? v : null);

/* Query params the page honours on first paint: ?country=br opens Brazil
   (declared assets; ?year= and ?filing= restore it), ?member= opens the panel,
   ?chamber= (from the old per-chamber redirects) preselects the chamber
   filter, ?party=, ?sort=, ?period= and ?q= restore the toolbar. Defaults are omitted
   from the URL the page writes back. */
export default function Page({ searchParams }) {
  preconnectPortraits();
  const ch = String(str(searchParams?.chamber) || '').toLowerCase();
  const party = String(str(searchParams?.party) || '').toUpperCase();
  const sort = str(searchParams?.sort);
  const period = str(searchParams?.period);
  return (
    <PoliticianTrackerByCountry
      initialCountry={String(str(searchParams?.country) || '').toLowerCase() === 'br' ? 'br' : 'us'}
      initialMember={str(searchParams?.member)}
      initialChamber={ch === 'house' ? 'House' : ch === 'senate' ? 'Senate' : null}
      initialParty={['D', 'R', 'I'].includes(party) ? party : null}
      initialSort={['volume', 'trades', 'latest'].includes(sort) ? sort : 'volume'}
      initialPeriod={PERIOD_KEYS.includes(period) ? period : '1y'}
      initialQuery={str(searchParams?.q) || ''}
    />
  );
}
