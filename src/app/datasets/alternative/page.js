'use client';

import { Search, Radar } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, SentimentBadge } from '@/components/marketing/DatasetTable';
import { ALT_SIGNALS_SAMPLE, TOP_MENTIONS } from './alternative-sample';

const config = {
  title: 'Consumer & alternative signals',
  lead: 'Signals beyond the tape — analyst coverage, on-air stock mentions, and consumer-interest proxies — entity-resolved to tickers so attention shows up before it moves price.',
  searches: [
    {
      id: 'ticker',
      label: 'Stock search',
      placeholder: 'Search by ticker…',
      icon: Search,
      keys: ['ticker'],
    },
    {
      id: 'signal',
      label: 'Signal search',
      placeholder: 'Search by signal or source…',
      icon: Radar,
      keys: ['signal', 'source'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: Radar,
    title: 'Most-mentioned tickers on air',
    desc: 'The names financial TV is talking about most this week, with the net sentiment of those mentions.',
    items: TOP_MENTIONS,
  },
  table: {
    caption: 'Recent alternative signals',
    columns: [
      { key: 'source', label: 'Source' },
      { key: 'signal', label: 'Signal' },
      { key: 'ticker', label: 'Ticker', render: (v) => <Ticker symbol={v} /> },
      { key: 'sentiment', label: 'Sentiment', render: (v) => <SentimentBadge value={v} /> },
      { key: 'score', label: 'Score', align: 'right', mono: true },
      { key: 'date', label: 'Date', mono: true },
    ],
    rows: ALT_SIGNALS_SAMPLE,
  },
  sampleNote: 'Sample of recent signals — full live dataset available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'On-air mentions come from Quiver Quantitative and analyst signals from Financial Modeling Prep / Finnhub, entity-resolved to tickers.',
      'Where a specific provider for app or search-interest signals is still being finalized, we mark it “[CONFIRM source]” rather than overstate the source — sample rows show that convention explicitly.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function AlternativeDatasetPage() {
  return <DatasetDashboard config={config} />;
}
