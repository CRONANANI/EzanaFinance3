'use client';

import { PerfStatCard } from './PerfStatCard';

export function PerfStats({ stats }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div
      className="profile-stripe-perfstats"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}
    >
      {stats.map((s) => (
        <PerfStatCard key={s.key} stat={s} />
      ))}
    </div>
  );
}
