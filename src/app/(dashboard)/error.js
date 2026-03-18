'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardError({ error, reset }) {
  const pathname = usePathname();
  const isPartnerRoute = pathname?.startsWith('/partner-');
  const dashboardHref = isPartnerRoute ? '/partner-home' : '/home-dashboard';

  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">
              A temporary error occurred. This can happen when switching pages quickly. Please try again.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
              <Link
                href={dashboardHref}
                className="px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
