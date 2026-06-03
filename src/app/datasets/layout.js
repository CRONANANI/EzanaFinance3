'use client';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { DatasetsSubnav } from '@/components/marketing/DatasetsSubnav';
import '../marketing-explore.css';

export default function DatasetsLayout({ children }) {
  return (
    <MarketingPageShell>
      <DatasetsSubnav />
      {children}
    </MarketingPageShell>
  );
}
