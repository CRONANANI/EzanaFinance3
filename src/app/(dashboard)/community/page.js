'use client';

/* Community (Nov 2026 redesign): src/components/community/CommunityPage.jsx.
   community.css stays for the post composer's shared .ez-btn / .ez-card
   styles; the page itself is styled by community.module.css.

   Council members (useOrg().isOrgUser) get their council's private
   Community on the same address (src/components/org/community), never the
   public retail feed; the retail post route refuses them on the server too.
   Until membership is known nothing is drawn, so neither audience sees the
   other's page flash. */
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import './community.css';
import '@/styles/home-canvas.css';
import { CommunityPage } from '@/components/community/CommunityPage';
import { useOrg } from '@/contexts/OrgContext';

const Pending = () => <div className="dashboard-page-inset ez-canvas" aria-busy="true" />;

const OrgCommunityPage = dynamic(
  () => import('@/components/org/community/OrgCommunityPage').then((m) => m.OrgCommunityPage),
  { loading: Pending },
);

function CommunityForAudience() {
  const { isOrgUser, isLoading } = useOrg();
  if (isLoading) return <Pending />;
  return isOrgUser ? <OrgCommunityPage /> : <CommunityPage />;
}

export default function CommunityRoute() {
  return (
    <Suspense fallback={null}>
      <CommunityForAudience />
    </Suspense>
  );
}
