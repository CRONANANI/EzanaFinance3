import PoliticianTracker from '@/components/datasets/politician-tracker/PoliticianTracker';

export const metadata = {
  title: 'Politician tracker | Ezana',
  description:
    'Every member of the U.S. House and Senate with disclosed trades under the STOCK Act, in one list, with each politician’s trade activity, the members they trade most like, and the federal contractors among the companies they trade. Amounts are the ranges members disclose.',
};

export default function Page({ searchParams }) {
  const member = typeof searchParams?.member === 'string' ? searchParams.member : null;
  return <PoliticianTracker initialMember={member} />;
}
