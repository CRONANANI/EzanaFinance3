import PoliticianTracker from '@/components/datasets/disclosures/PoliticianTracker';

export const metadata = {
  title: 'Politician tracker | Ezana',
  description:
    'Filings and disclosed transactions from members of the U.S. House and Senate, as filed with the Clerk of the House and the Senate Office of Public Records. Amounts are the ranges members disclose.',
};

/* House is live (house_disclosure_filings / house_trades via
   /api/disclosures/house). Senate renders the sample fixture under the
   SAMPLE DATA chip until its ingest exists; see SAMPLE_CHAMBERS. */
export default function Page({ searchParams }) {
  const chamber = searchParams?.chamber === 'senate' ? 'senate' : 'house';
  return <PoliticianTracker initialChamber={chamber} />;
}
