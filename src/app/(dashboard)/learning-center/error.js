'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LearningCenterError({ error, reset }) {
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[LearningCenterError]', error, { digest: error?.digest });
  }, [error]);

  const devMessage = error?.message || String(error || 'Unknown error');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-xl">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          We couldn&apos;t load this course
        </h2>
        <p className="text-muted-foreground mb-4">
          {isDev
            ? 'A render-time error was caught below. Check the browser console for the full stack.'
            : 'Try refreshing, or pick another course from the Learning Center while we look into it.'}
        </p>

        {isDev && (
          <pre
            className="text-xs text-left bg-muted/40 border border-border rounded-lg p-3 mb-4 overflow-auto max-h-60"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {devMessage}
            {error?.stack ? `\n\n${error.stack}` : ''}
          </pre>
        )}

        {error?.digest && (
          <p className="text-xs text-muted-foreground mb-4">Error ID: {error.digest}</p>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/learning-center"
            className="px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
          >
            Back to Learning Center
          </Link>
        </div>
      </div>
    </div>
  );
}
