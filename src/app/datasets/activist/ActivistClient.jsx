'use client';

import { useMemo } from 'react';
import { Crosshair, Search, TrendingUp } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName } from '@/components/marketing/DatasetTable';
import { OPENFIGI_NOTE, ALLOW_SAMPLE } from '@/lib/titans/format';
import { ACTIVIST_SAMPLE, TOP_ACTIVIST_STAKES } from './activist-sample';

const NO_ROWS = [];

const TargetCell = (v, row) =>
  v ? <Ticker symbol={v} /> : <span className="mkt-ds-mono">{row.subject || 'Unmapped'}</span>;

const FilingLink = (v, row) =>
  row.href ? (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      className="mkt-ds-mono"
      aria-label={`${v || 'Filing'} on SEC EDGAR (opens in a new tab)`}
    >
      {v || 'Filing'} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
    </a>
  ) : (
    <span className="mkt-ds-mono">{v}</span>
  );

export default function ActivistClient({ rows }) {
  const live = rows.length > 0;
  const sample = !live && ALLOW_SAMPLE;
  const tableRows = live ? rows : sample ? ACTIVIST_SAMPLE : NO_ROWS;

  const highlightItems = useMemo(
    () =>
      live
        ? rows
            .filter((r) => r.percent)
            .slice(0, 5)
            .map((r) => ({
              name: r.filer,
              meta: `${r.ticker || r.subject || 'Unmapped'} · ${r.form}`,
              value: r.percent,
              tone: 'pos',
            }))
        : sample
          ? TOP_ACTIVIST_STAKES
          : NO_ROWS,
    [live, rows, sample],
  );

  const tickerItems = useMemo(
    () =>
      tableRows.slice(0, 20).map((r) => ({
        id: r.id,
        lead: r.filer,
        main: r.ticker || r.subject,
        value: r.percent,
      })),
    [tableRows],
  );

  const config = {
    title: 'Activist & block positions (Schedule 13D / 13G)',
    lead: 'When an investor crosses 5% of a company, the SEC requires disclosure within days. Schedule 13D signals intent to influence; Schedule 13G signals a passive stake. Both, parsed and tracked as they cross the threshold.',
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
      desc: 'The newest positions to cross the 5% reporting threshold, Schedule 13D (activist) and Schedule 13G (passive) alike.',
      items: highlightItems,
      emptyText: 'Stakes appear here as Schedule 13D and 13G filings are parsed.',
    },
    table: {
      caption: live
        ? 'Recent Schedule 13D / 13G filings'
        : sample
          ? 'Recent Schedule 13D / 13G filings (sample)'
          : 'Recent Schedule 13D / 13G filings',
      columns: [
        { key: 'filer', label: 'Investor', render: (v) => <EntityName>{v}</EntityName> },
        { key: 'ticker', label: 'Target', render: TargetCell },
        { key: 'subject', label: 'Company' },
        { key: 'form', label: 'Form', render: FilingLink },
        { key: 'percent', label: '% of class', align: 'right', mono: true },
        { key: 'shares', label: 'Shares', align: 'right', mono: true },
        { key: 'date', label: 'Filed', mono: true },
      ],
      rows: tableRows,
      emptyText:
        'No Schedule 13D or 13G stakes parsed yet. They appear here as new filings are read from SEC EDGAR.',
    },
    sampleNote: sample ? 'Sample rows (local development only).' : null,
    source: {
      title: 'How we source it',
      body: [
        'Sourced from SEC EDGAR Schedules 13D and 13G, required when an investor acquires beneficial ownership of more than 5% of a voting class. Schedule 13D (activist intent) is due within 5 business days; Schedule 13G (passive) on a longer schedule.',
        'Filings since December 2024 carry a structured cover page; the filer, subject company, CUSIP and reported percent-of-class are read from it. For older filings they are parsed from the cover text. Where a percentage is not cleanly disclosed it is shown as unavailable rather than estimated.',
      ],
      note: OPENFIGI_NOTE,
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'titans',
    activeItem: 'Activist',
    ticker: { ariaLabel: 'Latest Schedule 13D / 13G filings', items: tickerItems },
  };

  return <DatasetDashboard config={config} />;
}
