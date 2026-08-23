'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { usePartner } from '@/contexts/PartnerContext';
import { matchesPartnerRouteList, PARTNER_SHARED_APP_ROUTES } from '@/lib/partner-chrome';
import { MobileBottomNav } from '@/components/Layout/MobileBottomNav';
import { DashboardTrialShell } from '@/components/DashboardTrialShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TutorialWalkthrough } from '@/components/TutorialWalkthrough';
import { BetaLockGate } from '@/components/beta/BetaLockGate';
import { useWatchlistPriceAlerts } from '@/hooks/useWatchlistPriceAlerts';
import '@/components/Layout/mobile-bottom-nav.css';
import './layout.css';
import './dashboard-polish.css';

/* `useLayoutEffect` runs synchronously after DOM mutation but before the
   browser paints — so any correction to body classes happens in the same
   frame as hydration, never as a visible flash. Falls back to useEffect
   during SSR where useLayoutEffect is a no-op (and would warn). */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isPartner, isLoading } = usePartner();

  // Track the previous route in sessionStorage so the Settings page's
  // "Back to {Page}" button knows where the user actually came from.
  // Skipped when the user is on /settings itself — we want to preserve
  // the route they navigated FROM, not let /settings overwrite itself.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname && pathname !== '/settings' && !pathname.startsWith('/settings/')) {
      try {
        window.sessionStorage.setItem('previous-route', pathname);
      } catch {
        /* sessionStorage unavailable — ignore */
      }
    }
  }, [pathname]);

  // Runs the watchlist price-alert poller for the whole logged-in session.
  // Safe on every dashboard route — it's a no-op when the user has no
  // watchlists with alerts enabled.
  useWatchlistPriceAlerts();

  const isMarketAnalysisFullscreen = pathname === '/market-analysis';
  const isEchoArticle =
    !!pathname &&
    pathname.startsWith('/ezana-echo/') &&
    pathname !== '/ezana-echo/archived' &&
    !pathname.startsWith('/ezana-echo/author/');
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

    if (isEchoArticle) {
      body.classList.add('route-echo-article');
    } else {
      body.classList.remove('route-echo-article');
    }

    return () => {
      body.classList.remove('route-regular-dashboard');
      body.classList.remove('route-market-analysis');
      body.classList.remove('route-echo-article');
    };
  }, [isPartnerExperience, isMarketAnalysisFullscreen, isEchoArticle]);

  return (
    <ErrorBoundary>
      <TutorialWalkthrough />
      <main
        className={`dashboard-main dashboard-main-content bg-app${isMarketAnalysisFullscreen ? ' dashboard-main-content--fullscreen' : ''}`}
        id="main-content"
      >
        <div
          className={`dashboard-container${isPartnerExperience ? ' dashboard-container--partner-inset' : ''}`}
        >
          <DashboardTrialShell>
            <BetaLockGate>{children}</BetaLockGate>
          </DashboardTrialShell>
        </div>
      </main>
      {/* The tab bar is authenticated navigation: every destination it offers
          (Dashboard, Trade, Community, Profile) requires a session. Two routes
          in this segment are public (the Echo hub and article pages), and the
          bar was rendering there for signed-out visitors. Gated on auth rather
          than on route so logged-in mobile keeps it everywhere, and gated in
          the tree rather than in CSS so it is absent from the DOM, not merely
          hidden. Signed-out visitors get PublicMobileCta from the root layout
          instead. */}
      {isAuthenticated ? <MobileBottomNav /> : null}
    </ErrorBoundary>
  );
}
