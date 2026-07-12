import { SkeletonRegion, SkeletonKanban, token } from '@/components/ds';

/**
 * Route-segment loading UI for the Stock Pitch Pipeline. Real header chrome +
 * a 7-column kanban silhouette matching the pitch board. No useOrg / no fetch —
 * the org-shell layout keeps the real OrgHubNav rail painted beside this.
 */
const titleStyle = {
  margin: 0,
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

export default function PitchesLoading() {
  return (
    <SkeletonRegion label="Loading pitch pipeline…" style={{ padding: '20px 24px 40px' }}>
      <h1 style={titleStyle}>Stock Pitch Pipeline</h1>
      <p style={subStyle}>
        Track every pitch from idea through committee decision — stage gates with role-based
        approvals.
      </p>

      <div style={{ marginTop: 24 }}>
        <SkeletonKanban cols={7} cards={3} />
      </div>
    </SkeletonRegion>
  );
}
