import { redirect } from 'next/navigation';

/**
 * The old Trading dashboard subpage was folded into /trading (Nov 2026).
 * The address keeps resolving for existing links (the phone menu) and lands
 * on the brokerage account page.
 */
export default function TradingDashboardRedirect() {
  redirect('/trading');
}
