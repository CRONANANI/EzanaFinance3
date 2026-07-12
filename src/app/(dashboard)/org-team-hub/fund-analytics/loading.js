import {
  SkeletonRegion,
  SkeletonStatStrip,
  SkeletonChart,
  SkeletonTable,
  token,
} from '@/components/ds';

/**
 * Route-segment loading UI for Fund Analytics. Real header chrome + a stat
 * strip, a performance chart, and a leaderboard table silhouette. No useOrg /
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

export default function FundAnalyticsLoading() {
  return (
    <SkeletonRegion label="Loading fund analytics…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Fund Analytics</h1>

      <div style={{ marginTop: 22 }}>
        <SkeletonStatStrip tiles={4} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonChart h={260} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonTable rows={8} cols={6} />
      </div>
    </SkeletonRegion>
  );
}
