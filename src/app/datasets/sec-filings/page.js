'use client';

import { Building, Search, TrendingUp } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName, TxnBadge } from '@/components/marketing/DatasetTable';
import { INSIDER_TRADES_SAMPLE, TOP_INSIDER_BUYS } from './sec-filings-sample';

const config = {
  title: 'SEC filings data',
  lead: 'Insider transactions, institutional 13F holdings, executive compensation, and ETF holdings — parsed from EDGAR and normalized into one consistent schema.',
  searches: [
    {
      id: 'company',
      label: 'Company search',
      placeholder: 'Search by ticker…',
      icon: Building,
      keys: ['ticker'],
    },
    {
      id: 'insider',
      label: 'Insider search',
      placeholder: 'Search by name or role…',
      icon: Search,
      keys: ['insider', 'role'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: TrendingUp,
    title: 'Largest insider buys (30 days)',
    desc: 'Open-market purchases by officers and directors — the buys insiders make with their own money, ranked by dollar value.',
    items: TOP_INSIDER_BUYS,
  },
  table: {
    caption: 'Recent insider transactions (Form 4)',
    columns: [
      { key: 'insider', label: 'Insider', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'ticker', label: 'Company', render: (v) => <Ticker symbol={v} /> },
      { key: 'role', label: 'Role' },
      { key: 'transaction', label: 'Transaction', render: (v) => <TxnBadge type={v} /> },
      { key: 'shares', label: 'Shares', align: 'right', mono: true },
      { key: 'value', label: 'Value', align: 'right', mono: true },
      { key: 'date', label: 'Filed', mono: true },
    ],
    rows: INSIDER_TRADES_SAMPLE,
  },
  sampleNote: 'Sample of recent filings — full live dataset available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'Sourced directly from SEC EDGAR — Forms 3/4/5 for insider transactions, 13F filings for institutional holdings, and DEF 14A for executive compensation — supplemented by Financial Modeling Prep.',
      'Filings are parsed, normalized, and linked to tickers. Disclosure timing follows SEC deadlines, so a small lag between transaction and filing is inherent to the data, not Ezana processing.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function SecFilingsDatasetPage() {
  return <DatasetDashboard config={config} />;
}
