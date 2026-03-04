'use client';

import { useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { NotificationsSidebar } from '@/components/NotificationsSidebar';

export default function DashboardLayout({ children }) {
  const { notificationsOpen } = useSidebar();

  useEffect(() => {
    if (notificationsOpen) {
      document.body.classList.add('sidebar-open', 'dashboard-page');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
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
