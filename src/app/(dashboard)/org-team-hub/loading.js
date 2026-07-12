import {
  SkeletonRegion,
  SkeletonStatStrip,
  SkeletonChart,
  SkeletonCard,
  token,
} from '@/components/ds';

/**
 * Route-segment loading UI for the org Command Center.
 *
 * Renders OUTSIDE the OrgProvider data context (it is the Suspense fallback
 * for the page, wrapped by the org-shell layout — whose real OrgHubNav rail
 * stays painted beside it). Pure presentational chrome + shape-matched
 * skeletons: NO useOrg, NO fetch, NO import of the page component.
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

export default function OrgTeamHubLoading() {
  return (
    <SkeletonRegion label="Loading Command Center…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Command Center</h1>

      <div style={{ marginTop: 22 }}>
        <SkeletonStatStrip tiles={4} />
      </div>

      <div style={{ marginTop: 20 }}>
        <SkeletonChart h={220} />
      </div>

      <div
        style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} rows={2} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
