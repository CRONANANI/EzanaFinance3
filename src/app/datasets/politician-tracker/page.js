import PoliticianTracker from '@/components/datasets/politician-tracker/PoliticianTracker';

export const metadata = {
  title: 'Politician tracker | Ezana',
  description:
    'Every member of the U.S. House and Senate with disclosed trades under the STOCK Act, ranked by disclosed volume, with each politician’s trade activity, the members they trade most like, and the federal contractors among the companies they trade. Amounts are the ranges members disclose.',
};

const str = (v) => (typeof v === 'string' ? v : null);

/* Query params the page honours on first paint: ?member= opens the panel,
   ?chamber= (from the old per-chamber redirects) preselects the chamber
   filter, ?party=, ?sort= and ?q= restore the toolbar. Defaults are omitted
   from the URL the page writes back. */
export default function Page({ searchParams }) {
  const ch = String(str(searchParams?.chamber) || '').toLowerCase();
  const party = String(str(searchParams?.party) || '').toUpperCase();
  const sort = str(searchParams?.sort);
  return (
    <PoliticianTracker
      initialMember={str(searchParams?.member)}
      initialChamber={ch === 'house' ? 'House' : ch === 'senate' ? 'Senate' : null}
      initialParty={['D', 'R', 'I'].includes(party) ? party : null}
      initialSort={['volume', 'trades', 'latest'].includes(sort) ? sort : 'volume'}
      initialQuery={str(searchParams?.q) || ''}
    />
  );
}
