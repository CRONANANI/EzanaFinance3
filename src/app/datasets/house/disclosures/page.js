import DisclosuresPage from '@/components/datasets/disclosures/DisclosuresPage';
import { HOUSE } from '@/components/datasets/disclosures/chamber-config';

export const metadata = {
  title: 'House financial disclosures | Ezana',
  description:
    'Filings and disclosed transactions from members of the U.S. House, as filed with the Clerk of the House. Amounts are the ranges members disclose.',
};

/* Stage 2: the page renders on the fixture, so the SAMPLE DATA chip is on.
   Stage 4 wires the real tables and turns it off. */
export default function Page() {
  return <DisclosuresPage config={HOUSE} sample />;
}
