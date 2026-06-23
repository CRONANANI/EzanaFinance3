'use client';

import { Building2, Search, Trophy } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName } from '@/components/marketing/DatasetTable';
import { CONTRACT_AWARDS_SAMPLE, TOP_RECIPIENTS } from './government-sample';

const config = {
  title: 'Government activity data',
  lead: 'The data institutions act on — federal contract awards, lobbying spend, and patent filings — entity-resolved to public companies and connected to tickers.',
  searches: [
    {
      id: 'recipient',
      label: 'Recipient search',
      placeholder: 'Search by company…',
      icon: Building2,
      keys: ['recipient', 'ticker'],
    },
    {
      id: 'agency',
      label: 'Agency search',
      placeholder: 'Search by agency…',
      icon: Search,
      keys: ['agency'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: Trophy,
    title: 'Top contract recipients this quarter',
    desc: 'Public companies ranked by total disclosed federal award value — a read on which firms are winning government dollars right now.',
    items: TOP_RECIPIENTS,
  },
  table: {
    caption: 'Recent federal contract awards',
    columns: [
      { key: 'recipient', label: 'Recipient', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'agency', label: 'Awarding agency' },
      { key: 'ticker', label: 'Ticker', render: (v) => <Ticker symbol={v} /> },
      { key: 'amount', label: 'Amount', align: 'right', mono: true },
      { key: 'date', label: 'Award date', mono: true },
    ],
    rows: CONTRACT_AWARDS_SAMPLE,
  },
  sampleNote: 'Sample of recent awards — full live dataset available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'Aggregated from public federal procurement and contract-award datasets, public lobbying disclosure filings (LD-1 / LD-2), and patent office publication and grant data.',
      'Records are normalized, entity-resolved to companies, and connected to tickers so contract, lobbying, and patent signals surface in Ezana before they reach mainstream coverage.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function GovernmentDatasetPage() {
  return <DatasetDashboard config={config} />;
}
