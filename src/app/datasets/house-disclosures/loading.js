import { SkeletonRegion, Skeleton } from '@/components/ds';

/** Route-segment loading UI for House disclosures — header, control row, table
 *  silhouette under the full-bleed chrome. Presentational only. */
export default function HouseDisclosuresLoading() {
  return (
    <SkeletonRegion
      label="Loading House disclosures…"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 48px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <Skeleton width={320} height={28} />
        <Skeleton width={520} height={14} />
        <Skeleton width={480} height={14} />
      </div>

      <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width={200} height={58} radius={8} />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Skeleton width="100%" height={360} radius={12} />
      </div>
    </SkeletonRegion>
  );
}
