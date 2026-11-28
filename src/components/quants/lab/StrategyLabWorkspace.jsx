'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { QuantLabWorkbench } from './QuantLabWorkbench';
import { LAB_TEMPLATES } from './lab-templates';
import { QUANT_BASE, contextHref, useQuantContext } from '../shell/useQuantContext';

/**
 * Strategy Lab: the builder on its own. `?strategy=<id>` opens a saved
 * strategy; a successful run hands over to Backtesting, where the report
 * lives.
 *
 * Nov 28 2026: `?template=<id>` opens the builder prefilled from one of the
 * prebuilt strategies (the Overview's library). Only ids in LAB_TEMPLATES are
 * honoured; nothing is saved or run until the user does it.
 */
export function StrategyLabWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  useQuantContext(); // keeps the open strategy as the one that follows the user
  const strategyId = params.get('strategy');
  const templateParam = params.get('template');
  const templateId =
    !strategyId && LAB_TEMPLATES.some((t) => t.id === templateParam) ? templateParam : null;
  return (
    <QuantLabWorkbench
      /* A different link target is a different session of the builder. */
      key={strategyId || (templateId ? `template:${templateId}` : 'new')}
      mode="build"
      initialStrategyId={strategyId}
      initialTemplateId={templateId}
      onRunComplete={(run, id) =>
        router.push(contextHref(`${QUANT_BASE}/backtesting`, { strategy: id, run: run.id }))
      }
    />
  );
}

export default StrategyLabWorkspace;
