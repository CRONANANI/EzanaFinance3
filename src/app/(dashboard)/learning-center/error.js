'use client';

import { useEffect } from 'react';
import ErrorScreen from '@/components/errors/ErrorScreen';
import { useRetry } from '@/components/errors/useRetry';

/** Learning Center boundary: the branded error screen inside the app shell. */
export default function LearningCenterError({ error, reset }) {
  const retry = useRetry(reset);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[LearningCenterError]', error, { digest: error?.digest });
  }, [error]);

  return (
    <ErrorScreen
      variant="error"
      layout="inline"
      onRetry={retry}
      digest={error?.digest}
      title={
        <>
          This lesson <em>hit a snag</em>.
        </>
      }
      message="Try again, or head back to the Learning Center and pick up another course."
      homeHref="/learning-center"
      homeLabel="Back to Learning Center"
      details={error ? `${error.message || String(error)}\n\n${error.stack || ''}` : undefined}
    />
  );
}
