'use client';

/**
 * The last resort: what renders when the ROOT LAYOUT throws. Errors inside a
 * page are caught by error.js; only the layout and its providers reach here.
 * It replaces the root layout, so it brings its own <html>, <body> and the
 * stylesheets the branded screen needs. It logs, reports to Sentry, and shows
 * the digest so a screenshot is traceable to the server-side stack.
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './fonts.css';
import './globals.css';
import ErrorScreen from '@/components/errors/ErrorScreen';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="light-mode">
      <body className="light-mode" style={{ margin: 0 }}>
        <ErrorScreen variant="error" onRetry={reset} digest={error?.digest} />
      </body>
    </html>
  );
}
