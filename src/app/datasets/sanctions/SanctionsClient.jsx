'use client';

import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { EntityName } from '@/components/marketing/DatasetTable';

const SearchIcon = () => <i className="bi bi-search" aria-hidden="true" />;
const ShieldIcon = () => <i className="bi bi-shield-exclamation" aria-hidden="true" />;

export default function SanctionsClient({ rows, updated }) {
  const added = rows
    .filter((r) => r.added)
    .slice(0, 5)
    .map((r) => ({ name: r.name, meta: r.programs || r.type || 'OFAC', value: r.added }));

  const config = {
    title: 'US sanctions list tracker',
    lead: 'Who the US Treasury has sanctioned: individuals, companies, vessels and aircraft on the OFAC Specially Designated Nationals list, with the program behind each listing and every new addition dated.',
    searches: [
      {
        id: 'name',
        label: 'Name search',
        placeholder: 'Search by name, program or country…',
        icon: SearchIcon,
        keys: ['name', 'programs', 'country'],
      },
    ],
    highlight: {
      badge: 'New',
      icon: ShieldIcon,
      title: 'Newest additions',
      desc: 'Entries added to the list since tracking began, newest first.',
      items: added,
      emptyText: 'Additions appear here from the day after the list was first loaded.',
    },
    table: {
      caption: 'On the OFAC SDN list',
      columns: [
        { key: 'name', label: 'Name', render: (v) => <EntityName>{v}</EntityName> },
        { key: 'type', label: 'Type' },
        { key: 'programs', label: 'Programs', mono: true },
        { key: 'country', label: 'Country' },
        { key: 'added', label: 'Added', mono: true },
      ],
      rows,
      emptyText: 'The sanctions list has not loaded yet. It refreshes daily.',
    },
    sampleNote: updated
      ? `List as of ${updated}. Showing the 300 most recent entries; search covers those rows.`
      : null,
    source: {
      title: 'How we source it',
      body: [
        'Sourced from the US Treasury Office of Foreign Assets Control (OFAC) Specially Designated Nationals list, public domain, refreshed daily. Countries come from the addresses OFAC publishes with each entry.',
        'The first daily load is the baseline, so the Added date appears only for entries listed after tracking began. Entries OFAC removes are marked delisted and leave this table.',
      ],
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'lighthouse',
    activeItem: 'Sanctions & Trade Policy Tracking',
  };

  return <DatasetDashboard config={config} />;
}
