import { SkeletonRegion, Skeleton, SkeletonCard, SkeletonTable, token } from '@/components/ds';

/**
 * Route-segment loading UI for Compliance. Real header chrome + a tab row and
 * panel/table silhouettes. No useOrg / no fetch.
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

export default function ComplianceLoading() {
  return (
    <SkeletonRegion label="Loading compliance…" style={{ padding: '20px 24px 40px' }}>
      <p style={eyebrowStyle}>Team Hub</p>
      <h1 style={titleStyle}>Compliance</h1>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={120} height={34} radius={9} />
        ))}
      </div>
      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
      </div>
      <div style={{ marginTop: 20 }}>
        <SkeletonTable rows={6} cols={5} />
      </div>
    </SkeletonRegion>
  );
}
