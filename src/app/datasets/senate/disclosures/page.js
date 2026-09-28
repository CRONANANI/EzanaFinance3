import DisclosuresPage from '@/components/datasets/disclosures/DisclosuresPage';
import { SENATE } from '@/components/datasets/disclosures/chamber-config';

export const metadata = {
  title: 'Senate financial disclosures | Ezana',
  description:
    'Filings and disclosed transactions from members of the U.S. Senate, as filed with the Senate Office of Public Records. Amounts are the ranges members disclose.',
};

/* Sample until a Senate ingest exists. The page is the real implementation
   reading the real API contract; only its data is a fixture, and it says so
   on its face with the SAMPLE DATA chip and placeholder names. */
export default function Page() {
  return <DisclosuresPage config={SENATE} sample />;
}
