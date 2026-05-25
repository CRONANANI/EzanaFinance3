/**
 * Ezana Echo — canonical tag taxonomy.
 * Primary `category` drives home feed tabs; `tags[]` powers ML persona profiling.
 */

export const TAG_TAXONOMY = {
  markets: {
    id: 'markets',
    label: 'Markets',
    color: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981', border: 'rgba(16,185,129,0.25)' },
    mlWeight: 1.0,
  },
  companies: {
    id: 'companies',
    label: 'Companies',
    color: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    mlWeight: 1.0,
  },
  policy: {
    id: 'policy',
    label: 'Policy',
    color: { bg: 'rgba(99,102,241,0.12)', fg: '#6366f1', border: 'rgba(99,102,241,0.25)' },
    mlWeight: 1.3,
  },
  crypto: {
    id: 'crypto',
    label: 'Crypto',
    color: { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
    mlWeight: 1.2,
  },
  history: {
    id: 'history',
    label: 'History',
    color: { bg: 'rgba(180,150,90,0.14)', fg: '#b4965a', border: 'rgba(180,150,90,0.3)' },
    mlWeight: 1.1,
  },
  'sector-rotation': {
    id: 'sector-rotation',
    label: 'Sector Rotation',
    color: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981', border: 'rgba(16,185,129,0.25)' },
    mlWeight: 1.2,
  },
  technology: {
    id: 'technology',
    label: 'Technology',
    color: { bg: 'rgba(99,102,241,0.12)', fg: '#6366f1', border: 'rgba(99,102,241,0.25)' },
    mlWeight: 1.0,
  },
  geopolitics: {
    id: 'geopolitics',
    label: 'Geopolitics',
    color: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    mlWeight: 1.4,
  },
  commodities: {
    id: 'commodities',
    label: 'Commodities',
    color: { bg: 'rgba(236,72,153,0.12)', fg: '#ec4899', border: 'rgba(236,72,153,0.25)' },
    mlWeight: 1.1,
  },
  energy: {
    id: 'energy',
    label: 'Energy',
    color: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    mlWeight: 1.1,
  },
  macro: {
    id: 'macro',
    label: 'Macro',
    color: { bg: 'rgba(20,184,166,0.12)', fg: '#14b8a6', border: 'rgba(20,184,166,0.25)' },
    mlWeight: 1.2,
  },
  earnings: {
    id: 'earnings',
    label: 'Earnings',
    color: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e', border: 'rgba(34,197,94,0.25)' },
    mlWeight: 0.9,
  },
  regulation: {
    id: 'regulation',
    label: 'Regulation',
    color: { bg: 'rgba(99,102,241,0.14)', fg: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    mlWeight: 1.3,
  },
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    color: { bg: 'rgba(132,150,165,0.12)', fg: '#8496a5', border: 'rgba(132,150,165,0.25)' },
    mlWeight: 1.0,
  },
  ai: {
    id: 'ai',
    label: 'AI',
    color: { bg: 'rgba(168,85,247,0.12)', fg: '#a855f7', border: 'rgba(168,85,247,0.25)' },
    mlWeight: 1.3,
  },
  semiconductors: {
    id: 'semiconductors',
    label: 'Semiconductors',
    color: { bg: 'rgba(99,102,241,0.12)', fg: '#6366f1', border: 'rgba(99,102,241,0.25)' },
    mlWeight: 1.1,
  },
  biotech: {
    id: 'biotech',
    label: 'Biotech',
    color: { bg: 'rgba(34,197,94,0.14)', fg: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    mlWeight: 1.2,
  },
  healthcare: {
    id: 'healthcare',
    label: 'Healthcare',
    color: { bg: 'rgba(20,184,166,0.12)', fg: '#14b8a6', border: 'rgba(20,184,166,0.25)' },
    mlWeight: 1.0,
  },
  'public-health': {
    id: 'public-health',
    label: 'Public Health',
    color: { bg: 'rgba(20,184,166,0.14)', fg: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
    mlWeight: 1.1,
  },
  'emerging-markets': {
    id: 'emerging-markets',
    label: 'Emerging Markets',
    color: { bg: 'rgba(245,158,11,0.14)', fg: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    mlWeight: 1.2,
  },
  africa: {
    id: 'africa',
    label: 'Africa',
    color: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    mlWeight: 1.3,
  },
  'mergers-acquisitions': {
    id: 'mergers-acquisitions',
    label: 'M&A',
    color: { bg: 'rgba(168,85,247,0.12)', fg: '#a855f7', border: 'rgba(168,85,247,0.25)' },
    mlWeight: 1.1,
  },
  'private-markets': {
    id: 'private-markets',
    label: 'Private Markets',
    color: { bg: 'rgba(132,150,165,0.12)', fg: '#8496a5', border: 'rgba(132,150,165,0.25)' },
    mlWeight: 1.2,
  },
  'fixed-income': {
    id: 'fixed-income',
    label: 'Fixed Income',
    color: { bg: 'rgba(20,184,166,0.12)', fg: '#14b8a6', border: 'rgba(20,184,166,0.25)' },
    mlWeight: 1.1,
  },
  currencies: {
    id: 'currencies',
    label: 'Currencies',
    color: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e', border: 'rgba(34,197,94,0.25)' },
    mlWeight: 1.0,
  },
  'real-estate': {
    id: 'real-estate',
    label: 'Real Estate',
    color: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    mlWeight: 1.0,
  },
  congress: {
    id: 'congress',
    label: 'Congress',
    color: { bg: 'rgba(99,102,241,0.14)', fg: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    mlWeight: 1.3,
  },
  fed: {
    id: 'fed',
    label: 'Fed',
    color: { bg: 'rgba(99,102,241,0.12)', fg: '#6366f1', border: 'rgba(99,102,241,0.25)' },
    mlWeight: 1.3,
  },
  tariffs: {
    id: 'tariffs',
    label: 'Tariffs',
    color: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    mlWeight: 1.3,
  },
  antitrust: {
    id: 'antitrust',
    label: 'Antitrust',
    color: { bg: 'rgba(99,102,241,0.14)', fg: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    mlWeight: 1.2,
  },
};

export function getTag(id) {
  return (
    TAG_TAXONOMY[id] || {
      id,
      label: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      color: { bg: 'rgba(132,150,165,0.12)', fg: '#8496a5', border: 'rgba(132,150,165,0.25)' },
      mlWeight: 1.0,
    }
  );
}

export function getTagWeight(id) {
  return TAG_TAXONOMY[id]?.mlWeight ?? 1.0;
}

export function getAllTagIds() {
  return Object.keys(TAG_TAXONOMY);
}
