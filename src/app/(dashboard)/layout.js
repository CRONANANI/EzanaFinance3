'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePartner } from '@/contexts/PartnerContext';
import { matchesPartnerRouteList, PARTNER_SHARED_APP_ROUTES } from '@/lib/partner-chrome';
import { MobileBottomNav } from '@/components/Layout/MobileBottomNav';
import { DashboardTrialShell } from '@/components/DashboardTrialShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TutorialWalkthrough } from '@/components/TutorialWalkthrough';
import '@/components/Layout/mobile-bottom-nav.css';
import './layout.css';
import './dashboard-polish.css';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { isPartner, isLoading } = usePartner();
  const isMarketAnalysisFullscreen = pathname === '/market-analysis';
  const isPartnerRoute = pathname?.startsWith('/partner-');
  const isSharedPartner =
    !isLoading && isPartner && matchesPartnerRouteList(pathname ?? '', PARTNER_SHARED_APP_ROUTES);
  const isPartnerExperience = isPartnerRoute || isSharedPartner;

  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  useEffect(() => {
    const body = document.body;
    const isRegularDashboard = !isPartnerExperience;

    if (isRegularDashboard) {
      body.classList.add('route-regular-dashboard');
    } else {
      body.classList.remove('route-regular-dashboard');
    }

    if (isMarketAnalysisFullscreen) {
      body.classList.add('route-market-analysis');
    } else {
      body.classList.remove('route-market-analysis');
    }

    return () => {
      body.classList.remove('route-regular-dashboard');
      body.classList.remove('route-market-analysis');
    };
  }, [isPartnerExperience, isMarketAnalysisFullscreen]);

  return (
    <ErrorBoundary>
      <TutorialWalkthrough />
      <main
        className={`dashboard-main dashboard-main-content${isMarketAnalysisFullscreen ? ' dashboard-main-content--fullscreen' : ''}`}
        id="main-content"
      >
        <div className={`dashboard-container${isPartnerExperience ? ' dashboard-container--partner-inset' : ''}`}>
          <DashboardTrialShell>{children}</DashboardTrialShell>
        </div>
      </main>
      <MobileBottomNav />
    </ErrorBoundary>
  );
}
