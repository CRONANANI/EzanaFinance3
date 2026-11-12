import Link from 'next/link';
import { PlannedPanel, QuantLabToolbar } from '@/components/quants/shell/QuantLabShell';

export const metadata = { title: 'Paper Trading | Quant Lab | Ezana' };

export default function PaperTradingPage() {
  return (
    <>
      <QuantLabToolbar label="Workspace notice">
        <p className="qlx-notice">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          Simulated capital and simulated orders only. Nothing here will ever reach a brokerage.
        </p>
      </QuantLabToolbar>
      <PlannedPanel title="Paper deployment">
        Running a validated strategy forward on simulated capital is designed but not built yet.
        Until then, manual simulated trades are in{' '}
        <Link className="qlx-link" href="/trading/mock">
          Mock Trading
        </Link>
        .
      </PlannedPanel>
    </>
  );
}
