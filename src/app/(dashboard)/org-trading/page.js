'use client';

import { TradingDesk } from '@/components/org-trading/desk/TradingDesk';
import './org-trading.css';

/* The Trading Desk for every role. The component scopes what a member sees
   (whole fund, own team, covered sectors) from the existing permission checks. */
export default function OrgTradingPage() {
  return <TradingDesk />;
}
