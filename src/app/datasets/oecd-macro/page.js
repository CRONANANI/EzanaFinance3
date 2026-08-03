'use client';

import { Globe, LineChart, Gauge } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName, ReturnValue } from '@/components/marketing/DatasetTable';
import { OECD_HIGHLIGHTS, OECD_INDICATORS } from './oecd-macro-sample';

const config = {
  title: 'OECD macro data',
  lead: 'Standardized macro indicators across OECD member economies — composite leading indicators, growth, inflation, labor, and policy rates — on one comparable basis, so a position in one market can be read against the conditions in another.',
  searches: [
    { id: 'country', label: 'Country search', placeholder: 'Search by country…', icon: Globe, keys: ['country', 'iso'] },
    { id: 'indicator', label: 'Indicator search', placeholder: 'Search by indicator…', icon: LineChart, keys: ['indicator'] },
  ],
  highlight: {
    badge: 'New',
    icon: Gauge,
    title: 'Leading-indicator snapshot',
    desc: 'Composite Leading Indicators point to turning points in economic activity ahead of the headline series — the earliest read the OECD publishes on where a member economy is heading.',
    items: OECD_HIGHLIGHTS,
  },
  table: {
    caption: 'OECD indicators by member economy',
    columns: [
      { key: 'country', label: 'Country', render: (v) => <EntityName>{v}</EntityName> },
      { key: 'iso', label: 'ISO', render: (v) => <Ticker symbol={v} /> },
      { key: 'indicator', label: 'Indicator' },
      { key: 'value', label: 'Value', align: 'right', mono: true },
      {
        key: 'change',
        label: 'Change',
        align: 'right',
        mono: true,
        render: (v) => <ReturnValue value={v} />,
      },
      { key: 'period', label: 'Period' },
    ],
    rows: OECD_INDICATORS,
  },
  sampleNote: 'Placeholder rows — the OECD series are being loaded. Structure shown is final.',
  source: {
    title: 'How we source it',
    body: [
      'Indicators come from the OECD’s SDMX data API — the organisation’s official statistical distribution channel, published under a CC BY 4.0 licence with attribution. OECD harmonises national statistics onto a common methodology, which is what makes a figure for Canada directly comparable to one for Japan; national statistical offices do not guarantee that on their own.',
      'Series are keyed by country and reference period, so a macro reading can be joined to the market, contract, and prediction-market signals that share the same window. Attribution: Source — OECD.',
    ],
  },
  cta: { href: '/auth/login', label: 'Explore in the app' },
  activeCategory: 'lighthouse',
  activeItem: 'OECD Macro Data',
};

export default function OecdMacroDatasetPage() {
  return <DatasetDashboard config={config} />;
}
