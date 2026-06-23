'use client';

import Link from 'next/link';
import { ArrowRight, Star, Tv, Smartphone, TrendingUp } from 'lucide-react';

const DATASETS = [
  {
    icon: Star,
    title: 'Analyst Ratings',
    desc: 'Wall Street ratings and price-target changes aggregated across covering analysts.',
    source: 'Financial Modeling Prep, Finnhub.',
    metric: 'Updated daily',
  },
  {
    icon: Tv,
    title: 'On-Air Stock Mentions',
    desc: 'Stocks mentioned on financial TV (e.g. the Jim Cramer / CNBC tracker), with sentiment.',
    source: 'Quiver Quantitative.',
    metric: 'Per episode',
  },
  {
    icon: Smartphone,
    title: 'App & Product Signals',
    desc: 'Consumer-app ratings and adoption signals as alternative demand indicators.',
    // [CONFIRM source] — exact provider not verified in the codebase.
    source: 'Aggregated from licensed alternative-data providers. [CONFIRM source]',
    metric: 'Periodic',
  },
  {
    icon: TrendingUp,
    title: 'Search Interest',
    desc: 'Relative search-interest trends used as a proxy for consumer and investor attention.',
    // [CONFIRM source] — exact provider not verified in the codebase.
    source: 'Aggregated from licensed alternative-data providers. [CONFIRM source]',
    metric: 'Trend index',
  },
];

export default function AlternativeDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Consumer &amp; alternative signals</h1>
        <p className="mkt-lead">
          Signals beyond the tape — analyst coverage, on-air mentions, and consumer-interest proxies
          — to read attention before it shows up in price.
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
            Alternative signals are aggregated from Quiver Quantitative and licensed providers, then
            entity-resolved to tickers. Where a specific provider is still being finalized we mark
            it for confirmation rather than overstate the source.
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
