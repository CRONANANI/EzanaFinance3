'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTickerPopup } from './TickerPopupContext';
import './ticker-popup.css';

/* StockPriceChart pulls in Recharts and only renders inside this popup, which
   opens on ticker interaction. Defer it (ssr:false, default export) so Recharts
   loads on first popup open; reserved height matches .lc-ticker-popup-chart. */
const StockPriceChart = dynamic(() => import('@/components/research/StockPriceChart'), {
  ssr: false,
  loading: () => <div aria-hidden style={{ height: 180, width: '100%' }} />,
});

export function TickerPopup() {
  const { activeTicker, anchorElement, closeTicker } = useTickerPopup();
  const [isVisible, setIsVisible] = useState(false);
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!anchorElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rect = entry.boundingClientRect;
        if (!entry.isIntersecting && rect.bottom < 0) {
          closeTicker();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -40% 0px' },
    );
    observer.observe(anchorElement);
    return () => observer.disconnect();
  }, [anchorElement, closeTicker]);

  useEffect(() => {
    if (activeTicker) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [activeTicker]);

  useEffect(() => {
    if (!activeTicker) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeTicker();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeTicker, closeTicker]);

  useEffect(() => {
    if (!activeTicker) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    setLoadingMeta(true);
    fetch(`/api/learning/ticker-snapshot?symbol=${encodeURIComponent(activeTicker)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setMeta(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTicker]);

  if (!activeTicker) return null;

  return (
    <aside
      className={`lc-ticker-popup ${isVisible ? 'is-visible' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="lc-ticker-popup-title"
    >
      <button
        type="button"
        className="lc-ticker-popup-close"
        onClick={closeTicker}
        aria-label="Close ticker"
      >
        <i className="bi bi-x-lg" />
      </button>

      <div className="lc-ticker-popup-eyebrow">Ticker · YTD</div>

      <div className="lc-ticker-popup-head">
        <h3 className="lc-ticker-popup-title" id="lc-ticker-popup-title">
          {meta?.name || activeTicker}
        </h3>
        <span className="lc-ticker-popup-symbol">{activeTicker}</span>
      </div>

      {meta?.price != null && (
        <div className="lc-ticker-popup-price-row">
          <span className="lc-ticker-popup-price">
            ${Number(meta.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          {meta.ytdChangePct != null && (
            <span
              className={`lc-ticker-popup-change ${meta.ytdChangePct >= 0 ? 'is-positive' : 'is-negative'}`}
            >
              {meta.ytdChangePct >= 0 ? '▲' : '▼'} {Math.abs(meta.ytdChangePct).toFixed(2)}% YTD
            </span>
          )}
        </div>
      )}

      <div className="lc-ticker-popup-chart">
        <StockPriceChart symbol={activeTicker} initialRange="1Y" compact hideRangeButtons />
      </div>

      {meta?.sector && (
        <div className="lc-ticker-popup-meta">
          <div className="lc-ticker-popup-meta-row">
            <span className="lc-ticker-popup-meta-label">Sector</span>
            <span className="lc-ticker-popup-meta-value">{meta.sector}</span>
          </div>
          {meta.industry && (
            <div className="lc-ticker-popup-meta-row">
              <span className="lc-ticker-popup-meta-label">Industry</span>
              <span className="lc-ticker-popup-meta-value">{meta.industry}</span>
            </div>
          )}
          {meta.marketCap && (
            <div className="lc-ticker-popup-meta-row">
              <span className="lc-ticker-popup-meta-label">Market cap</span>
              <span className="lc-ticker-popup-meta-value">{meta.marketCap}</span>
            </div>
          )}
        </div>
      )}

      <Link
        href={`/research/${activeTicker}`}
        className="lc-ticker-popup-research-link"
        onClick={closeTicker}
      >
        <div className="lc-ticker-popup-research-icon">
          <i className="bi bi-graph-up" />
        </div>
        <div className="lc-ticker-popup-research-text">
          <div className="lc-ticker-popup-research-eyebrow">Research</div>
          <div className="lc-ticker-popup-research-title">View full {activeTicker} research</div>
        </div>
        <i className="bi bi-arrow-right lc-ticker-popup-research-arrow" />
      </Link>

      {loadingMeta && !meta && (
        <div className="lc-ticker-popup-loading">Loading {activeTicker}…</div>
      )}
    </aside>
  );
}
