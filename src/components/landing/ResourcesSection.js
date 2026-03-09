'use client';

import { useState } from 'react';
import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';

const DATA_SOURCES = [
  {
    id: 'congress',
    label: 'Congress',
    details: [
      'Capitol Trades API',
      'House & Senate PTRs',
      'STOCK Act filings',
    ],
  },
  {
    id: '13f',
    label: '13F',
    details: [
      'SEC EDGAR filings',
      'Institutional holdings',
      'Hedge fund positions',
    ],
  },
  {
    id: 'institutional',
    label: 'Institutional Portfolios',
    details: [
      'Legendary investor portfolios',
      'Ownership tracking',
      'Position changes',
    ],
  },
  {
    id: 'analytics',
    label: 'Alternative Analytics',
    details: [
      'FRED economic data',
      'News & sentiment',
      'Custom metrics',
    ],
  },
  {
    id: 'community',
    label: 'Community',
    details: [
      'Crowdsourced insights',
      'Expert recommendations',
      'Sentiment analysis',
    ],
  },
];

export function ResourcesSection() {
  const [selectedSource, setSelectedSource] = useState(null);

  const handleBadgeClick = (id) => {
    setSelectedSource(selectedSource === id ? null : id);
  };

  const sourceDetails = DATA_SOURCES.reduce((acc, source) => {
    acc[source.id] = source.details;
    return acc;
  }, {});

  return (
    <section className="resources-section" id="resources">
      <div className="resources-container">
        <div className="resources-header">
          <h2>Data Sources & Resources</h2>
          <p className="max-w-4xl mx-auto">
            Institutional-grade market intelligence powered by verified data feeds. Congressional trades, hedge fund 13F filings, legendary investor portfolios, and advanced analytics—all aggregated through our secure REST API for real-time investment insights.
          </p>
        </div>

        <div className="flex justify-center p-4 w-full max-w-[900px] mx-auto">
          <DatabaseWithRestApi
            badgeTexts={{
              first: 'Congress',
              second: '13F',
              third: 'Institutional',
              fourth: 'Alternative Analytics',
              fifth: 'Community',
            }}
            title="Institutional-grade data from verified sources"
            circleText="Ezana"
            lightColor="#10b981"
            onBadgeClick={handleBadgeClick}
            selectedSource={selectedSource}
            sourceDetails={sourceDetails}
          />
        </div>
      </div>
    </section>
  );
}
