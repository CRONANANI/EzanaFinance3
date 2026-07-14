'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PitchModal } from './PitchModal';

function PitchModalHostInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const pitchId = params.get('pitch');

  if (!pitchId) return null;

  const close = () => router.push(pathname, { scroll: false });
  return <PitchModal pitchId={pitchId} onClose={close} />;
}

/**
 * Reads the shallow `?pitch=<id>` route and renders the pitch modal in place.
 * Mounted on the Pipeline page. useSearchParams needs a Suspense boundary.
 */
export function PitchModalHost() {
  return (
    <Suspense fallback={null}>
      <PitchModalHostInner />
    </Suspense>
  );
}
