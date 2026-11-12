'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ds';
import { PlannedPanel } from '@/components/quants/shell/QuantLabShell';
import { FactorLabCard } from '@/components/quants/lab/FactorLabCard';
import { TechnicalScannerCard } from '@/components/quants/TechnicalScannerCard';

const TABS = [
  { id: 'factors', label: 'Factor studies' },
  { id: 'indicators', label: 'Single-ticker indicators' },
];

export default function FactorResearchPage() {
  const [tab, setTab] = useState('factors');
  return (
    <>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'factors' ? (
        <>
          <FactorLabCard />
          <PlannedPanel title="More factors and saved studies">
            Value, Quality, Size and Liquidity need company financials and volume history, and
            saving or comparing studies is not built yet.
          </PlannedPanel>
        </>
      ) : (
        <TechnicalScannerCard />
      )}
    </>
  );
}
