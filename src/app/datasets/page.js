'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Landmark,
  Building2,
  FileText,
  LineChart,
  Radar,
  Target,
  Globe,
} from 'lucide-react';

const DIMENSIONS = [
  {
    icon: Landmark,
    title: 'Congressional & Political',
    href: '/datasets/political',
    desc: 'Congress trading, politician search, election fundraising, and congressional net worth.',
    source: 'Quiver Quantitative, public congressional (STOCK Act) disclosure, FEC.',
  },
  {
    icon: Building2,
    title: 'Government Activity',
    href: '/datasets/government',
    desc: 'Federal contract awards, corporate lobbying spend, and patent activity.',
    source: 'USASpending.gov, public lobbying disclosure (LD-1 / LD-2), patent office data.',
  },
  {
    icon: FileText,
    title: 'SEC Filings',
    href: '/datasets/sec-filings',
    desc: 'Insider trades, institutional 13F holdings, executive comp, and ETF holdings.',
    source: 'SEC EDGAR, Financial Modeling Prep.',
  },
  {
    icon: LineChart,
    title: 'Markets & Equities',
    href: '/datasets/markets',
    desc: 'Real-time prices, fundamentals, analyst ratings, and technical signals.',
    source: 'Finnhub, Financial Modeling Prep, Alpha Vantage, Alpaca.',
  },
  {
    icon: Radar,
    title: 'Consumer & Alternative Signals',
    href: '/datasets/alternative',
    desc: 'Analyst ratings, on-air stock mentions, and consumer-interest signals.',
    source: 'Quiver Quantitative and licensed market-data providers.',
  },
  {
    icon: Target,
    title: 'Prediction Markets',
    href: '/datasets/prediction-markets',
    desc: 'Live event and election odds from on-chain prediction markets.',
    source: 'Polymarket (Gamma, Data, and CLOB APIs).',
  },
  {
    icon: Globe,
    title: 'Global & Macro / Wealth',
    href: '/datasets/global',
    desc: 'Macro indicators, global markets, and billionaire / wealth tracking.',
    source: 'World Bank, Forbes billionaires data.',
  },
];

export default function DatasetsIndexPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Every signal, sourced and attributed</h1>
        <p className="mkt-lead">
          Ezana organizes its data across seven dimensions. For each one we show you what the
          dataset is — and exactly where we source it from. No black boxes.
        </p>
      </div>

      <div className="mkt-grid-3">
        {DIMENSIONS.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              className="mkt-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="mkt-card-header">
                <Icon size={20} aria-hidden />
                {d.title}
              </div>
              <p>{d.desc}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong>How we source it:</strong> {d.source}
              </p>
              <p
                className="mkt-mono-metric"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Explore
                <ArrowRight size={14} aria-hidden />
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
