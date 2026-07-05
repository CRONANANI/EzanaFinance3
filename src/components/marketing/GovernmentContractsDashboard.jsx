'use client';

import { useState } from 'react';
import { Building2, Search, Trophy } from 'lucide-react';
import { DatasetDashboard } from './DatasetDashboard';
import { Ticker, EntityName } from './DatasetTable';
import { ContractDetailPopup } from './ContractDetailPopup';
import { PolicyMomentumCard } from '@/components/congress/PolicyMomentumCard';

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
  // Explicit freshness/source line (hosted "synced …" / live / sample). When
  // omitted, falls back to the live-vs-sample default below.
  note,
  liveNote = 'Live federal contract data via USAspending.gov (U.S. Treasury), updated daily.',
  sampleNote = 'Sample of recent awards — full live dataset available in the app.',
  // Additive Congress.gov surface: sectors with legislative tailwinds behind
  // the contractors on this page. On by default; opt out per-page if needed.
  showLegislativeTailwinds = true,
}) {
  // One shared detail popup serves BOTH the top-recipients list and the awards
  // table. `activeDetail` is { kind: 'recipient' | 'award', data } | null. Only
  // real data (hosted/live) is interactive; the static sample stays static.
  const [activeDetail, setActiveDetail] = useState(null);

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
      // Opt-in: clicking a recipient opens the shared popup with their recent
      // awards. Off in sample mode so the fallback stays static.
      onItemClick: isLive ? (it) => setActiveDetail({ kind: 'recipient', data: it }) : undefined,
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
    sampleNote: note ?? (isLive ? liveNote : sampleNote),
    source,
    cta: { href: '/auth/login', label: 'Explore in the app' },
    onRowClick: isLive
      ? (row) =>
          setActiveDetail({
            kind: 'award',
            data: { awardId: row.awardId, recipient: row.recipient },
          })
      : undefined,
    getRowLabel: (row) => `View award details for ${row.recipient}`,
  };

  return (
    <>
      <DatasetDashboard config={config}>
        {showLegislativeTailwinds ? (
          <PolicyMomentumCard
            title="Legislative tailwinds"
            intro="Sectors seeing rising legislative activity in Congress — a read on where policy momentum may favor the contractors and industries on this page. Informational only, not investment advice."
          />
        ) : null}
      </DatasetDashboard>
      {activeDetail ? (
        <ContractDetailPopup
          detail={activeDetail}
          onClose={() => setActiveDetail(null)}
          onOpenAward={(awardData) => setActiveDetail({ kind: 'award', data: awardData })}
        />
      ) : null}
    </>
  );
}
