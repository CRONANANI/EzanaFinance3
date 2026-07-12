import { SkeletonRegion, Skeleton, SkeletonChart, SkeletonTable, token } from '@/components/ds';

/**
 * Route-segment loading UI for the Watchlist. A header band, a chart, and a
 * ticker-table silhouette. No context reads / no fetch.
 */
export default function WatchlistLoading() {
  return (
    <SkeletonRegion label="Loading watchlist…" style={{ padding: '20px 24px 40px' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton width={200} height={26} />
          <Skeleton width={320} height={13} />
        </div>
        <Skeleton width={140} height={38} radius={10} />
      </div>

      <div style={{ marginTop: 22 }}>
        <SkeletonChart h={220} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonTable rows={8} cols={6} />
      </div>
    </SkeletonRegion>
  );
}
