'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  observeMarketDataState,
  subscribeMarketDataState,
  getMarketDataState,
  setMarketDataStateFromServer,
} from '@/lib/market-sample/client-state';
import './market-sample-banner.css';

/* Pages whose equities and asset figures can fall back to demonstration data. */
const PAGES = [
  '/company-research',
  '/market-analysis',
  '/home',
  '/home-dashboard',
  '/watchlist',
  '/financial-analytics',
];

/**
 * Persistent sample-data disclosure. Shown only when the SERVER declared sample data for this
 * session (the sample-status answer or an `x-ezana-data-state: sample` response); sample data
 * is served only in authorized demonstration contexts (lib/market-sample/index.js).
 */
export function MarketSampleBanner() {
  const pathname = usePathname() || '';
  const [state, setState] = useState(getMarketDataState());
  const onPage = PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    observeMarketDataState();
    return subscribeMarketDataState(setState);
  }, []);

  useEffect(() => {
    if (!onPage) return undefined;
    let cancelled = false;
    fetch('/api/market-data/sample-status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { state: 'live' }))
      .then((j) => {
        if (!cancelled && j.state !== 'unavailable') setMarketDataStateFromServer(j.state);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onPage, pathname]);

  if (state !== 'sample') return null;
  return (
    <div className="market-sample-banner" role="status" aria-live="polite">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>
        <strong>Sample data (demonstration).</strong> The market data provider is unavailable, so
        prices, charts and company figures here are synthetic values, not market or reported data.
        They are not used in research, valuations, trading or saved records, and exports are
        labelled as sample.
      </span>
    </div>
  );
}

export default MarketSampleBanner;
