'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { NotificationsSidebar } from '@/components/NotificationsSidebar';

export default function DashboardLayout({ children }) {
  const { notificationsOpen } = useSidebar();

  useEffect(() => {
    document.body.classList.add('dashboard-page');
    if (notificationsOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.body.classList.remove('sidebar-open', 'dashboard-page');
    };
  }, [notificationsOpen]);

  return (
    <>
      <NotificationsSidebar />
      <main className="dashboard-main">
        <div className="dashboard-container">{children}</div>
      </main>
    </>
  );
}
