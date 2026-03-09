'use client';

import { useState } from 'react';
import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';
import { TestimonialsSection } from '@/components/ui/testimonials-with-marquee';

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

const TRUSTED_TESTIMONIALS = [
  {
    author: {
      name: 'Vivian Tu',
      handle: '@your.richbff',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/yourrichbff',
        instagram: 'https://instagram.com/your.richbff',
        tiktok: 'https://tiktok.com/@yourrichbff',
      },
    },
    text: 'Finally a platform that gives everyday investors the same congressional trading data that Wall Street has been using for years. This is the transparency we needed.',
  },
  {
    author: {
      name: 'Sarah Chen',
      handle: '@Bloomberg',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/bloomberg',
        instagram: 'https://instagram.com/bloomberg',
        tiktok: 'https://tiktok.com/@bloomberg',
      },
    },
    text: 'Ezana gives us the institutional-grade data we need. Congressional trades and 13F filings in one place—game changer for our research team.',
  },
  {
    author: {
      name: 'Graham Stephan',
      handle: '@grahamstephan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/grahamstephan',
        instagram: 'https://instagram.com/grahamstephan',
        tiktok: 'https://tiktok.com/@grahamstephan',
      },
    },
    text: 'I track every 13F filing for my portfolio analysis. Ezana aggregates hedge fund positions faster than any Bloomberg terminal I have used. Seriously impressive.',
  },
  {
    author: {
      name: 'Marcus Webb',
      handle: '@Reuters',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/reuters',
        instagram: 'https://instagram.com/reuters',
        tiktok: 'https://tiktok.com/@reuters',
      },
    },
    text: 'The real-time congressional trading alerts have transformed how we track policy-sensitive positions. Accuracy and speed are unmatched.',
  },
  {
    author: {
      name: 'Ben Felix',
      handle: '@BenFelixCSI',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/benjaminwfelix',
        instagram: 'https://instagram.com/benjaminwfelix',
        tiktok: 'https://tiktok.com/@benjaminwfelix',
      },
    },
    text: 'As someone focused on evidence-based investing, I appreciate that Ezana provides raw institutional data without speculation. Pure signal, no noise.',
  },
  {
    author: {
      name: 'Elena Vasquez',
      handle: '@FinancialTimes',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/financialtimes',
        instagram: 'https://instagram.com/financialtimes',
        tiktok: 'https://tiktok.com/@financialtimes',
      },
    },
    text: 'Finally, retail investors get access to the same data that drives billions in institutional decisions. Ezana levels the playing field.',
  },
  {
    author: {
      name: 'James Okonkwo',
      handle: '@WashingtonPost',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      socials: {
        twitter: 'https://twitter.com/washingtonpost',
        instagram: 'https://instagram.com/washingtonpost',
        tiktok: 'https://tiktok.com/@washingtonpost',
      },
    },
    text: 'Tracking legendary investor portfolios and hedge fund 13F filings used to require expensive terminals. Ezana makes it accessible.',
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
