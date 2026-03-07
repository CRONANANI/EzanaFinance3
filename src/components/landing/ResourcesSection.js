'use client';

import { useState } from 'react';
import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';

const DATA_SOURCES = [
  {
    id: 'congress',
    label: 'Congress',
    details: [
      'Capitol Trades API – real-time congressional financial disclosures',
      'House & Senate periodic transaction reports (PTRs)',
      'Senate Stock Act compliance filings',
      'Congressional financial disclosure database',
    ],
  },
  {
    id: '13f',
    label: '13F',
    details: [
      'SEC EDGAR 13F filings – institutional holdings',
      'Quarterly holdings of $100M+ investment managers',
      'Hedge fund and asset manager positions',
      '13F-HR and 13F-HR/A amendment filings',
    ],
  },
  {
    id: 'institutional',
    label: 'Institutional Portfolios',
    details: [
      'Legendary investor portfolios (Buffett, Ackman, etc.)',
      '13F-derived institutional ownership tracking',
      'Portfolio overlap and concentration analysis',
      'Historical position changes and new stakes',
    ],
  },
  {
    id: 'analytics',
    label: 'Alternative Analytics',
    details: [
      'FRED – economic indicators and macro data',
      'Finnhub – news, fundamentals, and sentiment',
      'Custom analytics and derived metrics',
    ],
  },
];

const TRUSTED_LOGOES = [
  { name: 'Bloomberg', placeholder: true },
  { name: 'Washington Post', placeholder: true },
  { name: 'Reuters', placeholder: true },
  { name: 'Financial Times', placeholder: true },
];

export function ResourcesSection() {
  const [selectedSource, setSelectedSource] = useState(null);

  const handleBadgeClick = (id) => {
    setSelectedSource(selectedSource === id ? null : id);
  };

  return (
    <section className="resources-section" id="resources">
      <div className="resources-container">
        <div className="resources-header">
          <h2>Data Sources & Resources</h2>
          <p>
            Institutional-grade market intelligence powered by verified data feeds.
            Congressional trades, hedge fund 13F filings, legendary investor portfolios,
            and advanced analytics—all aggregated through our secure REST API.
          </p>
        </div>

        <div className="flex justify-center p-4 w-full max-w-[640px] mx-auto">
          <DatabaseWithRestApi
            badgeTexts={{
              first: 'Congress',
              second: '13F',
              third: 'Institutional',
              fourth: 'Alternative Analytics',
            }}
            title="Institutional-grade data from verified sources"
            circleText="Ezana"
            lightColor="#10b981"
            onBadgeClick={handleBadgeClick}
          />
        </div>

        {selectedSource && (
          <div className="data-source-details">
            <div className="data-source-details-content">
              <h4>{DATA_SOURCES.find((s) => s.id === selectedSource)?.label} – Data Sources</h4>
              <ul>
                {DATA_SOURCES.find((s) => s.id === selectedSource)?.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="data-trusted-section">
          <h3>Trusted by Industry Leaders</h3>
          <div className="trusted-logos">
            {TRUSTED_LOGOES.map((logo) => (
              <div key={logo.name} className="trusted-logo-item">
                <span className="trusted-logo-text">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
