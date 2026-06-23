'use client';

import Link from 'next/link';
import { ArrowRight, Globe, Landmark, Crown } from 'lucide-react';

const DATASETS = [
  {
    icon: Landmark,
    title: 'Macro Indicators',
    desc: 'Country-level economic indicators — growth, inflation, trade, and development metrics.',
    source: 'World Bank open data.',
    metric: 'Annual series',
  },
  {
    icon: Globe,
    title: 'Global Markets',
    desc: 'Cross-border equity and index coverage to place US names in a global context.',
    source: 'Finnhub, Financial Modeling Prep, Alpha Vantage.',
    metric: 'Daily',
  },
  {
    icon: Crown,
    title: 'Billionaire & Wealth Tracking',
    desc: 'Tracked net worth and holdings of the world’s wealthiest, linked to public companies.',
    source: 'Forbes billionaires data.',
    metric: 'Refreshed periodically',
  },
];

export default function GlobalDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Global, macro &amp; wealth data</h1>
        <p className="mkt-lead">
          The wider lens — macro indicators, global markets, and wealth tracking — to connect
          company-level signals to the forces moving whole economies.
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
            Macro series come from the World Bank, wealth data from Forbes, and global market data
            from our licensed providers — joined to the tickers and sectors they touch.
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
