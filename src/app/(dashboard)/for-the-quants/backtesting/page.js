'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { QuantSection } from '@/components/quants/shell/QuantLabShell';
import { BacktestingWorkspace } from '@/components/quants/lab/BacktestingWorkspace';
import { SampleSimulations } from '../SampleSimulations';
import Loading from './loading';

/* The comparison card draws charts and sits below the fold: load it in the
   browser only. It still runs on sample data, and says so. */
const StrategyComparisonCard = dynamic(
  () =>
    import('@/components/quants/StrategyComparisonCard').then((m) => ({
      default: m.StrategyComparisonCard,
    })),
  { ssr: false, loading: () => <div aria-hidden style={{ minHeight: 420, width: '100%' }} /> },
);

export default function BacktestingPage() {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <BacktestingWorkspace />
      </Suspense>
      <QuantSection title="Comparison" actions={<span className="qlx-tag">Sample data</span>}>
        <StrategyComparisonCard />
      </QuantSection>
      <details className="qlx-fold">
        <summary className="qlx-btn qlx-btn--sm">Simulation visuals (sample data)</summary>
        <SampleSimulations />
      </details>
    </>
  );
}
