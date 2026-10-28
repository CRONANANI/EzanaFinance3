import { SkeletonRegion, SkeletonCard, token } from '@/components/ds';

/**
 * Route-segment loading UI for Pitch Competitions. Real header chrome + a card
 * grid silhouette. No useOrg / no fetch. The eyebrow uses the mono face so it
 * does not visibly swap fonts when the real content arrives.
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

export default function CompetitionsLoading() {
  return (
    <SkeletonRegion label="Loading competitions…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Competitions</p>
      <h1 style={titleStyle}>Pitch Competitions</h1>

      <div
        style={{
          marginTop: 22,
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
