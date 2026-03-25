'use client';

import Link from 'next/link';
import { OpenBrokerageWizard } from '@/components/trading/OpenBrokerageWizard';
import '../trading.css';

export default function TradingOpenAccountPage() {
  return (
    <div className="trd-page trd-open-page dashboard-page-inset">
      <div className="trd-open-top">
        <Link href="/trading" className="trd-open-back">
          ← Trading overview
        </Link>
      </div>
      <div className="trd-page-center">
        <OpenBrokerageWizard />
      </div>
    </div>
  );
}
