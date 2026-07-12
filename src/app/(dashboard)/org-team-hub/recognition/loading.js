import { SkeletonRegion, SkeletonStatStrip, SkeletonCard, token } from '@/components/ds';

/**
 * Route-segment loading UI for the Recognition wall. Real header chrome + a
 * stat strip and a recognition-card grid silhouette. No useOrg / no fetch.
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

export default function RecognitionLoading() {
  return (
    <SkeletonRegion label="Loading recognition…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Recognition</h1>

      <div style={{ marginTop: 22 }}>
        <SkeletonStatStrip tiles={3} />
      </div>
      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} rows={3} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
