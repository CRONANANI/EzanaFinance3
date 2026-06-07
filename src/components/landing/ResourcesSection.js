'use client';

import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';

const DATA_SOURCES = [
  {
    id: 'capitol',
    label: 'Capitol Watch',
    tagline: "Follow your politicians' investment activity",
    sources: [
      {
        name: 'US House Financial Disclosures',
        description: 'Official House member insider trades and holdings',
      },
      {
        name: 'US Senate Financial Disclosures',
        description: 'Official Senate member insider trades and holdings',
      },
      {
        name: 'Campaign Finance Records',
        description: 'Federal Election Commission contribution and spending data',
      },
      {
        name: 'Lobbying Activity Data',
        description: 'Lobbying Disclosure Act filings tracking influence efforts',
      },
    ],
  },
  {
    id: 'titans',
    label: 'Titans Shadow',
    tagline: 'Keep up with the giants of finance',
    sources: [
      {
        name: '13F Filings',
        description: 'SEC quarterly institutional investor holdings and changes',
      },
      {
        name: '13D / 13G Filings',
        description: 'SEC filings for significant investor positions and stakes',
      },
      {
        name: 'Fund Holdings Data',
        description: 'Institutional fund composition and manager positioning',
      },
      {
        name: 'SEC EDGAR',
        description: 'Fund prospectuses, disclosures, and institutional reports',
      },
    ],
  },
  {
    id: 'eyes',
    label: 'Eyes Above',
    tagline: 'Watch the economy from above',
    sources: [
      {
        name: 'Satellite Imagery',
        description: 'High-resolution geospatial monitoring of physical assets',
      },
      {
        name: 'Parking Lot Occupancy Data',
        description: 'Real-time foot traffic and commercial activity tracking',
      },
      {
        name: 'Commercial Real Estate Activity',
        description: 'Property-level economic signals and utilization',
      },
      {
        name: 'Supply Chain Monitoring',
        description: 'Warehouse and logistics activity verification',
      },
    ],
  },
  {
    id: 'whispers',
    label: 'Consumer Whispers',
    tagline: 'Catch signals from shifts in consumer behaviour',
    sources: [
      {
        name: 'Search Interest Data',
        description: 'Google Trends demand signals and keyword volume tracking',
      },
      {
        name: 'Web Traffic Analytics',
        description: 'Similarweb audience trends and traffic patterns',
      },
      {
        name: 'App Download Velocity',
        description: 'Application growth and adoption rate tracking',
      },
      {
        name: 'Consumer Spending Trends',
        description: 'Transaction data and consumer behavior patterns',
      },
    ],
  },
  {
    id: 'hive',
    label: 'The Hive',
    tagline: 'Tap into the collective wisdom',
    sources: [
      { name: 'Prediction Market Odds', description: 'Real-money market consensus and forecasts' },
      {
        name: 'Platform Community Signals',
        description: 'Ezana user watchlists, discussions, and posts',
      },
      {
        name: 'Retail Sentiment Data',
        description: 'Reddit, StockTwits, and social media investor activity',
      },
      {
        name: 'Crowdsourced Intelligence',
        description: 'Aggregate positioning and conviction levels',
      },
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
          <p className="max-w-5xl mx-auto px-6">
            Every signal, traced to its source. Hover a category to see which providers and datasets
            power it — from SEC EDGAR filings and Polymarket prediction odds to the World Bank,
            GDELT, and our own platform signals.
          </p>
        </div>

        <div className="flex justify-center p-4 w-full max-w-[1100px] mx-auto">
          <DatabaseWithRestApi
            className="landing-data-sources"
            badgeTexts={{
              first: 'Capitol Watch',
              second: 'Titans Shadow',
              third: 'Eyes Above',
              fourth: 'Consumer Whispers',
              fifth: 'The Hive',
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
