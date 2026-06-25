'use client';

import { Building2, Search, Trophy } from 'lucide-react';
import { DatasetDashboard } from './DatasetDashboard';
import { Ticker, EntityName } from './DatasetTable';

/**
 * Client wrapper that builds the DatasetDashboard config for the federal
 * contract-award views (the Government Activity overview page and the
 * dedicated Government Contracts page). Both share this component so the
 * contract table / search / ticker-handling live in exactly one place.
 *
 * The DATA (rows / topRecipients / isLive) is fetched server-side from
 * USAspending.gov and passed in as plain props, so live data is in the
 * initial HTML (SEO/speed) while the search row stays interactive. v1 filters
 * client-side over the fetched set; wiring the search inputs to re-query the
 * route's `?recipient=` / `?agency=` params is the documented upgrade path.
 *
 * Ticker handling: USAspending provides no ticker, so each row carries either
 * a real mapped symbol or an em dash — we render the dash muted and never
 * fabricate a symbol.
 */
export function GovernmentContractsDashboard({
  title,
  lead,
  rows,
  topRecipients,
  isLive,
  highlightTitle,
  highlightDesc,
  tableCaption = 'Recent federal contract awards',
  tableLink,
  source,
  liveNote = 'Live federal contract data via USAspending.gov (U.S. Treasury), updated daily.',
  sampleNote = 'Sample of recent awards — full live dataset available in the app.',
}) {
  const config = {
    title,
    lead,
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
      badge: isLive ? 'Live' : 'Sample',
      icon: Trophy,
      title: highlightTitle,
      desc: highlightDesc,
      items: topRecipients,
    },
    table: {
      caption: tableCaption,
      columns: [
        { key: 'recipient', label: 'Recipient', render: (v) => <EntityName>{v}</EntityName> },
        { key: 'agency', label: 'Awarding agency' },
        {
          key: 'ticker',
          label: 'Ticker',
          render: (v) =>
            v && v !== '—' ? <Ticker symbol={v} /> : <span className="mkt-ds-muted">—</span>,
        },
        { key: 'amount', label: 'Amount', align: 'right', mono: true },
        { key: 'date', label: 'Award date', mono: true },
      ],
      rows,
    },
    tableLink,
    sampleNote: isLive ? liveNote : sampleNote,
    source,
    cta: { href: '/auth/login', label: 'Explore in the app' },
  };

  return <DatasetDashboard config={config} />;
}
