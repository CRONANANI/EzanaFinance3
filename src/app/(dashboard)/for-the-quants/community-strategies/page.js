'use client';

import Link from 'next/link';
import { LEADERBOARD } from '@/lib/for-the-quants-mock-data';
import { QuantSection } from '@/components/quants/shell/QuantLabShell';
import { QuantDataTable } from '@/components/quants/shell/QuantDataTable';

const numeric = (text) => Number.parseFloat(String(text).replace(/[^0-9.-]/g, ''));

const COLUMNS = [
  { key: 'rank', label: 'Rank', numeric: true, sortable: true },
  {
    key: 'name',
    label: 'Strategy',
    sortable: true,
    render: (row) => (
      <Link className="qlx-link" href={`/for-the-quants/strategy/${row.id}`}>
        {row.name}
      </Link>
    ),
  },
  { key: 'author', label: 'Author', sortable: true },
  {
    key: 'returnPct',
    label: 'Return',
    numeric: true,
    sortable: true,
    value: (row) => numeric(row.returnPct),
  },
  {
    key: 'subscribers',
    label: 'Subscribers',
    numeric: true,
    sortable: true,
    render: (row) => row.subscribers.toLocaleString(),
  },
];

/**
 * The community strategy leaderboard. These rows are illustrative: no
 * community strategy has a stored, verified track record yet, so the whole
 * table carries a Sample data tag.
 */
export default function CommunityStrategiesPage() {
  return (
    <QuantSection
      title="Strategy leaderboard"
      actions={<span className="qlx-tag">Sample data</span>}
    >
      <QuantDataTable
        caption="Community strategies, sample data"
        columns={COLUMNS}
        rows={LEADERBOARD}
        initialSort={{ key: 'rank', dir: 'asc' }}
      />
    </QuantSection>
  );
}
