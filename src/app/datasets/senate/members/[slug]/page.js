import MemberRoute from '@/components/datasets/disclosures/MemberRoute';
import { SENATE } from '@/components/datasets/disclosures/chamber-config';

export const metadata = {
  title: 'Senate member disclosures | Ezana',
  description: 'Filing history and disclosed transactions for one member of the U.S. Senate.',
};

export default async function Page({ params }) {
  const { slug } = await params;
  return <MemberRoute config={SENATE} slug={slug} sample />;
}
