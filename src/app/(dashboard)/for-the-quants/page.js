import { Suspense } from 'react';
import { QuantLabOverview } from '@/components/quants/overview/QuantLabOverview';
import Loading from './loading';

/** Quant Lab, Overview: the user's strategies, latest results and recent research. */
export default function QuantLabOverviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuantLabOverview />
    </Suspense>
  );
}
