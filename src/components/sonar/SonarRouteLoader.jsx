'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SonarPingLoader } from '@/components/sonar/SonarPingLoader';
import { pingEntityLabel } from '@/lib/sonar/ping-entity';

/* Reads ?q= (useSearchParams needs its own Suspense boundary in Next 14). */
function FromUrl({ idle }) {
  const params = useSearchParams();
  const q = (params?.get('q') || '').trim();
  return q ? (
    <SonarPingLoader entityLabel={pingEntityLabel(q)} />
  ) : (
    <SonarPingLoader phase="loading" status={idle} />
  );
}

/**
 * The Sonar route loading screen (/datasets, /sonar; Nov 2). A ping hand-off
 * (?q=) shows the ping screen from the first frame, so the visitor sees one
 * loading screen from the click to the results; with no ping, the pulse
 * with `idle` under it. The ping cannot be cancelled until the page has
 * mounted, so there is no Cancel here.
 */
export function SonarRouteLoader({ idle = 'Loading Sonar' }) {
  return (
    <Suspense fallback={<SonarPingLoader phase="loading" status="" />}>
      <FromUrl idle={idle} />
    </Suspense>
  );
}

export default SonarRouteLoader;
