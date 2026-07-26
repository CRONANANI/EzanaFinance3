'use client';

import { Building2, Search, TrendingUp } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName } from '@/components/marketing/DatasetTable';
import { INSTITUTIONAL_SAMPLE, TOP_INSTITUTIONAL_MOVES } from './institutional-sample';

const config = {
  title: 'Institutional holdings (13F)',
  lead: 'Quarterly institutional holdings from SEC Form 13F-HR — what the largest managers own, added, and exited, normalized into one consistent schema across every filer.',
  searches: [
    {
      id: 'fund',
      label: 'Fund search',
      placeholder: 'Search by manager…',
      icon: Building2,
      keys: ['fund'],
    },
    {
      id: 'holding',
      label: 'Holding search',
      placeholder: 'Search by ticker or issuer…',
      icon: Search,
      keys: ['ticker', 'issuer'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: TrendingUp,
    title: 'Largest new positions this quarter',
    desc: 'The biggest fresh institutional buys by reported dollar value, drawn from the latest 13F cycle.',
    items: TOP_INSTITUTIONAL_MOVES,
  },
  table: {
    caption: 'Recent 13F holdings (sample)',
    columns: [
      { key: 'fund', label: 'Manager', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'ticker', label: 'Holding', render: (v) => <Ticker symbol={v} /> },
      { key: 'issuer', label: 'Issuer' },
      { key: 'value', label: 'Value', align: 'right', mono: true },
      { key: 'shares', label: 'Shares', align: 'right', mono: true },
      { key: 'quarter', label: 'Quarter', mono: true },
    ],
    rows: INSTITUTIONAL_SAMPLE,
  },
  sampleNote: 'Sample of recent 13F holdings — full live dataset coming from SEC EDGAR.',
  source: {
    title: 'How we source it',
    body: [
      'Sourced from SEC EDGAR Form 13F-HR — the quarterly holdings reports institutional managers with over $100M in qualifying assets must file within 45 days of quarter end.',
      'Holdings are parsed from each filing’s information table, normalized to whole-dollar values, and matched to tickers by CUSIP where resolvable. The 45-day deadline means holdings reflect quarter-end positions, not real-time ones — a lag inherent to the disclosure, not Ezana processing.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
  activeCategory: 'titans',
  activeItem: 'Institutional',
  ticker: {
    ariaLabel: 'Latest 13F holdings',
    // Fed from the page's sample rows (live EDGAR is a separate build). No
    // onSelect yet — decorative until the live detail view exists.
    items: INSTITUTIONAL_SAMPLE.slice(0, 20).map((r) => ({
      id: r.id,
      lead: r.fund,
      main: r.issuer || r.ticker,
      value: r.value,
    })),
  },
};

export default function InstitutionalDatasetPage() {
  return <DatasetDashboard config={config} />;
}
