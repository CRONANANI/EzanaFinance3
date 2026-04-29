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

  const isPartnerRoute = pathname?.startsWith('/partner-');
  const isSharedPartner =
    !isLoading && isPartner && matchesPartnerRouteList(pathname ?? '', PARTNER_SHARED_APP_ROUTES);

  if (isPartnerRoute || isSharedPartner) {
    return <PartnerNavbar />;
  }

  return <Navbar />;
}
