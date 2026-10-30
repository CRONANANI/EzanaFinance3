'use client';

import { usePathname } from 'next/navigation';
import { SkeletonRegion, Skeleton, SkeletonTable, token } from '@/components/ds';
import { SonarRailLoader } from '@/components/sonar/SonarRailLoader';
import './datasets-loading.css';

/**
 * Route-segment loading UI for a dataset page. A header band, a category/filter
 * bar and a data-table silhouette — self-contained presentational chrome, no
 * fetch.
 *
 * Oct 25: the /datasets overview itself (where the landing page's Sonar pill
 * hands off a ping, /datasets?q=...) is not a table page, so its loading
 * state is the Sonar ping loader alone on the green ground, never the white
 * table silhouette. Every dataset page under it keeps the skeleton.
 *
 * Oct 30: the same rail loader as the in-page hand-off (SonarExperience), so
 * a ping shows one loading screen from the click to the results.
 */
export default function DatasetLoading() {
  const pathname = usePathname();
  if (pathname === '/datasets') {
    return (
      <div className="dsl-sonar">
        {/* No visible copy; the label is announced only. */}
        <SonarRailLoader />
      </div>
    );
  }
  return (
    <SkeletonRegion
      label="Loading dataset…"
      style={{
        maxWidth: 'var(--ds-canvas-max, 1400px)',
        margin: '0 auto',
        padding: '28px var(--ds-gutter, 32px) 48px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <Skeleton width={280} height={26} />
        <Skeleton width={460} height={13} />
      </div>

      <div
        style={{
          marginTop: 22,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width={120} height={34} radius={9} />
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <SkeletonTable rows={10} cols={6} />
      </div>
    </SkeletonRegion>
  );
}
