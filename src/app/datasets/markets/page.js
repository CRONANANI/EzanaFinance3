'use client';

import { Search, Activity } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, SentimentBadge, ReturnValue } from '@/components/marketing/DatasetTable';
import { MARKETS_SNAPSHOT_SAMPLE, TOP_MOVERS } from './markets-sample';

const config = {
  title: 'Markets & equities data',
  lead: 'The market core — prices, fundamentals, analyst ratings, and technical signals — aggregated from institutional-grade providers and normalized across tickers.',
  searches: [
    {
      id: 'ticker',
      label: 'Stock search',
      placeholder: 'Search by ticker…',
      icon: Search,
      keys: ['ticker'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: Activity,
    title: 'Top movers today',
    desc: 'The largest intraday moves across the snapshot universe — a quick read on where the market is rotating.',
    items: TOP_MOVERS,
  },
  table: {
    caption: 'Quote & fundamentals snapshot',
    columns: [
      { key: 'ticker', label: 'Ticker', render: (v) => <Ticker symbol={v} /> },
      { key: 'price', label: 'Price', align: 'right', mono: true },
      {
        key: 'change',
        label: 'Change',
        align: 'right',
        mono: true,
        render: (v) => <ReturnValue value={v} />,
      },
      { key: 'mktCap', label: 'Mkt cap', align: 'right', mono: true },
      { key: 'pe', label: 'P/E', align: 'right', mono: true },
      { key: 'rating', label: 'Analyst rating', render: (v) => <SentimentBadge value={v} /> },
    ],
    rows: MARKETS_SNAPSHOT_SAMPLE,
  },
  sampleNote: 'Sample snapshot — real-time quotes and fundamentals available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'Aggregated from Finnhub, Financial Modeling Prep, Alpha Vantage, and Alpaca market data, reconciled into a single normalized view so prices, fundamentals, and ratings line up by ticker.',
      'Technical signals are computed from the same price history, and analyst ratings are consolidated across covering analysts.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function MarketsDatasetPage() {
  return <DatasetDashboard config={config} />;
}
