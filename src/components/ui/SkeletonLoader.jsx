'use client';

import './skeleton.css';

const VARIANTS = {
  text: 'skeleton skeleton-text',
  title: 'skeleton skeleton-title',
  card: 'skeleton skeleton-card',
  avatar: 'skeleton skeleton-avatar',
  chart: 'skeleton skeleton-chart',
};

export function SkeletonLoader({ variant = 'text', className = '', style = {} }) {
  const classes = [VARIANTS[variant] || VARIANTS.text, className].filter(Boolean).join(' ');
  return <div className={classes} style={style} aria-hidden="true" />;
}

export function SkeletonStatsRow({ count = 4 }) {
  return (
    <div className="db-stats-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="db-stat-mini" style={{ flex: '1 1 140px', minWidth: 0 }}>
          <SkeletonLoader variant="title" style={{ height: 28, width: '60%', marginBottom: 4 }} />
          <SkeletonLoader variant="text" style={{ height: 12, width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <SkeletonLoader variant="chart" />;
}

export function SkeletonPortfolioGrid({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SkeletonLoader variant="avatar" style={{ width: 36, height: 36 }} />
          <div style={{ flex: 1 }}>
            <SkeletonLoader variant="text" style={{ width: '30%', marginBottom: 4 }} />
            <SkeletonLoader variant="text" style={{ width: '50%', height: 10 }} />
          </div>
          <SkeletonLoader variant="text" style={{ width: 60, height: 14 }} />
          <SkeletonLoader variant="text" style={{ width: 50, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonInput() {
  return <SkeletonLoader variant="text" style={{ height: 40, width: '100%', borderRadius: 8 }} />;
}
