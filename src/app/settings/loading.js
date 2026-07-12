import { SkeletonRegion, Skeleton, SkeletonCard, token } from '@/components/ds';

/**
 * Route-segment loading UI for Settings. Real header chrome + a tab rail and a
 * panel silhouette. No context reads / no fetch.
 */
const titleStyle = {
  margin: 0,
  fontFamily: token.fontSans,
  fontSize: 26,
  fontWeight: 700,
  color: token.textPrimary,
};

export default function SettingsLoading() {
  return (
    <SkeletonRegion label="Loading settings…" style={{ padding: '20px 24px 40px' }}>
      <h1 style={titleStyle}>Settings</h1>

      <div
        style={{
          marginTop: 22,
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr)',
          gap: 24,
        }}
      >
        {/* Tab rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} height={38} radius={token.radiusMd} />
          ))}
        </div>

        {/* Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard rows={4} />
          <SkeletonCard rows={3} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
