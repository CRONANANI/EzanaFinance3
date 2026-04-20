'use client';

import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';

const DATA_SOURCES = [
  {
    id: 'congress',
    label: 'Congress',
    tagline: 'Political trading and legislative signals',
    sources: [
      { name: 'Quiver Quantitative', description: 'Congressional trading disclosures' },
      { name: 'House Financial Disclosures', description: 'Official US House filings' },
      { name: 'Senate Financial Disclosures', description: 'Official US Senate filings' },
      { name: 'OpenSecrets', description: 'Campaign finance and lobbying context' },
    ],
  },
  {
    id: '13f',
    label: '13F Filings',
    tagline: 'Institutional positions disclosed quarterly',
    sources: [
      { name: 'SEC EDGAR', description: '13F, 13D, and 13G filings direct from the source' },
      { name: 'WhaleWisdom', description: 'Institutional holder consolidation and change detection' },
      { name: 'Financial Modeling Prep', description: 'Normalized institutional holdings feed' },
    ],
  },
  {
    id: 'institutional',
    label: 'Institutional Portfolios',
    tagline: 'Fund composition and manager behavior',
    sources: [
      { name: 'Financial Modeling Prep', description: 'Fund holdings and manager profiles' },
      { name: 'Morningstar API', description: 'Fund composition and performance' },
      { name: 'SEC EDGAR', description: 'Fund disclosures and prospectuses' },
    ],
  },
  {
    id: 'analytics',
    label: 'Alternative Analytics',
    tagline: 'Markets, macro, and prediction data',
    sources: [
      { name: 'Polymarket', description: 'Prediction market odds and live bets' },
      { name: 'GDELT Project', description: 'Geolocated global news and event data' },
      { name: 'World Bank Open Data API', description: 'Macroeconomic indicators' },
      { name: 'IMF Data API', description: 'Fiscal and financial stability data' },
      { name: 'Financial Modeling Prep', description: 'Sector performance, earnings, dividends, IPOs, economic calendar' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    tagline: 'Retail sentiment and platform activity',
    sources: [
      { name: 'Ezana Platform', description: 'User-generated watchlists, discussions, and posts' },
      { name: 'Reddit API', description: 'Relevant investing subreddit signals' },
      { name: 'StockTwits', description: 'Retail sentiment streams' },
    ],
  },
];

export function ResourcesSection() {
  const sourceDetails = DATA_SOURCES.reduce((acc, source) => {
    acc[source.id] = { tagline: source.tagline, sources: source.sources };
    return acc;
  }, {});

  return (
    <section className="resources-section" id="resources">
      <div className="resources-container">
        <div className="resources-header">
          <h2>Data Sources &amp; Resources</h2>
          <p className="max-w-4xl mx-auto">
            Every signal, traced to its source. Hover a category to see which providers and
            datasets power it — from SEC EDGAR filings and Polymarket prediction odds to the
            World Bank, GDELT, and our own platform signals.
          </p>
        </div>

        <div className="flex justify-center p-4 w-full max-w-[1100px] mx-auto">
          <DatabaseWithRestApi
            badgeTexts={{
              first: 'Congress',
              second: '13F Filings',
              third: 'Institutional Portfolios',
              fourth: 'Alternative Analytics',
              fifth: 'Community',
            }}
            title="Institutional-grade data from verified sources"
            circleText="Ezana"
            lightColor="#10b981"
            sourceDetails={sourceDetails}
          />
        </div>
      </div>
    </section>
  );
}
