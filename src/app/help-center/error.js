'use client';

import { useEffect } from 'react';
import ErrorScreen from '@/components/errors/ErrorScreen';
import { useRetry } from '@/components/errors/useRetry';

/**
 * Help Center error boundary: a failure inside any help page renders the
 * branded error screen with a way forward instead of a bare 500.
 */
export default function HelpCenterError({ error, reset }) {
  const retry = useRetry(reset);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[help-center] render failed:', error?.digest || error?.message);
  }, [error]);

  return (
    <ErrorScreen
      variant="error"
      layout="inline"
      onRetry={retry}
      digest={error?.digest}
      title={
        <>
          This help page <em>hit a snag</em>.
        </>
      }
      message="Try again, or browse the Help Center while we look into it."
      homeHref="/help-center"
      homeLabel="Back to Help Center"
    />
  );
}
