import SupportCenter from '@/components/help-center/SupportCenter';

export const metadata = {
  title: 'Partner Support | Ezana Help Center',
  description:
    'Help for Ezana partners and organisations: onboarding, the partner dashboard, copy trading, the API. Ask the assistant; answers cite their sources.',
};

export default function PartnerSupportPage({ searchParams }) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : '';
  return <SupportCenter audience="partner" initialQuestion={q} />;
}
