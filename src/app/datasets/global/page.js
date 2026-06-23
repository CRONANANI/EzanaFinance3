'use client';

import { Search, Landmark } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName, ReturnValue } from '@/components/marketing/DatasetTable';
import { WEALTH_SAMPLE, MACRO_SNAPSHOT } from './global-sample';

const config = {
  title: 'Global, macro & wealth data',
  lead: 'The wider lens — macro indicators, global markets, and billionaire wealth tracking — connecting company-level signals to the forces moving whole economies.',
  searches: [
    {
      id: 'name',
      label: 'Person search',
      placeholder: 'Search by name…',
      icon: Search,
      keys: ['name', 'ticker'],
    },
    {
      id: 'country',
      label: 'Country search',
      placeholder: 'Search by country…',
      icon: Landmark,
      keys: ['country'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: Landmark,
    title: 'Macro snapshot',
    desc: 'Headline economic indicators that frame the backdrop for every position — growth, inflation, and labor across major economies.',
    items: MACRO_SNAPSHOT,
  },
  table: {
    caption: 'Billionaire & wealth tracking',
    columns: [
      { key: 'name', label: 'Name', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'netWorth', label: 'Net worth', align: 'right', mono: true },
      { key: 'ticker', label: 'Primary source', render: (v) => <Ticker symbol={v} /> },
      { key: 'country', label: 'Country' },
      {
        key: 'ytd',
        label: 'YTD',
        align: 'right',
        mono: true,
        render: (v) => <ReturnValue value={v} />,
      },
    ],
    rows: WEALTH_SAMPLE,
  },
  sampleNote: 'Sample of tracked wealth — full live dataset available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'Macro series come from the World Bank, wealth data from Forbes billionaires data, and global market data from our licensed providers (Finnhub, Financial Modeling Prep, Alpha Vantage).',
      'Each record is joined to the tickers and sectors it touches, so macro and wealth context sits alongside company-level signals.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function GlobalDatasetPage() {
  return <DatasetDashboard config={config} />;
}
