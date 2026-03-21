'use client';

import { useEffect } from 'react';
import { MobileBottomNav } from '@/components/Layout/MobileBottomNav';
import '@/components/Layout/mobile-bottom-nav.css';
import './layout.css';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  return (
    <>
      <main className="dashboard-main" id="main-content">
        <div className="dashboard-container">{children}</div>
      </main>
      <MobileBottomNav />
    </>
  );
}
