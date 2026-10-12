'use client';

import { useMemo } from 'react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { EntityName } from '@/components/marketing/DatasetTable';

const SearchIcon = () => <i className="bi bi-search" aria-hidden="true" />;
const GrowthIcon = () => <i className="bi bi-graph-up-arrow" aria-hidden="true" />;
const pctText = (v) => (v == null ? null : `${v}%`);

export default function WorldBankClient({ rows, indicatorCount, updated }) {
  const fastest = useMemo(
    () =>
      rows
        .filter((r) => r.growthRaw != null)
        .sort((a, b) => b.growthRaw - a.growthRaw)
        .slice(0, 5)
        .map((r) => ({
          name: r.country,
          meta: r.year ? `Real GDP growth, ${r.year}` : 'Real GDP growth',
          value: `${r.growth}%`,
        })),
    [rows],
  );

  const config = {
    title: 'World Bank economic indicators',
    lead: `The macro picture for every country: real GDP growth, inflation, unemployment, government debt and income per person, the latest year the World Bank reports for each, across ${indicatorCount} indicators from 2000.`,
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
      badge: 'Latest',
      icon: GrowthIcon,
      title: 'Fastest-growing economies',
      desc: 'Countries with the highest real GDP growth in their latest reported year.',
      items: fastest,
      emptyText: 'Appears once the World Bank data is loaded.',
    },
    table: {
      caption: 'Latest value per country',
      columns: [
        { key: 'country', label: 'Country', render: (v) => <EntityName>{v}</EntityName> },
        { key: 'growth', label: 'GDP growth', align: 'right', mono: true, render: pctText },
        { key: 'inflation', label: 'Inflation', align: 'right', mono: true, render: pctText },
        { key: 'unemployment', label: 'Unemployment', align: 'right', mono: true, render: pctText },
        { key: 'debt', label: 'Debt, % of GDP', align: 'right', mono: true, render: pctText },
        { key: 'gdpPc', label: 'GDP per person', align: 'right', mono: true },
        { key: 'year', label: 'Year', mono: true },
      ],
      rows,
      emptyText: 'No World Bank data loaded yet. It refreshes every Monday.',
    },
    sampleNote: updated ? `Latest reported year per country, as of ${updated}.` : null,
    source: {
      title: 'How we source it',
      body: [
        'Sourced from the World Bank Indicators API (CC BY 4.0) and refreshed weekly. Regional and income-group aggregates are left out, so every row is a country.',
        'Each figure is the latest year the World Bank reports for that country and indicator, so years can differ between columns. Government debt is reported for fewer countries than the other series.',
      ],
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'lighthouse',
    activeItem: 'World Bank Economic Indicators',
  };

  return <DatasetDashboard config={config} />;
}
