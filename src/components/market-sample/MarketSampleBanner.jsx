'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import './market-sample-banner.css';

/* Pages whose equities and asset figures can fall back to sample values. */
const PAGES = [
  '/company-research',
  '/market-analysis',
  '/home',
  '/home-dashboard',
  '/watchlist',
  '/financial-analytics',
];
const KEY = 'ezana-market-sample';
const TTL_MS = 5 * 60 * 1000;

/**
 * Temporary notice (Nov 28 2026): while the market data provider refuses Ezana's key, the
 * equities and asset pages show sample values. This says so, plainly, on those pages.
 */
export function MarketSampleBanner() {
  const pathname = usePathname() || '';
  const [sample, setSample] = useState(false);
  const onPage = PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (!onPage) return undefined;
    let cancelled = false;
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
      if (cached && Date.now() - cached.at < TTL_MS) {
        setSample(Boolean(cached.sample));
        return undefined;
      }
    } catch {
      /* storage unavailable */
    }
    fetch('/api/market-data/sample-status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { sample: false }))
      .then((j) => {
        if (cancelled) return;
        setSample(Boolean(j.sample));
        try {
          window.sessionStorage.setItem(
            KEY,
            JSON.stringify({ at: Date.now(), sample: Boolean(j.sample) }),
          );
        } catch {
          /* storage unavailable */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onPage, pathname]);

  if (!onPage || !sample) return null;
  return (
    <div className="market-sample-banner" role="status">
      <i className="bi bi-info-circle" aria-hidden="true" />
      <span>
        <strong>Sample data.</strong> Live market data is temporarily unavailable, so prices, charts
        and company figures on this page are illustrative sample values, not market or reported
        data.
      </span>
    </div>
  );
}

export default MarketSampleBanner;
