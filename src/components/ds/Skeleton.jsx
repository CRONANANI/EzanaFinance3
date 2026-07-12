'use client';

import { cx, token } from './tokens';
import { VisuallyHidden } from './VisuallyHidden';

/**
 * The ONE skeleton system.
 *
 * Every placeholder in the app composes from the `Skeleton` primitive below,
 * which paints a subtle, token-only shimmer (see `.ds-skeleton` in ds.css —
 * ~1.4s ease-in-out, surface-card → surface-card-hover sweep, and static under
 * `prefers-reduced-motion: reduce`). No hardcoded colors, no spinners:
 * spinners are a button-level affordance only; section/page loads use these.
 *
 * Shapes are matched to the real content they stand in for so the resolved UI
 * lands in the same footprint — a skeleton is a silhouette, never a fake
 * filled state. Wrap a loading region with `<SkeletonRegion>` (or set
 * `aria-busy`/`aria-live` + a visually-hidden label yourself) so assistive tech
 * announces the pending state.
 */

/** Shimmer placeholder. Sized via width/height; respects reduced-motion. */
export function Skeleton({ width = '100%', height = 16, radius, className, style, ...rest }) {
  return (
    <span
      aria-hidden="true"
      className={cx('ds-skeleton', className)}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}

/**
 * Announced loading wrapper. Renders `aria-busy` + `aria-live="polite"` and a
 * visually-hidden label so screen readers hear "Loading …" while the shimmer
 * shows. Use once around a loading region — the shapes inside stay aria-hidden.
 */
export function SkeletonRegion({ label = 'Loading…', children, className, style, ...rest }) {
  return (
    <div aria-busy="true" aria-live="polite" className={className} style={style} {...rest}>
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </div>
  );
}

/** Paragraph of shimmer lines; the last line is shortened by default. */
export function SkeletonText({ lines = 3, lastWidth = '60%', gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 && lines > 1 ? lastWidth : '100%'} />
      ))}
    </div>
  );
}

const cardSurface = {
  border: `1px solid ${token.border}`,
  background: token.surface,
  borderRadius: token.radiusLg,
};

/** A card silhouette: a short title bar over a run of text lines. */
export function SkeletonCard({ rows = 3 }) {
  return (
    <div style={{ ...cardSurface, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width="45%" height={16} />
      <SkeletonText lines={rows} />
    </div>
  );
}

/** A bordered table silhouette: a header row over `rows` × `cols` cells. */
export function SkeletonTable({ rows = 8, cols = 6 }) {
  const grid = {
    display: 'grid',
    gridTemplateColumns: `1.6fr ${Array.from({ length: Math.max(0, cols - 1) })
      .map(() => '1fr')
      .join(' ')}`.trim(),
    gap: 12,
    alignItems: 'center',
    padding: '12px 16px',
  };
  return (
    <div style={{ ...cardSurface, overflow: 'hidden' }}>
      <div style={{ ...grid, borderBottom: `1px solid ${token.border}` }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} height={11} width={c === 0 ? '70%' : '55%'} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{ ...grid, borderTop: r === 0 ? 'none' : `1px solid ${token.borderSecondary}` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={12} width={c === 0 ? '80%' : '60%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A horizontal strip of stat tiles — a big number over a small label each. */
export function SkeletonStatStrip({ tiles = 4 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`,
        gap: 14,
      }}
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          style={{ ...cardSurface, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <Skeleton width="40%" height={11} />
          <Skeleton width="65%" height={24} />
        </div>
      ))}
    </div>
  );
}

/** Kanban board silhouette: `cols` columns, each a header over `cards` cards. */
export function SkeletonKanban({ cols = 7, cards = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
      {Array.from({ length: cols }).map((_, c) => (
        <div
          key={c}
          style={{
            flex: '0 0 240px',
            minWidth: 240,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton width="55%" height={13} />
            <Skeleton width={22} height={16} radius={8} />
          </div>
          {Array.from({ length: cards }).map((_, i) => (
            <div
              key={i}
              style={{
                ...cardSurface,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <Skeleton width="80%" height={13} />
              <SkeletonText lines={2} lastWidth="50%" />
              <Skeleton width="35%" height={18} radius={9} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chart silhouette: a framed plot area with a baseline of axis ticks. */
export function SkeletonChart({ h = 260 }) {
  return (
    <div style={{ ...cardSurface, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="30%" height={14} />
        <Skeleton width={120} height={26} radius={8} />
      </div>
      <Skeleton width="100%" height={h} radius={token.radiusMd} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={36} height={10} />
        ))}
      </div>
    </div>
  );
}

/** Sidebar silhouette matching OrgHubNav: a user card + two labelled groups. */
export function SkeletonNavRail() {
  const Group = ({ rows }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton width="40%" height={9} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton width={15} height={15} radius={4} />
          <Skeleton width={`${55 + ((i * 7) % 30)}%`} height={12} />
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ width: 212, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...cardSurface, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton width={38} height={38} radius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="55%" height={9} />
          <Skeleton width="80%" height={13} />
        </div>
      </div>
      <Group rows={4} />
      <Group rows={8} />
    </div>
  );
}
