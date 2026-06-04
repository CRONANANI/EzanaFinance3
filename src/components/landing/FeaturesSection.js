'use client';

import { useState } from 'react';
import { FeatureCardBack } from './features-card-backs';
import { HOW_STEPS, METRICS_BAND } from './features-landing-data';

const FEATURE_CARDS = [
  {
    key: 'congress',
    title: 'Congressional Trading',
    desc: 'Real-time trades from all 535 members of Congress — with filing dates, disclosure lag, and politician-level history.',
  },
  {
    key: 'portfolio',
    title: 'Portfolio Analytics',
    desc: 'Institutional-grade performance, risk scoring, and allocation analysis across every account you connect.',
  },
  {
    key: 'intelligence',
    title: 'Market Intelligence',
    desc: 'Geopolitical analysis, sector rotation, and market-moving signals — surfaced before they reach the mainstream.',
  },
  {
    key: 'alerts',
    title: 'Real-time Alerts',
    desc: 'Instant notifications the moment a trade, filing, or event touches a position you hold.',
  },
  {
    key: 'community',
    title: 'Community Insights',
    desc: 'High-conviction research from a ranked community of serious investors — signal, not noise.',
  },
  {
    key: 'alt',
    title: 'Alternative Analytics',
    desc: 'Alternative-data signals — satellite, app, and card-spend trends — mapped to the tickers they move.',
  },
];

export function FeaturesSection() {
  const [flippedId, setFlippedId] = useState(null);

  const toggleFlip = (key) => {
    setFlippedId((prev) => (prev === key ? null : key));
  };

  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-grid-header">
          <p className="eyebrow lf-mono">Why Ezana Finance</p>
          <h2>Built for investors who demand more</h2>
          <p className="section-subtitle">
            Professional-grade tools that put institutional intelligence — and the transparency to
            trust it — in your hands.
          </p>
        </div>

        <div className="features-grid">
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.key}
              className={`feature-card flip-card${flippedId === card.key ? ' is-flipped' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`${card.title}. Hover or press to see preview.`}
              onClick={() => toggleFlip(card.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFlip(card.key);
                }
              }}
            >
              <div className="flip-inner">
                <div className="flip-front">
                  <h3 className="feature-card-title">{card.title}</h3>
                  <p className="feature-card-description">{card.desc}</p>
                  <span className="flip-hint lf-mono">Hover to preview →</span>
                </div>
                <div className="flip-back">
                  <FeatureCardBack cardKey={card.key} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="how-it-works">
          <p className="section-eyebrow lf-mono">Getting started</p>
          <h2 className="how-title">From accounts to action in four steps</h2>
          <div className="how-steps">
            {HOW_STEPS.map((s, i) => (
              <div key={s.title} className="how-step">
                <div className="how-step-num lf-mono">{i + 1}</div>
                <div className="how-step-icon">
                  <i className={`bi ${s.icon}`} aria-hidden />
                </div>
                <h3 className="how-step-title">{s.title}</h3>
                <p className="how-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="metrics-band">
          {METRICS_BAND.map((m) => (
            <div key={m.l} className="metric-band-item">
              <div className="metric-band-value lf-mono">{m.v}</div>
              <div className="metric-band-label lf-mono">{m.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
