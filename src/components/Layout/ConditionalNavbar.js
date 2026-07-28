'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Layout/Navbar';
import { PartnerNavbar } from '@/components/partner/PartnerNavbar';
import { usePartner } from '@/contexts/PartnerContext';
import { matchesPartnerRouteList, PARTNER_SHARED_APP_ROUTES } from '@/lib/partner-chrome';

/**
 * Renders PartnerNavbar on /partner-* and on shared routes (settings, research) for partners.
 * PartnerProvider must wrap this component.
 */
export function ConditionalNavbar() {
  const pathname = usePathname();
  const { isPartner, isLoading } = usePartner();

  if (pathname === '/account-locked') {
    return null;
  }

  // The Ezana Echo homepage renders its own two-row masthead (wordmark + category
  // nav bar), so the shared marketing top nav is suppressed there only. Other
  // Echo routes (the article reader, archived, author) keep the global chrome.
  if (pathname === '/ezana-echo') {
    return null;
  }

  const isPartnerRoute = pathname?.startsWith('/partner-');
  const isSharedPartner =
    !isLoading && isPartner && matchesPartnerRouteList(pathname ?? '', PARTNER_SHARED_APP_ROUTES);

  if (isPartnerRoute || isSharedPartner) {
    return <PartnerNavbar />;
  }

  return <Navbar />;
}
