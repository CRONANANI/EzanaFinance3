'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MobileBottomNav } from '@/components/Layout/MobileBottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
      <main
        className={`dashboard-main dashboard-main-content${isMarketAnalysisFullscreen ? ' dashboard-main-content--fullscreen' : ''}`}
        id="main-content"
      >
        <div className="dashboard-container">{children}</div>
      </main>
      <MobileBottomNav />
    </ErrorBoundary>
  );
}
