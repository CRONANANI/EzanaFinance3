'use client';

import { useState } from 'react';
import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';
import { TestimonialsSection } from '@/components/ui/testimonials-with-marquee';

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
  {
    id: 'community',
    label: 'Community',
    details: [
      'Crowdsourced investment insights and analysis',
      'Expert trader recommendations and watchlists',
      'Real-time discussion threads and alerts',
      'Sentiment analysis from community activity',
    ],
  },
];

const TRUSTED_TESTIMONIALS = [
  {
    author: {
      name: 'Sarah Chen',
      handle: 'Bloomberg',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    },
    text: 'Ezana gives us the institutional-grade data we need. Congressional trades and 13F filings in one place—game changer for our research team.',
  },
  {
    author: {
      name: 'Marcus Webb',
      handle: 'Reuters',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
    text: 'The real-time congressional trading alerts have transformed how we track policy-sensitive positions. Accuracy and speed are unmatched.',
  },
  {
    author: {
      name: 'Elena Vasquez',
      handle: 'Financial Times',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    },
    text: 'Finally, retail investors get access to the same data that drives billions in institutional decisions. Ezana levels the playing field.',
  },
  {
    author: {
      name: 'James Okonkwo',
      handle: 'Washington Post',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    },
    text: 'Tracking legendary investor portfolios and hedge fund 13F filings used to require expensive terminals. Ezana makes it accessible.',
  },
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

        <TestimonialsSection
          title="Trusted by Industry Leaders"
          description="Join thousands of investors who use Ezana to track congressional trades, institutional holdings, and market intelligence."
          testimonials={TRUSTED_TESTIMONIALS}
          className="!py-12 sm:!py-16 md:!py-20"
        />
      </div>
    </section>
  );
}
