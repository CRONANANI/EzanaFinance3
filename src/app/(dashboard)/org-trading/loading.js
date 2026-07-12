import {
  SkeletonRegion,
  SkeletonStatStrip,
  SkeletonChart,
  SkeletonTable,
  token,
} from '@/components/ds';

/**
 * Route-segment loading UI for the Council Trading desk. Real header chrome +
 * a stat strip, a chart, and a positions-table silhouette. Renders OUTSIDE the
 * OrgProvider data context (the org-shell layout keeps the real OrgHubNav rail
 * beside it) — NO useOrg, NO fetch, NO import of the page component.
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

export default function OrgTradingLoading() {
  return (
    <SkeletonRegion label="Loading Council Trading…" style={{ padding: '20px 24px 40px' }}>
      <h1 style={titleStyle}>Council Trading</h1>
      <p style={subStyle}>Team positions, flags and allocation across the desk.</p>

      <div style={{ marginTop: 22 }}>
        <SkeletonStatStrip tiles={4} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonChart h={240} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonTable rows={8} cols={7} />
      </div>
    </SkeletonRegion>
  );
}
