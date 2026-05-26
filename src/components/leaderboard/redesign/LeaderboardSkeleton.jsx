'use client';

import { page, shape } from './elo-design-tokens';

const COLUMN_GRID = '48px 1fr 130px 84px 64px 64px 70px 84px 76px';

function Shimmer({ style }) {
  return (
    <div
      className="elo-skeleton-shimmer"
      style={{
        background: 'linear-gradient(90deg, #f5f0e6 25%, #ece5d3 50%, #f5f0e6 75%)',
        backgroundSize: '200% 100%',
        animation: 'elo-shimmer 1.2s ease-in-out infinite',
        borderRadius: 8,
        ...style,
      }}
    />
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMN_GRID,
        alignItems: 'center',
        padding: '10px 14px',
        marginBottom: 4,
      }}
    >
      <Shimmer style={{ width: 24, height: 14 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Shimmer style={{ width: 32, height: 32, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <Shimmer style={{ width: '70%', height: 12, marginBottom: 6 }} />
          <Shimmer style={{ width: '45%', height: 10 }} />
        </div>
      </div>
      <Shimmer style={{ width: 72, height: 20, borderRadius: 999 }} />
      <Shimmer style={{ width: 48, height: 14, marginLeft: 'auto' }} />
      <Shimmer style={{ width: 36, height: 14, marginLeft: 'auto' }} />
      <Shimmer style={{ width: 36, height: 14, marginLeft: 'auto' }} />
      <Shimmer style={{ width: 40, height: 14, marginLeft: 'auto' }} />
      <Shimmer style={{ width: 70, height: 18, marginLeft: 'auto' }} />
      <Shimmer style={{ width: 44, height: 12, marginLeft: 'auto' }} />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div
      className="elo-page-wrap elo-page-loading"
      style={{
        background: page.bg,
        minHeight: '60vh',
        padding: '20px 28px 40px',
      }}
      aria-busy="true"
      aria-label="Loading leaderboard"
    >
      <Shimmer style={{ width: 280, height: 32, marginBottom: 12 }} />
      <Shimmer style={{ width: 420, height: 14, marginBottom: 18 }} />

      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1.6,
            minWidth: 280,
            background: page.card,
            border: `2px solid ${page.cardLine}`,
            borderRadius: shape.radius.card,
            padding: 24,
            minHeight: 160,
          }}
        >
          <Shimmer style={{ width: '100%', height: 110 }} />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 320,
            background: page.card,
            border: `2px solid ${page.cardLine}`,
            borderRadius: shape.radius.card,
            padding: 20,
            minHeight: 160,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Shimmer key={i} style={{ width: '100%', height: 44, marginBottom: 8 }} />
          ))}
        </div>
      </div>

      <div
        style={{
          background: page.card,
          border: `2px solid ${page.cardLine}`,
          borderRadius: shape.radius.card,
          padding: '8px 12px 12px',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
