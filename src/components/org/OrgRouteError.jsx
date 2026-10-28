'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import './org-route-error.css';

/**
 * Shared error card for org route segments. Pass the Next.js error-boundary
 * props plus a section name and a safe place to go back to.
 */
export function OrgRouteError({ error, reset, section, homeHref, homeLabel }) {
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(`[OrgRouteError:${section}]`, error, { digest: error?.digest });
  }, [error, section]);

  return (
    <div className="ore-wrap" role="alert">
      <div className="ore-card">
        <i className="bi bi-exclamation-triangle ore-icon" aria-hidden="true" />
        <h2 className="ore-title">We couldn&apos;t load {section}</h2>
        <p className="ore-body">
          Something went wrong loading this page. Try again, or go back and continue from there.
        </p>
        {isDev && error ? (
          <pre className="ore-dev">
            {error.message || String(error)}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        ) : null}
        {error?.digest ? <p className="ore-digest">Error ID: {error.digest}</p> : null}
        <div className="ore-actions">
          <button type="button" className="org-btn org-btn--primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href={homeHref} className="org-btn org-btn--secondary">
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
