'use client';

/**
 * Root error boundary: a page outside any segment boundary threw while
 * rendering. Shows the branded error screen (the 404 design) full page.
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorScreen from '@/components/errors/ErrorScreen';
import { useRetry } from '@/components/errors/useRetry';

export default function Error({ error, reset }) {
  const retry = useRetry(reset);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error:', error);
    /* A production crash reaches the user as this screen and nothing else, so
       without a report the only evidence is a screenshot. Sentry gets the real
       error; the digest on the screen correlates a screenshot with it. */
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorScreen
      variant="error"
      onRetry={retry}
      digest={error?.digest}
      details={error ? `${error.message || String(error)}\n\n${error.stack || ''}` : undefined}
    />
  );
}
