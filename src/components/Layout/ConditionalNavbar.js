'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Layout/Navbar';
import { PartnerNavbar } from '@/components/partner/PartnerNavbar';
import { usePartner } from '@/contexts/PartnerContext';

/**
 * Renders PartnerNavbar on partner routes (/partner-*), Navbar otherwise.
 * PartnerProvider must wrap this component.
 */
export function ConditionalNavbar() {
  const pathname = usePathname();
  const isPartnerRoute = pathname?.startsWith('/partner-');

  if (isPartnerRoute) {
    return <PartnerNavbar />;
  }

  return <Navbar />;
}
