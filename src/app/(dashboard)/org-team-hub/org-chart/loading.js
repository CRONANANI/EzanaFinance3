import { SkeletonRegion, Skeleton, SkeletonCard, token } from '@/components/ds';

/**
 * Route-segment loading UI for the Org Chart. Real header chrome + a ticker
 * tape strip and a member-tree card silhouette. No useOrg / no fetch.
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

export default function OrgChartLoading() {
  return (
    <SkeletonRegion label="Loading org chart…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Organization</h1>

      {/* Desk tape */}
      <div style={{ marginTop: 18 }}>
        <Skeleton width="100%" height={40} radius={token.radiusMd} />
      </div>

      {/* Tree */}
      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 260 }}>
          <SkeletonCard rows={1} />
        </div>
      </div>
      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} rows={1} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
