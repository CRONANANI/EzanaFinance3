'use client';

import Link from 'next/link';
import { ArrowRight, LineChart, BarChart3, Star, Activity } from 'lucide-react';

const DATASETS = [
  {
    icon: LineChart,
    title: 'Prices & Quotes',
    desc: 'Real-time and historical equity prices, intraday candles, and end-of-day series.',
    source: 'Finnhub, Alpha Vantage, Alpaca market data.',
    metric: 'Real-time',
  },
  {
    icon: BarChart3,
    title: 'Fundamentals',
    desc: 'Income statement, balance sheet, and cash-flow metrics with ratios for screening.',
    source: 'Financial Modeling Prep, Finnhub.',
    metric: 'Quarterly · annual',
  },
  {
    icon: Star,
    title: 'Analyst Ratings',
    desc: 'Buy/hold/sell ratings, price targets, and revisions aggregated across covering analysts.',
    source: 'Financial Modeling Prep, Finnhub.',
    metric: 'Updated daily',
  },
  {
    icon: Activity,
    title: 'Technical Signals',
    desc: 'Moving averages, momentum, and volatility indicators computed from price history.',
    source: 'Derived from Finnhub / Alpha Vantage price data.',
    metric: 'Computed daily',
  },
];

export default function MarketsDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Markets &amp; equities data</h1>
        <p className="mkt-lead">
          The market core — prices, fundamentals, analyst coverage, and technicals — aggregated from
          institutional-grade providers and normalized across tickers.
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
            Aggregated from Finnhub, Financial Modeling Prep, Alpha Vantage, and Alpaca, reconciled
            into a single normalized view so prices, fundamentals, and ratings line up by ticker.
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
