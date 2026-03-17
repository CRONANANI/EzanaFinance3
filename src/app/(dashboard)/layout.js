'use client';

import { useEffect } from 'react';
import { PortfolioProvider } from '@/contexts/PortfolioContext';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  return (
    <PortfolioProvider>
      <main className="dashboard-main">
        <div className="dashboard-container">{children}</div>
      </main>
    </PortfolioProvider>
  );
}
