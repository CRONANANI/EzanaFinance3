'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePartner } from '@/contexts/PartnerContext';
import { isPartnerAppExperience, isPartnerResearchRoute } from '@/lib/partner-chrome';
import { PartnerResearchRibbon } from '@/components/partner/PartnerResearchRibbon';
import '@/components/partner/partner-research-ribbon.css';

/**
 * Syncs body.partner-app for theme + renders partner-only research ribbon.
 */
export function PartnerChromeEffects() {
  const pathname = usePathname();
  const { isPartner, isLoading } = usePartner();

  const experience = isPartnerAppExperience(pathname ?? '', isPartner);
  const showResearchRibbon =
    !isLoading && isPartner && isPartnerResearchRoute(pathname ?? '');

  useEffect(() => {
    if (experience) {
      document.body.classList.add('partner-app');
    } else {
      document.body.classList.remove('partner-app');
    }
    return () => {
      document.body.classList.remove('partner-app');
    };
  }, [experience]);

  return <>{showResearchRibbon ? <PartnerResearchRibbon /> : null}</>;
}
