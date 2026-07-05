'use client';

import { Search, Target } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { EntityName } from '@/components/marketing/DatasetTable';
import { PREDICTION_MARKETS_SAMPLE, TOP_MARKETS } from './prediction-markets-sample';
import { LegislationMarketsSection } from '@/components/congress/LegislationMarketsSection';

const config = {
  title: 'Prediction markets data',
  lead: 'What the crowd is pricing in — live event and election odds with the liquidity and volume context to judge how meaningful each implied probability is.',
  searches: [
    {
      id: 'event',
      label: 'Market search',
      placeholder: 'Search by event…',
      icon: Search,
      keys: ['event', 'outcome'],
    },
  ],
  highlight: {
    badge: 'New',
    icon: Target,
    title: 'Highest-volume markets',
    desc: 'The open markets with the deepest liquidity right now — where implied probabilities carry the most weight.',
    items: TOP_MARKETS,
  },
  table: {
    caption: 'Active prediction markets',
    columns: [
      { key: 'event', label: 'Event', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'outcome', label: 'Outcome' },
      { key: 'probability', label: 'Probability', align: 'right', mono: true },
      { key: 'volume', label: 'Volume', align: 'right', mono: true },
      { key: 'close', label: 'Closes', mono: true },
    ],
    rows: PREDICTION_MARKETS_SAMPLE,
  },
  sampleNote: 'Sample of active markets — live odds and order-book depth available in the app.',
  source: {
    title: 'How we source it',
    body: [
      'Sourced directly from Polymarket’s Gamma, Data, and CLOB APIs — implied probabilities, price history, volume, and market depth.',
      'Markets are mapped to the companies, sectors, and events they bear on, so prediction-market odds sit alongside the rest of your signals.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
};

export default function PredictionMarketsDatasetPage() {
  return (
    <DatasetDashboard config={config}>
      <LegislationMarketsSection />
    </DatasetDashboard>
  );
}
