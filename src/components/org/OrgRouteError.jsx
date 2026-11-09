'use client';

import { useEffect } from 'react';
import ErrorScreen from '@/components/errors/ErrorScreen';
import { useRetry } from '@/components/errors/useRetry';

/**
 * Shared error boundary body for org route segments: the branded error
 * screen inside the app shell. Pass the Next.js error-boundary props plus a
 * section name and a safe place to go back to.
 */
export function OrgRouteError({ error, reset, section, homeHref, homeLabel }) {
  const retry = useRetry(reset);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(`[OrgRouteError:${section}]`, error, { digest: error?.digest });
  }, [error, section]);

  return (
    <ErrorScreen
      variant="error"
      layout="inline"
      onRetry={retry}
      digest={error?.digest}
      title={
        <>
          We couldn&apos;t load <em>{section}</em>.
        </>
      }
      message="Try again, or go back and continue from there."
      homeHref={homeHref}
      homeLabel={homeLabel}
      details={error ? `${error.message || String(error)}\n\n${error.stack || ''}` : undefined}
    />
  );
}
