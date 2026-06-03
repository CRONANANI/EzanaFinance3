'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PoliticalDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Congressional trading data</h1>
        <p className="mkt-lead">
          Every stock transaction disclosed by members of Congress — normalized, enriched, and
          traced to its filing.
        </p>
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="mkt-section-title">What&apos;s in it</h2>
        <div className="mkt-card">
          <p>
            All 535 members of the House and Senate, with purchases and sales, tickers, and amount
            ranges reported under the STOCK Act.
          </p>
          <p>
            Each record includes <strong>transaction dates</strong> and{' '}
            <strong>filing / disclosure dates</strong> so you can measure disclosure lag, plus
            politician-level history, party, and chamber.
          </p>
        </div>
      </section>

      <div className="mkt-stats">
        <div className="mkt-stat">
          <span className="mkt-stat-value">535</span>
          <span className="mkt-stat-label">Members</span>
        </div>
        <div className="mkt-stat">
          <span className="mkt-stat-value">15,000+</span>
          <span className="mkt-stat-label">Trades tracked</span>
        </div>
        <div className="mkt-stat">
          <span className="mkt-stat-value">Real-time</span>
          <span className="mkt-stat-label">Updates</span>
        </div>
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="mkt-section-title">How we source it</h2>
        <div className="mkt-card">
          <p>
            Derived from official public disclosures — periodic transaction reports filed with the
            House Clerk and Senate financial disclosure offices under the STOCK Act — plus
            consolidated feeds from specialized data partners.
          </p>
          <p>
            Filings are parsed, normalized into a consistent schema, deduplicated, and linked to
            market tickers. Amounts appear as statutory ranges (not exact dollars), and filings can
            trail trades by weeks — both are inherent to congressional disclosure, not Ezana
            processing delays.
          </p>
          <p>
            <strong>Refresh cadence:</strong> updated as new filings are published.
          </p>
        </div>
      </section>

      <div className="mkt-cta-block">
        <Link href="/auth/login" className="mkt-cta-btn">
          Explore in the app
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </>
  );
}
