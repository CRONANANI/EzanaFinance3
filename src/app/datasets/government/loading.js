import { SkeletonRegion, Skeleton, SkeletonTable, token } from '@/components/ds';

/**
 * Route-segment loading UI for a dataset page. A header band, a category/filter
 * bar and a data-table silhouette — self-contained presentational chrome, no
 * fetch.
 */
export default function DatasetLoading() {
  return (
    <SkeletonRegion
      label="Loading dataset…"
      style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 48px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <Skeleton width={280} height={26} />
        <Skeleton width={460} height={13} />
      </div>

      <div
        style={{
          marginTop: 22,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={120} height={34} radius={9} />
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <SkeletonTable rows={10} cols={6} />
      </div>
    </SkeletonRegion>
  );
}
