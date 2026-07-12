import { SkeletonRegion, Skeleton, SkeletonCard, token } from '@/components/ds';

/**
 * Route-segment loading UI for the Research Library. Real header chrome + a
 * search bar and a 4-column document-card grid silhouette. No useOrg / no fetch.
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
const subStyle = {
  margin: '8px 0 0',
  fontFamily: token.fontSans,
  fontSize: 13,
  color: token.textSecondary,
  maxWidth: 620,
};

export default function ResearchLibraryLoading() {
  return (
    <SkeletonRegion label="Loading research library…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Research Library</h1>
      <p style={subStyle}>
        Typed, versioned institutional memory — theses that survive cohort rollover.
      </p>

      <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Skeleton width={280} height={38} radius={10} />
        <Skeleton width={140} height={38} radius={10} />
        <Skeleton width={140} height={38} radius={10} />
      </div>

      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} rows={3} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
