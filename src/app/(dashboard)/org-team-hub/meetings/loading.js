import { SkeletonRegion, Skeleton, SkeletonCard, SkeletonText, token } from '@/components/ds';

/**
 * Route-segment loading UI for Meetings. Real header chrome + a ~210px meeting
 * rail, a horizontal card strip, and a detail panel silhouette. No useOrg /
 * no fetch.
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

export default function MeetingsLoading() {
  return (
    <SkeletonRegion label="Loading meetings…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Meetings</h1>

      <div style={{ marginTop: 22, display: 'flex', gap: 18 }}>
        {/* Left meeting rail */}
        <div
          style={{
            flex: '0 0 210px',
            width: 210,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${token.border}`,
                background: token.surface,
                borderRadius: token.radiusMd,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <Skeleton width="70%" height={12} />
              <Skeleton width="45%" height={10} />
            </div>
          ))}
        </div>

        {/* Strip + detail */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ flex: '0 0 200px' }}>
                <SkeletonCard rows={2} />
              </div>
            ))}
          </div>
          <div
            style={{
              border: `1px solid ${token.border}`,
              background: token.surface,
              borderRadius: token.radiusLg,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <Skeleton width="50%" height={20} />
            <SkeletonText lines={4} />
            <Skeleton width="100%" height={160} radius={token.radiusMd} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
