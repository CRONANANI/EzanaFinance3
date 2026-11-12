'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { QuantLabWorkbench } from './QuantLabWorkbench';
import { QUANT_BASE, contextHref, useQuantContext } from '../shell/useQuantContext';

/**
 * Strategy Lab: the builder on its own. `?strategy=<id>` opens a saved
 * strategy; a successful run hands over to Backtesting, where the report
 * lives.
 */
export function StrategyLabWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  useQuantContext(); // keeps the open strategy as the one that follows the user
  const strategyId = params.get('strategy');
  return (
    <QuantLabWorkbench
      /* A different link target is a different session of the builder. */
      key={strategyId || 'new'}
      mode="build"
      initialStrategyId={strategyId}
      onRunComplete={(run, id) =>
        router.push(contextHref(`${QUANT_BASE}/backtesting`, { strategy: id, run: run.id }))
      }
    />
  );
}

export default StrategyLabWorkspace;
