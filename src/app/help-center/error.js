'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import './help-center.css';

/**
 * Help Center error boundary: a failure inside any help page renders this
 * friendly fallback with a way forward instead of a bare 500.
 */
export default function HelpCenterError({ error, reset }) {
  useEffect(() => {
    console.error('[help-center] render failed:', error?.digest || error?.message);
  }, [error]);

  return (
    <div className="hc-page">
      <section className="hc-hero">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hc-title mb-3 text-2xl font-bold">This help page could not load</h1>
          <p className="hc-subtitle mb-6">
            Something went wrong on our side. Try again, or browse the Help Center while we look
            into it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" className="hc-btn-primary" onClick={() => reset()}>
              Try again
            </button>
            <Link href="/help-center" className="hc-btn-secondary">
              Back to Help Center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
