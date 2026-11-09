'use client';
/**
 * Route-level boundary for the dataset pages.
 *
 * Without it, a throw anywhere under /datasets climbs to the root boundary in
 * src/app/error.js, which takes over the whole viewport: the whole site looks
 * down because one dataset page failed. This one keeps the failure inside the
 * page area (the branded error screen, inline) and offers a retry that
 * re-renders just this segment.
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorScreen from '@/components/errors/ErrorScreen';
import { useRetry } from '@/components/errors/useRetry';

export default function DatasetsError({ error, reset }) {
  const retry = useRetry(reset);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Dataset page error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorScreen
      variant="error"
      layout="inline"
      onRetry={retry}
      digest={error?.digest}
      title={
        <>
          This dataset <em>hit a snag</em>.
        </>
      }
      message="It couldn’t be loaded just now. The rest of Ezana is unaffected."
      homeHref="/datasets"
      homeLabel="All datasets"
    />
  );
}
