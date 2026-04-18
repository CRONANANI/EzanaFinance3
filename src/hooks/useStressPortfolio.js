'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';

/**
 * Static demo allocation used when no live portfolio is connected. These
 * numbers are illustrative only — they give the stress-test UI something to
 * operate on so a first-time user can see how the tool works before linking
 * a brokerage account.
 */
const DEMO_POSITIONS = [
  { symbol: 'AAPL', sector: 'Technology', marketValue: 22000 },
  { symbol: 'MSFT', sector: 'Technology', marketValue: 18000 },
  { symbol: 'NVDA', sector: 'Technology', marketValue: 16000 },
  { symbol: 'JPM', sector: 'Financials', marketValue: 9000 },
  { symbol: 'BAC', sector: 'Financials', marketValue: 6000 },
  { symbol: 'UNH', sector: 'Health Care', marketValue: 8000 },
  { symbol: 'LLY', sector: 'Health Care', marketValue: 7000 },
  { symbol: 'AMZN', sector: 'Consumer Discretionary', marketValue: 8000 },
  { symbol: 'XOM', sector: 'Energy', marketValue: 4000 },
  { symbol: 'NEE', sector: 'Utilities', marketValue: 2000 },
];

/**
 * Minimal sector inference from ticker symbol. We rely on the server-side
 * holdings endpoint to already include a sector field when available; this
 * map is only consulted as a fallback so a demo / lightly classified
 * portfolio doesn't all fall into "Unclassified".
 */
const TICKER_SECTOR_HINTS = {
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOGL: 'Communication Services',
  GOOG: 'Communication Services', META: 'Communication Services', NFLX: 'Communication Services',
  AMZN: 'Consumer Discretionary', TSLA: 'Consumer Discretionary', HD: 'Consumer Discretionary',
  JPM: 'Financials', BAC: 'Financials', WFC: 'Financials', GS: 'Financials', MS: 'Financials',
  UNH: 'Health Care', JNJ: 'Health Care', LLY: 'Health Care', PFE: 'Health Care',
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy',
  NEE: 'Utilities', SO: 'Utilities', DUK: 'Utilities',
  PG: 'Consumer Staples', KO: 'Consumer Staples', PEP: 'Consumer Staples', WMT: 'Consumer Staples',
  AMT: 'Real Estate', PLD: 'Real Estate', SPG: 'Real Estate',
  CAT: 'Industrials', BA: 'Industrials', GE: 'Industrials', HON: 'Industrials',
  LIN: 'Materials', FCX: 'Materials', NEM: 'Materials',
};

function normalizeHoldings(holdings) {
  if (!Array.isArray(holdings)) return [];
  return holdings
    .map((h) => {
      const symbol = (h.symbol || h.ticker || h.ticker_symbol || '').toUpperCase();
      const rawValue =
        h.market_value ??
        h.marketValue ??
        h.value ??
        (Number.isFinite(h.quantity) && Number.isFinite(h.price)
          ? h.quantity * h.price
          : null);
      const marketValue = Number.isFinite(rawValue) ? Number(rawValue) : 0;
      const sector =
        h.sector ||
        h.security_sector ||
        TICKER_SECTOR_HINTS[symbol] ||
        null;
      return { symbol: symbol || null, sector, marketValue };
    })
    .filter((p) => p.marketValue > 0);
}

/**
 * useStressPortfolio — returns the positions the stress-test tool should
 * operate on. Prefers live Plaid-backed holdings when a portfolio is
 * connected, falling back to a deterministic demo allocation so the card is
 * never empty for a signed-out / un-linked user.
 *
 * Returns:
 *   positions: Array<{ symbol, sector, marketValue }>
 *   isDemo:    boolean — true when the values came from the demo allocation
 *   isLoading: boolean
 */
export function useStressPortfolio() {
  const { portfolio, isLoading } = usePortfolio();
  const [isDemo, setIsDemo] = useState(false);

  const positions = useMemo(() => {
    const holdings = portfolio?.holdings;
    const normalized = normalizeHoldings(holdings);
    if (normalized.length > 0) return normalized;
    return DEMO_POSITIONS;
  }, [portfolio]);

  useEffect(() => {
    const holdings = portfolio?.holdings;
    setIsDemo(!Array.isArray(holdings) || holdings.length === 0);
  }, [portfolio]);

  return { positions, isDemo, isLoading };
}

export default useStressPortfolio;
