/**
 * Invented sample content for dataset pages whose data source is not
 * connected yet. Shown ONLY to master admin and demo accounts (see
 * /api/datasets/sample-viewer), always under a "Sample content" label.
 *
 * Every name, ticker and figure here is made up. Tickers are fictional
 * (ACME, NOVA, ZENX and so on) and no row refers to a real person, company,
 * case or filing. Do not replace them with real names: if a real record is
 * wanted, connect the real source instead.
 */

const T = {
  ticker: { key: 'ticker', label: 'Ticker', mono: true, strong: true },
  date: { key: 'date', label: 'Date', mono: true },
};

export const PREVIEW_SAMPLES = {
  alternative: {
    name: 'Consumer and alternative signals',
    dimension: 'Consumer Whispers',
    dimensionId: 'whispers',
    sourceLine:
      'Planned sources: public search-interest indexes, aggregate web-traffic panels, app-store rankings and government retail-sales releases.',
    sections: [
      {
        id: 'signals',
        title: 'Latest consumer signals',
        columns: [
          { key: 'signal', label: 'Signal', strong: true },
          { key: 'kind', label: 'Type' },
          T.ticker,
          { key: 'change', label: 'Change', align: 'right' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            signal: 'Search interest, smart kettles',
            kind: 'Search',
            ticker: 'ACME',
            change: '+18.40%',
            date: '2026-11-12',
          },
          {
            id: 2,
            signal: 'Site visits, Nova Outfitters',
            kind: 'Web traffic',
            ticker: 'NOVA',
            change: '-6.20%',
            date: '2026-11-12',
          },
          {
            id: 3,
            signal: 'App downloads, Zenx Pay',
            kind: 'App installs',
            ticker: 'ZENX',
            change: '+31.05%',
            date: '2026-11-11',
          },
          {
            id: 4,
            signal: 'Card spend, home goods',
            kind: 'Spending',
            ticker: 'N/A',
            change: '+2.10%',
            date: '2026-11-10',
          },
          {
            id: 5,
            signal: 'Search interest, Orbit Air fares',
            kind: 'Search',
            ticker: 'ORBT',
            change: '+9.75%',
            date: '2026-11-10',
          },
          {
            id: 6,
            signal: 'Site visits, Kestrel Grocers',
            kind: 'Web traffic',
            ticker: 'KSTR',
            change: '-1.40%',
            date: '2026-11-09',
          },
        ],
      },
    ],
  },

  global: {
    name: 'Global events and macro',
    dimension: 'Global Empire Lighthouse',
    dimensionId: 'lighthouse',
    sourceLine:
      'Planned sources: open global event records from news coverage and official macro releases.',
    sections: [
      {
        id: 'events',
        title: 'Latest global events',
        columns: [
          { key: 'event', label: 'Event', strong: true },
          { key: 'country', label: 'Country' },
          { key: 'category', label: 'Category' },
          { key: 'tone', label: 'Tone', align: 'right' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            event: 'Port workers strike announced',
            country: 'Freedonia',
            category: 'Labour',
            tone: '-4.20',
            date: '2026-11-13',
          },
          {
            id: 2,
            event: 'Central bank holds rates',
            country: 'Sylvania',
            category: 'Monetary',
            tone: '+0.80',
            date: '2026-11-13',
          },
          {
            id: 3,
            event: 'Trade pact signed',
            country: 'Lowlandia',
            category: 'Trade',
            tone: '+3.10',
            date: '2026-11-12',
          },
          {
            id: 4,
            event: 'Election results certified',
            country: 'Ostoria',
            category: 'Politics',
            tone: '+0.40',
            date: '2026-11-11',
          },
          {
            id: 5,
            event: 'Export ban on grain extended',
            country: 'Freedonia',
            category: 'Trade',
            tone: '-2.65',
            date: '2026-11-10',
          },
        ],
      },
    ],
  },

  legislation: {
    name: 'New laws and policy legislation',
    dimension: 'Regulatory Winds',
    dimensionId: 'regulatory',
    sourceLine: 'Planned source: congressional bill records and federal legislative publications.',
    sections: [
      {
        id: 'bills',
        title: 'Recently moved bills',
        columns: [
          { key: 'bill', label: 'Bill', mono: true, strong: true },
          { key: 'title', label: 'Title' },
          { key: 'stage', label: 'Latest action' },
          { key: 'sectors', label: 'Sectors touched' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            bill: 'H.R. 9001',
            title: 'Grid Storage Modernization Act',
            stage: 'Passed House',
            sectors: 'Utilities, Industrials',
            date: '2026-11-13',
          },
          {
            id: 2,
            bill: 'S. 4410',
            title: 'Rural Broadband Access Act',
            stage: 'Reported by committee',
            sectors: 'Communication services',
            date: '2026-11-12',
          },
          {
            id: 3,
            bill: 'H.R. 8822',
            title: 'Drug Pricing Transparency Act',
            stage: 'Introduced',
            sectors: 'Health care',
            date: '2026-11-11',
          },
          {
            id: 4,
            bill: 'S. 4377',
            title: 'Stablecoin Reserve Standards Act',
            stage: 'Hearing held',
            sectors: 'Financials',
            date: '2026-11-08',
          },
          {
            id: 5,
            bill: 'H.R. 8790',
            title: 'Freight Rail Safety Act',
            stage: 'Signed into law',
            sectors: 'Industrials',
            date: '2026-11-05',
          },
        ],
      },
    ],
  },

  lawsuits: {
    name: 'Lawsuits and legal proceedings',
    dimension: 'Regulatory Winds',
    dimensionId: 'regulatory',
    sourceLine: 'Planned source: public federal court dockets.',
    sections: [
      {
        id: 'cases',
        title: 'New filings against listed companies',
        columns: [
          { key: 'caseName', label: 'Case', strong: true },
          T.ticker,
          { key: 'type', label: 'Type' },
          { key: 'court', label: 'Court' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            caseName: 'Rivera v. Acme Robotics',
            ticker: 'ACME',
            type: 'Securities class action',
            court: 'S.D.N.Y.',
            date: '2026-11-12',
          },
          {
            id: 2,
            caseName: 'Harlow Labs v. Nova Biotech',
            ticker: 'NOVA',
            type: 'Patent infringement',
            court: 'D. Del.',
            date: '2026-11-11',
          },
          {
            id: 3,
            caseName: 'State of Westland v. Zenx Pay',
            ticker: 'ZENX',
            type: 'Consumer protection',
            court: 'N.D. Cal.',
            date: '2026-11-10',
          },
          {
            id: 4,
            caseName: 'In re Orbit Air data breach',
            ticker: 'ORBT',
            type: 'Privacy',
            court: 'N.D. Ill.',
            date: '2026-11-07',
          },
          {
            id: 5,
            caseName: 'Kestrel Grocers settlement',
            ticker: 'KSTR',
            type: 'Settlement',
            court: 'E.D. Tex.',
            date: '2026-11-04',
          },
        ],
      },
    ],
  },

  enforcement: {
    name: 'Regulatory investigations and enforcement',
    dimension: 'Regulatory Winds',
    dimensionId: 'regulatory',
    sourceLine: 'Planned sources: published enforcement actions from federal regulators.',
    sections: [
      {
        id: 'actions',
        title: 'Latest enforcement actions',
        columns: [
          { key: 'subject', label: 'Subject', strong: true },
          T.ticker,
          { key: 'agency', label: 'Agency' },
          { key: 'action', label: 'Action' },
          { key: 'amount', label: 'Penalty', align: 'right' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            subject: 'Acme Robotics',
            ticker: 'ACME',
            agency: 'Securities regulator',
            action: 'Settled charges',
            amount: '$12,500,000.00',
            date: '2026-11-12',
          },
          {
            id: 2,
            subject: 'Nova Biotech',
            ticker: 'NOVA',
            agency: 'Competition regulator',
            action: 'Investigation opened',
            amount: 'N/A',
            date: '2026-11-10',
          },
          {
            id: 3,
            subject: 'Zenx Pay',
            ticker: 'ZENX',
            agency: 'Consumer finance regulator',
            action: 'Consent order',
            amount: '$3,200,000.00',
            date: '2026-11-06',
          },
          {
            id: 4,
            subject: 'Orbit Air',
            ticker: 'ORBT',
            agency: 'Transport regulator',
            action: 'Civil penalty',
            amount: '$850,000.00',
            date: '2026-11-03',
          },
        ],
      },
    ],
  },

  'agency-rulings': {
    name: 'Government agency rulings and decisions',
    dimension: 'Regulatory Winds',
    dimensionId: 'regulatory',
    sourceLine: 'Planned source: the federal daily register of agency rules and notices.',
    sections: [
      {
        id: 'rulings',
        title: 'Latest rulings and decisions',
        columns: [
          { key: 'decision', label: 'Decision', strong: true },
          { key: 'agency', label: 'Agency' },
          T.ticker,
          { key: 'type', label: 'Type' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            decision: 'Approval of a new migraine therapy',
            agency: 'Drug regulator',
            ticker: 'NOVA',
            type: 'Approval',
            date: '2026-11-13',
          },
          {
            id: 2,
            decision: 'Final rule on vehicle emissions testing',
            agency: 'Environmental regulator',
            ticker: 'N/A',
            type: 'Final rule',
            date: '2026-11-12',
          },
          {
            id: 3,
            decision: 'Merger review extended',
            agency: 'Competition regulator',
            ticker: 'ACME',
            type: 'Notice',
            date: '2026-11-10',
          },
          {
            id: 4,
            decision: 'Complete response letter for a device',
            agency: 'Drug regulator',
            ticker: 'HLX',
            type: 'Denial',
            date: '2026-11-07',
          },
        ],
      },
    ],
  },

  'community-signals': {
    name: 'Platform community signals',
    dimension: 'The Hive',
    dimensionId: 'hive',
    sourceLine:
      'Planned source: aggregate, anonymous activity on Ezana (watchlist adds and posts).',
    sections: [
      {
        id: 'momentum',
        title: 'Most added to watchlists this week',
        columns: [
          T.ticker,
          { key: 'company', label: 'Company' },
          { key: 'adds', label: 'Watchlist adds', align: 'right' },
          { key: 'posts', label: 'Posts', align: 'right' },
          { key: 'change', label: 'Change vs last week', align: 'right' },
        ],
        rows: [
          {
            id: 1,
            ticker: 'ACME',
            company: 'Acme Robotics',
            adds: '1,284',
            posts: '212',
            change: '+42.10%',
          },
          {
            id: 2,
            ticker: 'NOVA',
            company: 'Nova Biotech',
            adds: '968',
            posts: '187',
            change: '+15.80%',
          },
          {
            id: 3,
            ticker: 'ZENX',
            company: 'Zenx Pay',
            adds: '744',
            posts: '96',
            change: '-8.35%',
          },
          {
            id: 4,
            ticker: 'ORBT',
            company: 'Orbit Air',
            adds: '512',
            posts: '74',
            change: '+3.20%',
          },
          {
            id: 5,
            ticker: 'KSTR',
            company: 'Kestrel Grocers',
            adds: '401',
            posts: '38',
            change: '-1.05%',
          },
        ],
      },
    ],
  },

  'retail-sentiment': {
    name: 'Retail sentiment',
    dimension: 'The Hive',
    dimensionId: 'hive',
    sourceLine: 'Planned sources: public investor discussion forums and social posts, aggregated.',
    sections: [
      {
        id: 'sentiment',
        title: 'Most discussed tickers',
        columns: [
          T.ticker,
          { key: 'mentions', label: 'Mentions', align: 'right' },
          { key: 'bullish', label: 'Bullish share', align: 'right' },
          { key: 'change', label: 'Mentions vs last week', align: 'right' },
          T.date,
        ],
        rows: [
          {
            id: 1,
            ticker: 'ZENX',
            mentions: '8,412',
            bullish: '64.00%',
            change: '+120.50%',
            date: '2026-11-13',
          },
          {
            id: 2,
            ticker: 'ACME',
            mentions: '6,035',
            bullish: '58.20%',
            change: '+12.40%',
            date: '2026-11-13',
          },
          {
            id: 3,
            ticker: 'NOVA',
            mentions: '3,977',
            bullish: '41.75%',
            change: '-18.60%',
            date: '2026-11-13',
          },
          {
            id: 4,
            ticker: 'ORBT',
            mentions: '2,210',
            bullish: '50.10%',
            change: '+4.05%',
            date: '2026-11-13',
          },
        ],
      },
    ],
  },
};
