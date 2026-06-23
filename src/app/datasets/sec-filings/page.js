'use client';

import Link from 'next/link';
import { ArrowRight, Users, Building, FileText, PieChart, Scissors } from 'lucide-react';

const DATASETS = [
  {
    icon: Users,
    title: 'Insider Trading',
    desc: 'Officer and director buys and sells (Forms 3, 4, 5), tied to the issuer and the insider role.',
    source: 'SEC EDGAR insider transaction filings.',
    metric: 'Daily filings',
  },
  {
    icon: Building,
    title: 'Institutional Holdings (13F)',
    desc: 'Quarterly portfolios of large institutional managers — positions, changes, and concentration.',
    source: 'SEC EDGAR Form 13F filings.',
    metric: 'Quarterly · 13F',
  },
  {
    icon: FileText,
    title: 'Executive Compensation',
    desc: 'Named-executive pay from proxy statements, normalized for cross-company comparison.',
    source: 'SEC EDGAR (DEF 14A proxies), Financial Modeling Prep.',
    metric: 'Annual · proxy',
  },
  {
    icon: PieChart,
    title: 'ETF Holdings',
    desc: 'Constituent holdings and weights for ETFs, mapped to underlying tickers and sectors.',
    source: 'Financial Modeling Prep, fund disclosure.',
    metric: 'Refreshed daily',
  },
  {
    icon: Scissors,
    title: 'Corporate Actions',
    desc: 'Stock splits, dividends, and other corporate events with effective dates.',
    source: 'Financial Modeling Prep, SEC EDGAR.',
    metric: 'As filed',
  },
];

export default function SecFilingsDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">SEC filings &amp; disclosure data</h1>
        <p className="mkt-lead">
          What companies and insiders are required to disclose — insider trades, institutional
          holdings, executive pay, and fund composition — connected to tickers.
        </p>
      </div>

      <div className="mkt-grid-3">
        {DATASETS.map((ds) => {
          const Icon = ds.icon;
          return (
            <article key={ds.title} className="mkt-card">
              <div className="mkt-card-header">
                <Icon size={20} aria-hidden />
                {ds.title}
              </div>
              <p>{ds.desc}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong>How we source it:</strong> {ds.source}
              </p>
              <p className="mkt-mono-metric">{ds.metric}</p>
            </article>
          );
        })}
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="mkt-section-title">How we source it</h2>
        <div className="mkt-card">
          <p>
            Pulled directly from SEC EDGAR and licensed filing providers, parsed, entity-resolved to
            companies, and connected to tickers so disclosures surface in Ezana as they land.
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
