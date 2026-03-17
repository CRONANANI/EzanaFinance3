'use client';

import { useEffect } from 'react';

export default function DashboardLayout({ children }) {
  useEffect(() => {
    document.body.classList.add('dashboard-page');
    return () => {
      document.body.classList.remove('dashboard-page');
    };
  }, []);

  return (
    <main className="dashboard-main">
      <div className="dashboard-container">{children}</div>
    </main>
  );
}
