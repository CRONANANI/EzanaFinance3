import { Suspense } from 'react';
import { StrategyLabWorkspace } from '@/components/quants/lab/StrategyLabWorkspace';
import Loading from './loading';

export const metadata = { title: 'Strategy Lab | Quant Lab | Ezana' };

export default function StrategyLabPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StrategyLabWorkspace />
    </Suspense>
  );
}
