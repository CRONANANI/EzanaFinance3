import MemberRoute from '@/components/datasets/disclosures/MemberRoute';
import { HOUSE } from '@/components/datasets/disclosures/chamber-config';

export const metadata = {
  title: 'House member disclosures | Ezana',
  description: 'Filing history and disclosed transactions for one member of the U.S. House.',
};

export default async function Page({ params }) {
  const { slug } = await params;
  return <MemberRoute config={HOUSE} slug={slug} sample />;
}
