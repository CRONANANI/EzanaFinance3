'use client';

/**
 * Card 7, Public Company Lens: the public companies that lobbied in the
 * period, with live price, day change and a six-month sparkline. Verified
 * mappings show a solid check; exact-name matches show the dashed badge.
 */
import { useEffect, useMemo, useState } from 'react';
import { mappingBadge, sparkPath } from '@/lib/lobbying/page-model';
import { fmtCount, fmtSignedPct, fmtSpend } from '@/lib/lobbying/page-format';
import { Card, MappingBadge, Skel, Tick } from './ui';

function useQuotes(tickers) {
  const key = tickers.join(',');
  const [quotes, setQuotes] = useState({});
  useEffect(() => {
    if (!key) return undefined;
    const ctrl = new AbortController();
    fetch(`/api/market-data/quotes?symbols=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.quotes && setQuotes(d.quotes))
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]);
  return quotes;
}

function useCloses(ticker) {
  const [closes, setCloses] = useState(null);
  useEffect(() => {
    if (!ticker) return undefined;
    const ctrl = new AbortController();
    fetch(`/api/market-data/stock-candles?symbol=${encodeURIComponent(ticker)}&range=6M`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setCloses((d?.candles || []).map((c) => Number(c.close)).filter(Number.isFinite)),
      )
      .catch(() => setCloses([]));
    return () => ctrl.abort();
  }, [ticker]);
  return closes;
}

function Tile({ c, quote, onOpen }) {
  const closes = useCloses(c.ticker);
  const change = quote?.change != null ? Number(quote.change) : null;
  const dir = change == null ? '' : change >= 0 ? ' is-up' : ' is-down';
  const path = closes && closes.length > 1 ? sparkPath(closes, 200, 26) : '';
  return (
    <button
      type="button"
      className="lbx-lens-tile lbx-tile"
      onClick={() => onOpen(c.ticker)}
      aria-label={`${c.company || c.ticker}, ${fmtSpend(c.spend)} disclosed lobbying spend. Open company detail.`}
    >
      <span className="lbx-lens-id">
        <Tick ticker={c.ticker} verified={c.verified} showBadge={false} />
        <span className="lbx-lens-name lbx-ellipsis" title={c.company}>
          {c.company || c.ticker}
        </span>
        <MappingBadge kind={mappingBadge(c)} />
      </span>
      <span className="lbx-lens-spend">
        <span className="lbx-mono lbx-lens-amt">{fmtSpend(c.spend)}</span>
        <span className="lbx-mono lbx-faint lbx-ellipsis">
          {fmtCount(c.filings)} filings{c.topIssue ? ` · ${c.topIssue}` : ''}
        </span>
      </span>
      <span className={`lbx-lens-spark${dir}`} aria-hidden="true">
        {closes == null ? (
          <Skel h={26} />
        ) : path ? (
          <svg viewBox="0 0 200 26" preserveAspectRatio="none" className="lbx-svg">
            <path className="lbx-spark" d={path} />
          </svg>
        ) : (
          <span className="lbx-faint lbx-mono">No price history</span>
        )}
      </span>
      <span className="lbx-lens-price">
        <span className="lbx-mono">{quote?.price != null ? `$${quote.price}` : '·'}</span>
        {change != null ? (
          <span className={`lbx-pill ${change >= 0 ? 'lbx-pill--pos' : 'lbx-pill--neg'}`}>
            {fmtSignedPct(change)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function LensCard({ view, sub, empty, onOpen }) {
  const list = useMemo(() => (Array.isArray(view.data) ? view.data : []), [view.data]);
  const quotes = useQuotes(useMemo(() => list.map((c) => c.ticker), [list]));
  const isEmpty = view.status === 'ready' && !list.length;
  return (
    <Card
      id="lbx-lens"
      title="Public company lens"
      sub={sub}
      right={
        <div className="lbx-badge-legend">
          <span>
            <MappingBadge kind="verified" /> Verified
          </span>
          <MappingBadge kind="name_match" />
        </div>
      }
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      skeleton={
        <div className="lbx-lens-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="lbx-tile">
              <Skel h={14} w="70%" />
              <Skel h={18} w="40%" style={{ marginTop: 12 }} />
              <Skel h={26} style={{ marginTop: 10 }} />
              <Skel h={14} w="50%" style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      }
      footer={
        <>
          <span>
            Select a company for its lobbying by quarter, largest filings and firms hired.
          </span>
          <span className="lbx-mono">Sparkline: 6 months · quotes delayed</span>
        </>
      }
    >
      <div className="lbx-lens-grid">
        {list.map((c) => (
          <Tile key={c.ticker} c={c} quote={quotes[c.ticker]} onOpen={onOpen} />
        ))}
      </div>
    </Card>
  );
}
