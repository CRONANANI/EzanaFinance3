import DisclosuresPage from '@/components/datasets/disclosures/DisclosuresPage';
import { HOUSE } from '@/components/datasets/disclosures/chamber-config';

export const metadata = {
  title: 'House financial disclosures | Ezana',
  description:
    'Filings and disclosed transactions from members of the U.S. House, as filed with the Clerk of the House. Amounts are the ranges members disclose.',
};

/* Live: reads house_disclosure_filings and house_trades through
   /api/disclosures/house. No `sample`, so no chip, no placeholder names, and
   no fixture fallback if the data is thin; the page says what is actually
   there. */
export default function Page() {
  return <DisclosuresPage config={HOUSE} />;
}
