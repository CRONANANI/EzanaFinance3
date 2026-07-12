import { SkeletonRegion, Skeleton, SkeletonKanban, token } from '@/components/ds';

/**
 * Route-segment loading UI for Cohorts. Real header chrome + a tab row and a
 * kanban silhouette. No useOrg / no fetch.
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

export default function CohortsLoading() {
  return (
    <SkeletonRegion label="Loading cohorts…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>People</p>
      <h1 style={titleStyle}>Cohorts</h1>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={110} height={34} radius={9} />
        ))}
      </div>
      <div style={{ marginTop: 22 }}>
        <SkeletonKanban cols={5} cards={3} />
      </div>
    </SkeletonRegion>
  );
}
