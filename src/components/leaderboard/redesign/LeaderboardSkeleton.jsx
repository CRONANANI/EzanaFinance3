'use client';

import { shape } from './elo-design-tokens';
import { useEloTheme } from './EloThemeContext';

const COLUMN_GRID = '40px 1fr 130px 80px 60px 60px 64px 72px 72px';

function Shimmer({ style, isDark }) {
  return (
    <div
      className="elo-skeleton-shimmer"
      style={{
        background: isDark
          ? 'linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%)'
          : 'linear-gradient(90deg, #f7f7f8 25%, #ececec 50%, #f7f7f8 75%)',
        backgroundSize: '200% 100%',
        animation: 'elo-shimmer 1.2s ease-in-out infinite',
        borderRadius: 6,
        ...style,
      }}
    />
  );
}

function SkeletonRow({ page, isDark }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: COLUMN_GRID,
        alignItems: 'center',
        padding: '9px 16px',
        borderBottom: `1px solid ${page.border}`,
      }}
    >
      <Shimmer isDark={isDark} style={{ width: 20, height: 12 }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Shimmer isDark={isDark} style={{ width: 26, height: 26, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <Shimmer isDark={isDark} style={{ width: '70%', height: 12, marginBottom: 6 }} />
          <Shimmer isDark={isDark} style={{ width: '45%', height: 10 }} />
        </div>
      </div>
      <Shimmer isDark={isDark} style={{ width: 64, height: 18, borderRadius: 5 }} />
      <Shimmer isDark={isDark} style={{ width: 40, height: 12, marginLeft: 'auto' }} />
      <Shimmer isDark={isDark} style={{ width: 32, height: 12, marginLeft: 'auto' }} />
      <Shimmer isDark={isDark} style={{ width: 32, height: 12, marginLeft: 'auto' }} />
      <Shimmer isDark={isDark} style={{ width: 36, height: 12, marginLeft: 'auto' }} />
      <Shimmer isDark={isDark} style={{ width: 62, height: 14, marginLeft: 'auto' }} />
      <Shimmer isDark={isDark} style={{ width: 40, height: 11, marginLeft: 'auto' }} />
    </div>
  );
}

export function LeaderboardSkeleton() {
  const { page, isDark } = useEloTheme();

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
      <Shimmer isDark={isDark} style={{ width: 280, height: 28, marginBottom: 12 }} />
      <Shimmer isDark={isDark} style={{ width: 420, height: 14, marginBottom: 18 }} />

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1.6,
            minWidth: 280,
            background: page.surface,
            border: `1px solid ${page.border}`,
            borderRadius: shape.radius.card,
            padding: 20,
            minHeight: 140,
          }}
        >
          <Shimmer isDark={isDark} style={{ width: '100%', height: 84 }} />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 300,
            background: page.surface,
            border: `1px solid ${page.border}`,
            borderRadius: shape.radius.card,
            padding: 16,
            minHeight: 140,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Shimmer
              key={i}
              isDark={isDark}
              style={{ width: '100%', height: 36, marginBottom: 8 }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          background: page.surface,
          border: `1px solid ${page.border}`,
          borderRadius: shape.radius.card,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} page={page} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}
