'use client';

import { useMemo } from 'react';
import { Search, Target } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { EntityName } from '@/components/marketing/DatasetTable';
import { ALLOW_SAMPLE } from '@/lib/titans/format';
import { PREDICTION_MARKETS_SAMPLE, TOP_MARKETS } from './prediction-markets-sample';

const NO_ROWS = [];

const EventCell = (v, row) =>
  row.href ? (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${v} on ${row.venue || 'the venue'} (opens in a new tab)`}
    >
      <EntityName>{v}</EntityName>
    </a>
  ) : (
    <EntityName>{v}</EntityName>
  );

export default function PredictionMarketsClient({ rows, updated, children }) {
  const live = rows.length > 0;
  const sample = !live && ALLOW_SAMPLE;
  const tableRows = live ? rows : sample ? PREDICTION_MARKETS_SAMPLE : NO_ROWS;

  const highlightItems = useMemo(
    () =>
      live
        ? rows
            .filter((r) => r.venue === 'Polymarket' && r.volume)
            .slice(0, 5)
            .map((r) => ({
              name: r.event,
              meta: r.close ? `Polymarket · closes ${r.close}` : 'Polymarket',
              value: r.volume,
            }))
        : sample
          ? TOP_MARKETS
          : NO_ROWS,
    [live, rows, sample],
  );

  const config = {
    title: 'Prediction markets data',
    lead: 'What the crowd is pricing in: open event and election odds from Polymarket and Kalshi, with the volume behind each price so you can judge how much weight it carries.',
    searches: [
      {
        id: 'event',
        label: 'Market search',
        placeholder: 'Search by event…',
        icon: Search,
        keys: ['event', 'venue'],
      },
    ],
    highlight: {
      badge: 'New',
      icon: Target,
      title: 'Highest-volume markets on Polymarket',
      desc: 'The open Polymarket markets with the most money traded, where the implied probability carries the most weight.',
      items: highlightItems,
      emptyText: 'Markets appear here as open markets are indexed.',
    },
    table: {
      caption: sample ? 'Open prediction markets (sample)' : 'Open prediction markets',
      columns: [
        { key: 'event', label: 'Event', render: EventCell },
        { key: 'venue', label: 'Venue' },
        { key: 'probability', label: 'Probability', align: 'right', mono: true },
        { key: 'volume', label: 'Volume', align: 'right', mono: true },
        { key: 'close', label: 'Closes', mono: true },
      ],
      rows: tableRows,
      emptyText:
        'No open markets indexed yet. Polymarket and Kalshi markets appear here as they are indexed, every two hours.',
    },
    sampleNote: sample
      ? 'Sample rows (local development only).'
      : updated
        ? `Odds as of ${updated}.`
        : null,
    source: {
      title: 'How we source it',
      body: [
        'Sourced from Polymarket’s public Gamma API and Kalshi’s public market data API, refreshed every two hours. Each probability is the latest traded price, or the midpoint of the best bid and ask when a market has not traded.',
        'Polymarket volume is dollars traded. Kalshi reports contracts traded, each paying $1 if the market resolves yes, so the two are shown side by side rather than added together.',
      ],
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'hive',
    activeItem: 'Prediction Markets',
  };

  return <DatasetDashboard config={config}>{children}</DatasetDashboard>;
}
