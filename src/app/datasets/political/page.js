'use client';

import { Users, Search, Trophy } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, TxnBadge, PoliticianCell, ReturnValue } from '@/components/marketing/DatasetTable';
import { CONGRESS_TRADES_SAMPLE, POLITICIAN_LEADERBOARD } from './congress-trades-sample';

const config = {
  title: 'Congressional trading data',
  lead: 'Every stock transaction disclosed by members of Congress under the STOCK Act — normalized, enriched with party and chamber, and traced from the trade date to its filing.',
  searches: [
    {
      id: 'politician',
      label: 'Politician search',
      placeholder: 'Search by name…',
      icon: Users,
      keys: ['politician'],
    },
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
    icon: Trophy,
    title: 'Politician Stock Portfolio Leaderboard',
    desc: 'Ranks members by the trailing excess return of their disclosed holdings versus the market — surfacing who is outpacing the S&P, and by how much.',
    items: POLITICIAN_LEADERBOARD,
  },
  table: {
    caption: 'Recent trades — U.S. Congress',
    columns: [
      { key: 'ticker', label: 'Stock', render: (v) => <Ticker symbol={v} /> },
      { key: 'transaction', label: 'Transaction', render: (v) => <TxnBadge type={v} /> },
      { key: 'politician', label: 'Politician', render: (_v, row) => <PoliticianCell row={row} /> },
      { key: 'filed', label: 'Filed', mono: true },
      { key: 'traded', label: 'Traded', mono: true },
      { key: 'amount', label: 'Amount', mono: true },
      {
        key: 'excessReturn',
        label: 'Excess return',
        align: 'right',
        mono: true,
        render: (v) => <ReturnValue value={v} />,
      },
    ],
    rows: CONGRESS_TRADES_SAMPLE,
  },
  sampleNote: 'Sample of recent disclosures — full live dataset available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'Derived from official public disclosures — periodic transaction reports filed with the House Clerk and Senate financial disclosure offices under the STOCK Act — plus consolidated feeds from specialized data partners.',
      'Filings are parsed, normalized into a consistent schema, deduplicated, and linked to market tickers. Amounts appear as statutory ranges (not exact dollars), and filings can trail trades by weeks — both are inherent to congressional disclosure, not Ezana processing delays.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function PoliticalDatasetPage() {
  return <DatasetDashboard config={config} />;
}
