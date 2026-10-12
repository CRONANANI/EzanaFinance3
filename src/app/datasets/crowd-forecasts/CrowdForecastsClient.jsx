'use client';

import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { EntityName } from '@/components/marketing/DatasetTable';

const SearchIcon = () => <i className="bi bi-search" aria-hidden="true" />;
const CrowdIcon = () => <i className="bi bi-people" aria-hidden="true" />;

const QuestionCell = (v, row) =>
  row.href ? (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${v} on Manifold (opens in a new tab)`}
    >
      <EntityName>{v}</EntityName>
    </a>
  ) : (
    <EntityName>{v}</EntityName>
  );

export default function CrowdForecastsClient({ rows, updated }) {
  const top = rows.slice(0, 5).map((r) => ({
    name: r.question,
    meta: r.forecasters ? `${r.forecasters} forecasters` : 'Manifold',
    value: r.probability,
  }));

  const config = {
    title: 'Crowd forecasts',
    lead: 'What a large crowd of forecasters expects on politics, markets and world events: open Manifold questions with the current probability and how many people are behind it.',
    searches: [
      {
        id: 'question',
        label: 'Question search',
        placeholder: 'Search questions…',
        icon: SearchIcon,
        keys: ['question', 'category'],
      },
    ],
    highlight: {
      badge: 'Most forecast',
      icon: CrowdIcon,
      title: 'Questions with the most forecasters',
      desc: 'Open questions where the most people have placed a forecast.',
      items: top,
      emptyText: 'Questions appear here as they are indexed.',
    },
    table: {
      caption: 'Open crowd forecasts',
      columns: [
        { key: 'question', label: 'Question', render: QuestionCell },
        { key: 'probability', label: 'Probability', align: 'right', mono: true },
        { key: 'forecasters', label: 'Forecasters', align: 'right', mono: true },
        { key: 'close', label: 'Closes', mono: true },
      ],
      rows,
      emptyText: 'No open questions indexed yet.',
    },
    sampleNote: updated ? `Probabilities as of ${updated}.` : null,
    source: {
      title: 'How we source it',
      body: [
        'Sourced from Manifold’s public API. Manifold forecasts are placed with play money, so a probability shows what the crowd expects, not money at stake.',
        'For real-money odds on the same kinds of questions, see the prediction markets dataset.',
      ],
    },
    cta: { href: '/datasets/prediction-markets', label: 'See prediction markets' },
    activeCategory: 'hive',
    activeItem: 'Crowdsourced Intelligence',
  };

  return <DatasetDashboard config={config} />;
}
