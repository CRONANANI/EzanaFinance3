'use client';

/**
 * Dashboard segment boundary: a page inside the app shell threw. Shows the
 * branded error screen inline, so the navigation stays and the user can move
 * on. In development the message and stack print on the screen as well.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import ErrorScreen from '@/components/errors/ErrorScreen';
import { useRetry } from '@/components/errors/useRetry';

export default function DashboardError({ error, reset }) {
  const retry = useRetry(reset);
  const pathname = usePathname();
  const isPartnerRoute = pathname?.startsWith('/partner-');
  const dashboardHref = isPartnerRoute ? '/partner-home' : '/home-dashboard';

  useEffect(() => {
    /* Always log the real error and stack: an earlier boundary swallowed them,
       which kept a Rules-of-Hooks bug on the Learning Center invisible. */
    // eslint-disable-next-line no-console
    console.error('[DashboardError]', error, { digest: error?.digest, pathname });
    Sentry.captureException(error);
  }, [error, pathname]);

  return (
    <ErrorScreen
      variant="error"
      layout="inline"
      onRetry={retry}
      digest={error?.digest}
      homeHref={dashboardHref}
      homeLabel="Go to Dashboard"
      details={error ? `${error.message || String(error)}\n\n${error.stack || ''}` : undefined}
    />
  );
}
