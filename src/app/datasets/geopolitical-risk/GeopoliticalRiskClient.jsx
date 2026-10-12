'use client';

import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { EntityName } from '@/components/marketing/DatasetTable';

const SearchIcon = () => <i className="bi bi-search" aria-hidden="true" />;
const RiskIcon = () => <i className="bi bi-exclamation-diamond" aria-hidden="true" />;

export default function GeopoliticalRiskClient({ rows, global }) {
  const top = rows.slice(0, 5).map((r) => ({
    name: r.country,
    meta: r.month ? `Country index, ${r.month}` : 'Country index',
    value: r.index,
  }));

  const config = {
    title: 'Geopolitical risk index',
    lead: global
      ? `How much the world's newspapers are writing about wars, threats and terrorism, country by country. The global index stood at ${global.value} in ${global.month}.`
      : "How much the world's newspapers are writing about wars, threats and terrorism, globally and for 44 countries.",
    searches: [
      {
        id: 'country',
        label: 'Country search',
        placeholder: 'Search by country…',
        icon: SearchIcon,
        keys: ['country', 'id'],
      },
    ],
    highlight: {
      badge: 'This month',
      icon: RiskIcon,
      title: 'Highest geopolitical risk',
      desc: 'Countries with the highest index in the latest month.',
      items: top,
      emptyText: 'Appears once the monthly country indexes are loaded.',
    },
    table: {
      caption: 'Country indexes, latest month',
      columns: [
        { key: 'country', label: 'Country', render: (v) => <EntityName>{v}</EntityName> },
        { key: 'index', label: 'Index', align: 'right', mono: true },
        { key: 'prior', label: 'Month before', align: 'right', mono: true },
        { key: 'change', label: 'Change', align: 'right', mono: true },
        { key: 'month', label: 'Month', mono: true },
      ],
      rows,
      emptyText: 'No index data loaded yet. It refreshes every Tuesday.',
    },
    sampleNote: null,
    source: {
      title: 'How we source it',
      body: [
        'The Geopolitical Risk (GPR) index by Dario Caldara and Matteo Iacoviello, measured from the share of newspaper articles about adverse geopolitical events and threats (CC BY). Caldara and Iacoviello (2022), "Measuring Geopolitical Risk," American Economic Review.',
        'Country indexes count the share of articles that mention both geopolitical tensions and that country. They are comparable over time for one country, not as a ranking of how dangerous countries are.',
      ],
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'lighthouse',
    activeItem: 'Geopolitical Risk Indices',
  };

  return <DatasetDashboard config={config} />;
}
