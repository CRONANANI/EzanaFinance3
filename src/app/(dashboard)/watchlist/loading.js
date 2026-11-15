import { SkeletonRegion, Skeleton, SkeletonChart, SkeletonTable } from '@/components/ds';

/**
 * Route-segment loading UI for the Watchlist (Market Monitor 2.0): the
 * command bar, then the two columns (tabs, pulse row, asset panel and the
 * securities table on the left; the side cards on the right), so nothing
 * jumps when the page arrives. No context reads, no fetch.
 */
export default function WatchlistLoading() {
  return (
    <SkeletonRegion label="Loading watchlist…" style={{ padding: '0 0 40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Skeleton width={220} height={28} />
        <div style={{ display: 'flex', gap: 16 }}>
          <Skeleton width={96} height={36} />
          <Skeleton width={128} height={36} />
          <Skeleton width={112} height={36} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
          gap: 64,
          marginTop: 20,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, gridColumn: 'span 2' }}>
          <Skeleton width={420} height={22} />
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={150} height={44} />
            ))}
          </div>
          <SkeletonChart h={240} />
          <SkeletonTable rows={6} cols={7} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton width="100%" height={120} />
          <Skeleton width="100%" height={160} />
          <Skeleton width="100%" height={56} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
