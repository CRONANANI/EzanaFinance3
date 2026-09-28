'use client';

/**
 * The last resort: what renders when the ROOT LAYOUT throws. Errors inside a
 * page are caught by error.js; only the layout and its providers reach here.
 *
 * It used to log nothing and report nothing, which made every occurrence
 * invisible in production. Someone could screenshot this screen and there was
 * no way to tie it to an event. It now logs, reports, and prints the digest so
 * a screenshot is traceable to the server-side stack.
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Global error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: '2rem',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1419',
          color: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
          A critical error occurred. Please refresh the page.
        </p>
        {error?.digest ? (
          /* The server-side digest. Without it a report of this screen carries
             nothing that can be looked up. */
          <p
            style={{
              fontSize: 12,
              color: '#6b7280',
              fontFamily: 'monospace',
              marginTop: '-1rem',
              marginBottom: '1.5rem',
            }}
          >
            Ref: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
