import { SkeletonRegion, Skeleton, SkeletonCard, token } from '@/components/ds';

/**
 * Route-segment loading UI for Assignments. Real header chrome + a calendar
 * grid and a right-rail silhouette. No useOrg / no fetch.
 */
const eyebrowStyle = {
  margin: 0,
  fontFamily: token.fontSans,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: token.textMuted,
};
const titleStyle = {
  margin: '4px 0 0',
  fontFamily: token.fontSans,
  fontSize: 26,
  fontWeight: 700,
  color: token.textPrimary,
};

export default function AssignmentsLoading() {
  return (
    <SkeletonRegion label="Loading assignments…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Academic</p>
      <h1 style={titleStyle}>Assignments</h1>

      <div
        style={{
          marginTop: 22,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: 18,
        }}
      >
        {/* Calendar */}
        <div
          style={{
            border: `1px solid ${token.border}`,
            background: token.surface,
            borderRadius: token.radiusLg,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <Skeleton width={160} height={18} />
            <Skeleton width={90} height={26} radius={8} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 8,
            }}
          >
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} height={70} radius={token.radiusMd} />
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
