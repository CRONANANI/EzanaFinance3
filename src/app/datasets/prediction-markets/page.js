'use client';

import Link from 'next/link';
import { ArrowRight, Target, Vote, TrendingUp } from 'lucide-react';

const DATASETS = [
  {
    icon: Target,
    title: 'Event Odds',
    desc: 'Live implied probabilities for current events, resolved against on-chain market prices.',
    source: 'Polymarket (Gamma API).',
    metric: 'Live odds',
  },
  {
    icon: Vote,
    title: 'Election Markets',
    desc: 'Political and election outcome markets, with price history and volume.',
    source: 'Polymarket (Gamma / Data APIs).',
    metric: 'Live · historical',
  },
  {
    icon: TrendingUp,
    title: 'Order Book & Liquidity',
    desc: 'Market depth and trade activity that contextualize how firm an implied probability is.',
    source: 'Polymarket (CLOB API).',
    metric: 'Real-time',
  },
];

export default function PredictionMarketsDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Prediction markets data</h1>
        <p className="mkt-lead">
          What the crowd is pricing in — live event and election odds, with the liquidity and volume
          context to judge how meaningful each probability is.
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
            Sourced directly from Polymarket&rsquo;s Gamma, Data, and CLOB APIs, then mapped to the
            companies, sectors, and events they bear on.
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
