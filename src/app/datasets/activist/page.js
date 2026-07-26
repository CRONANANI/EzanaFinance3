'use client';

import { Crosshair, Search, TrendingUp } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName } from '@/components/marketing/DatasetTable';
import { ACTIVIST_SAMPLE, TOP_ACTIVIST_STAKES } from './activist-sample';

const config = {
  title: 'Activist & block positions (13D / 13G)',
  lead: 'When an investor crosses 5% of a company, the SEC requires disclosure within days. 13D signals intent to influence; 13G signals a passive stake. Both, parsed and tracked as they cross the threshold.',
  searches: [
    {
      id: 'filer',
      label: 'Filer search',
      placeholder: 'Search by investor…',
      icon: Crosshair,
      keys: ['filer'],
    },
    {
      id: 'subject',
      label: 'Target search',
      placeholder: 'Search by ticker or company…',
      icon: Search,
      keys: ['ticker', 'subject'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: TrendingUp,
    title: 'Latest 5%+ stakes disclosed',
    desc: 'The newest positions to cross the 5% reporting threshold, 13D (activist) and 13G (passive) alike.',
    items: TOP_ACTIVIST_STAKES,
  },
  table: {
    caption: 'Recent 13D / 13G filings (sample)',
    columns: [
      { key: 'filer', label: 'Investor', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'ticker', label: 'Target', render: (v) => <Ticker symbol={v} /> },
      { key: 'subject', label: 'Company' },
      { key: 'form', label: 'Form' },
      { key: 'percent', label: '% of class', align: 'right', mono: true },
      { key: 'date', label: 'Filed', mono: true },
    ],
    rows: ACTIVIST_SAMPLE,
  },
  sampleNote: 'Sample of recent 13D / 13G filings — full live dataset coming from SEC EDGAR.',
  source: {
    title: 'How we source it',
    body: [
      'Sourced from SEC EDGAR Schedules 13D and 13G — required when an investor acquires beneficial ownership of more than 5% of a voting class. 13D (activist intent) is due within 5 business days; 13G (passive) on a longer schedule.',
      'The filer, subject company, and reported percent-of-class are parsed from each schedule’s cover page. Where a percentage is not cleanly disclosed it is shown as unavailable rather than estimated.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function ActivistDatasetPage() {
  return <DatasetDashboard config={config} />;
}
