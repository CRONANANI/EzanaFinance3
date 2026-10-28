import { SkeletonRegion, Skeleton, SkeletonText, token } from '@/components/ds';

/**
 * Route-segment loading UI for Council Rankings. Real header chrome + a table
 * silhouette. No useOrg / no fetch. The eyebrow uses the mono face so it does
 * not visibly swap fonts when the real content arrives.
 */
const eyebrowStyle = {
  margin: 0,
  fontFamily: token.fontMono,
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

export default function CouncilRankingsLoading() {
  return (
    <SkeletonRegion label="Loading rankings…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Council Rankings</p>
      <h1 style={titleStyle}>Rankings</h1>

      <div
        style={{
          marginTop: 22,
          border: `1px solid ${token.border}`,
          background: token.surface,
          borderRadius: token.radiusLg,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <Skeleton width="40%" height={20} />
        <SkeletonText lines={8} />
      </div>
    </SkeletonRegion>
  );
}
