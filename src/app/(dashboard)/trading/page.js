'use client';

/**
 * Trading: the brokerage account page (Nov 2026 redesign).
 * Component: src/components/trading/account/BrokerageAccountPage.jsx.
 * Flat home canvas: the root carries `ez-canvas` and home-canvas.css loads last.
 */
import { BrokerageAccountPage } from '@/components/trading/account/BrokerageAccountPage';
import './brokerage-account.css';
import '@/styles/home-canvas.css';

export default function TradingPage() {
  return <BrokerageAccountPage />;
}
