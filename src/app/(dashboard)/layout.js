'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MobileBottomNav } from '@/components/Layout/MobileBottomNav';
import { DashboardTrialShell } from '@/components/DashboardTrialShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TutorialWalkthrough } from '@/components/TutorialWalkthrough';
import '@/components/Layout/mobile-bottom-nav.css';
import './layout.css';
import './dashboard-polish.css';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const isMarketAnalysisFullscreen = pathname === '/market-analysis';

  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  return (
    <ErrorBoundary>
      <TutorialWalkthrough />
      <main
        className={`dashboard-main dashboard-main-content${isMarketAnalysisFullscreen ? ' dashboard-main-content--fullscreen' : ''}`}
        id="main-content"
      >
        <div className="dashboard-container">
          <DashboardTrialShell>{children}</DashboardTrialShell>
        </div>
      </main>
      <MobileBottomNav />
    </ErrorBoundary>
  );
}
