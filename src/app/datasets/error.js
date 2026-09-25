'use client';

/**
 * Route-level boundary for the dataset pages.
 *
 * Without it, a throw anywhere under /datasets climbs to the root boundary in
 * src/app/error.js, which replaces the entire app shell with a full-screen dark
 * error panel — the whole site looks down because one dataset page failed. This
 * one keeps the failure inside the page area and offers a retry that re-renders
 * just this segment.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import './ds-error.css';

export default function DatasetsError({ error, reset }) {
  useEffect(() => {
    console.error('Dataset page error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="dserr" role="alert">
      <h2 className="dserr-title">This dataset could not be loaded</h2>
      <p className="dserr-body">
        Something went wrong rendering this page. The rest of Ezana is unaffected.
      </p>
      {error?.digest ? <p className="dserr-ref">Reference: {error.digest}</p> : null}
      <div className="dserr-actions">
        <button type="button" className="dserr-btn dserr-btn--solid" onClick={() => reset()}>
          Reload this dataset
        </button>
        <Link href="/datasets" className="dserr-btn dserr-btn--ghost">
          All datasets
        </Link>
      </div>
    </div>
  );
}
