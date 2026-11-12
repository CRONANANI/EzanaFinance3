import { PlannedPanel, QuantLabToolbar } from '@/components/quants/shell/QuantLabShell';
import { PairsTradingCard } from '@/components/quants/PairsTradingCard';
import { CorrelationMatrixCard } from '@/components/quants/CorrelationMatrixCard';

export const metadata = { title: 'Statistical Arbitrage | Quant Lab | Ezana' };

export default function StatisticalArbitragePage() {
  return (
    <>
      <QuantLabToolbar label="Workspace notice">
        <p className="qlx-notice">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          Research signals. A pair that passes the test here has not been validated as a strategy.
        </p>
      </QuantLabToolbar>
      <PairsTradingCard />
      <CorrelationMatrixCard />
      <PlannedPanel title="Pairs scanner and saved experiments">
        Scanning the whole universe for cointegrated pairs and saving a pair as an experiment are
        designed but not built yet.
      </PlannedPanel>
    </>
  );
}
