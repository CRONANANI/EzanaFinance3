'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App error:', error);
    /* A production crash reaches the user as this screen and nothing else, so
       without a report the only evidence is a screenshot. Sentry gets the real
       error; the digest below puts the correlating id ON the screenshot. */
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#0f1419',
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Something went wrong
      </h2>
      <p style={{ color: '#9ca3af', marginBottom: '1.5rem', textAlign: 'center' }}>
        A temporary error occurred. Please try again.
      </p>
      {error?.digest ? (
        <p
          style={{
            color: '#6b7280',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          Reference: {error.digest}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
        <Link
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#374151',
            color: '#ffffff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
