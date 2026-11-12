import { PlannedPanel } from '@/components/quants/shell/QuantLabShell';
import { PortfolioRiskCard } from '@/components/quants/lab/PortfolioRiskCard';
import { CorrelationMatrixCard } from '@/components/quants/CorrelationMatrixCard';

export const metadata = { title: 'Risk & Portfolio | Quant Lab | Ezana' };

export default function RiskPortfolioPage() {
  return (
    <>
      <PortfolioRiskCard />
      <CorrelationMatrixCard />
      <PlannedPanel title="Stress tests, liquidity and export">
        Stress scenarios, leverage and net exposure, and days to exit from volume are designed but
        not built yet.
      </PlannedPanel>
    </>
  );
}
