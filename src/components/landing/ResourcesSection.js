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
        description:
          'High-resolution geospatial monitoring including parking lot occupancy, foot traffic, and infrastructure utilization',
      },
      {
        name: 'Commercial Real Estate Activity',
        description: 'Property-level economic signals and utilization',
      },
      {
        name: 'Supply Chain Monitoring',
        description: 'Warehouse and logistics activity verification across global networks',
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
  {
    id: 'lighthouse',
    label: 'Global Empire Lighthouse',
    tagline: 'Track shifts in global power and trade',
    sources: [
      {
        name: 'World Bank Economic Indicators',
        description: 'Global GDP, growth rates, and economic health metrics',
      },
      {
        name: 'Geopolitical Risk Indices',
        description: 'Geopolitical tension tracking and political stability data',
      },
      {
        name: 'Sanctions & Trade Policy Tracking',
        description: 'Government policy changes and international trade restrictions',
      },
      {
        name: 'GDELT Global Events Database',
        description: 'Global news events and geopolitical developments in real-time',
      },
    ],
  },
  {
    id: 'regulatory',
    label: 'Regulatory Winds',
    tagline: 'Anticipate regulatory and legal catalysts before they hit',
    sources: [
      {
        name: 'Lawsuits & Legal Proceedings',
        description: 'Class action suits, litigation tracking, and legal settlements',
      },
      {
        name: 'New Laws & Policy Legislation',
        description: 'Congressional bills, new legislation, and policy changes',
      },
      {
        name: 'Regulatory Investigations & Enforcement',
        description:
          'SEC enforcement actions, FTC investigations, and regulatory agency enforcement',
      },
      {
        name: 'Government Agency Rulings & Decisions',
        description: 'FDA approvals/denials, EPA rulings, and major agency decisions',
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
            Seven streams of intelligence. Watch your politicians trade. Follow the giants of
            finance. See the economy from above. Catch shifts in consumer behaviour. Tap into
            collective wisdom. Track global power shifts. Anticipate regulatory catalysts. Hover any
            category to see the data sources that power it.
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
              sixth: 'Global Empire Lighthouse',
              seventh: 'Regulatory Winds',
            }}
            title="Seven intelligence streams, one unified dashboard"
            circleText="Ezana"
            lightColor="#10b981"
            sourceDetails={sourceDetails}
          />
        </div>
      </div>
    </section>
  );
}
