import SupportCenter from '@/components/help-center/SupportCenter';

export const metadata = {
  title: 'User Support | Ezana Help Center',
  description:
    'Search the Ezana help centre or ask the assistant. Answers cite the help articles they come from.',
};

/* ?q= puts the page in the answered state on load (linkable answers). */
export default function UserSupportPage({ searchParams }) {
  const q = typeof searchParams?.q === 'string' ? searchParams.q : '';
  return <SupportCenter audience="user" initialQuestion={q} />;
}
