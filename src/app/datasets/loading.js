'use client';

import { usePathname } from 'next/navigation';
import { SkeletonRegion, Skeleton, SkeletonTable } from '@/components/ds';
import { SonarRouteLoader } from '@/components/sonar/SonarRouteLoader';
import './datasets-loading.css';

/**
 * Route-segment loading UI for a dataset page. A header band, a category/filter
 * bar and a data-table silhouette — self-contained presentational chrome, no
 * fetch.
 *
 * The /datasets overview itself (where the landing page's Sonar pill hands
 * off a ping, /datasets?q=...) is not a table page. Nov 2: while it loads it
 * shows the Sonar ping screen ("Pulse", SonarPingLoader), the same screen
 * the page keeps up until the ping answers, so the visitor sees one loading
 * screen from the click to the results. With no ping it shows the pulse
 * alone. Every dataset page under it keeps the skeleton.
 */
export default function DatasetLoading() {
  const pathname = usePathname();
  if (pathname === '/datasets') {
    return (
      <div className="dsl-sonar">
        <SonarRouteLoader />
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
