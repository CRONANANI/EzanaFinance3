import {
  SkeletonRegion,
  Skeleton,
  SkeletonStatStrip,
  SkeletonChart,
  SkeletonCard,
  token,
} from '@/components/ds';

/**
 * Route-segment loading UI for the home dashboard. A header band, a stat strip,
 * a performance chart and a holdings-card grid silhouette. No context reads /
 * no fetch.
 */
export default function HomeLoading() {
  return (
    <SkeletonRegion label="Loading dashboard…" style={{ padding: '20px 24px 40px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width={220} height={26} />
        <Skeleton width={360} height={13} />
      </div>

      <div style={{ marginTop: 22 }}>
        <SkeletonStatStrip tiles={4} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonChart h={240} />
      </div>
      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} rows={2} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
