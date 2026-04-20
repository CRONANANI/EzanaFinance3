'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePartner } from '@/contexts/PartnerContext';
import { matchesPartnerRouteList, PARTNER_SHARED_APP_ROUTES } from '@/lib/partner-chrome';
import { MobileBottomNav } from '@/components/Layout/MobileBottomNav';
import { DashboardTrialShell } from '@/components/DashboardTrialShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TutorialWalkthrough } from '@/components/TutorialWalkthrough';
import { useWatchlistPriceAlerts } from '@/hooks/useWatchlistPriceAlerts';
import '@/components/Layout/mobile-bottom-nav.css';
import './layout.css';
import './dashboard-polish.css';

/* `useLayoutEffect` runs synchronously after DOM mutation but before the
   browser paints — so any correction to body classes happens in the same
   frame as hydration, never as a visible flash. Falls back to useEffect
   during SSR where useLayoutEffect is a no-op (and would warn). */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { isPartner, isLoading } = usePartner();

  // Runs the watchlist price-alert poller for the whole logged-in session.
  // Safe on every dashboard route — it's a no-op when the user has no
  // watchlists with alerts enabled.
  useWatchlistPriceAlerts();

  const isMarketAnalysisFullscreen = pathname === '/market-analysis';
  const isPartnerRoute = pathname?.startsWith('/partner-');
  const isSharedPartner =
    !isLoading && isPartner && matchesPartnerRouteList(pathname ?? '', PARTNER_SHARED_APP_ROUTES);
  const isPartnerExperience = isPartnerRoute || isSharedPartner;

  /* Body classes (`dashboard-page`, `route-regular-dashboard`,
     `route-market-analysis`) are ALSO applied server-side by the root
     layout based on the forwarded pathname (see lib/route-shell.js). The
     effects below are kept to:
       - Keep classes in sync during client-side navigation between
         dashboard segments (SPA transitions don't re-run the server
         layout).
       - Promote a shared-partner viewer (detected only after the partner
         context resolves) from `route-regular-dashboard` → partner chrome
         without reloading.
       - Clean up the classes when the user leaves the dashboard segment
         entirely. */
  useIsomorphicLayoutEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
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
        className={`dashboard-main dashboard-main-content bg-app${isMarketAnalysisFullscreen ? ' dashboard-main-content--fullscreen' : ''}`}
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
