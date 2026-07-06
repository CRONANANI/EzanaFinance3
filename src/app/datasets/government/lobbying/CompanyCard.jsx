'use client';

/**
 * Company Card — the public-company drill-down for the lobbying "Public
 * corporations" table. Opens as a modal (mirrors FilingModal's backdrop/ESC
 * pattern). Shows the live quote, a lightweight price sparkline (reusing
 * /api/market-data/stock-candles), and this company's largest lobbying filings
 * (each opening the existing FilingModal via onOpenFiling). Gold accents for the
 * public/ticker identity, emerald for the lobbying section. NO mock data.
 */
import { useEffect, useMemo, useState } from 'react';
import { X, ArrowUpRight, ExternalLink } from 'lucide-react';

function fmtSpend(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${Math.round(n / 1e6).toLocaleString()}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function useJson(url) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    setState({ loading: true, data: null });
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState({ loading: false, data: d }))
      .catch(() => alive && setState({ loading: false, data: null }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

/* inline SVG sparkline from a daily-close series; emerald up / red down */
function Sparkline({ closes }) {
  const path = useMemo(() => {
    const pts = (closes || []).filter((n) => Number.isFinite(n));
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const W = 100;
    const H = 28;
    const step = W / (pts.length - 1);
    const d = pts
      .map(
        (v, i) =>
          `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${(H - ((v - min) / span) * H).toFixed(2)}`,
      )
      .join(' ');
    return { d, up: pts[pts.length - 1] >= pts[0] };
  }, [closes]);
  if (!path) return <div className="lbx-cc-spark lbx-cc-spark--empty" aria-hidden />;
  return (
    <svg
      className={`lbx-cc-spark ${path.up ? 'up' : 'down'}`}
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={path.d} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function CompanyCard({
  ticker,
  companyLabel,
  clientName,
  exchange,
  onClose,
  onOpenFiling,
}) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const quote = useJson(
    ticker ? `/api/market-data/quotes?symbols=${encodeURIComponent(ticker)}` : null,
  );
  const candles = useJson(
    ticker ? `/api/market-data/stock-candles?symbol=${encodeURIComponent(ticker)}&range=3M` : null,
  );
  const filings = useJson(
    clientName
      ? `/api/lobbying/filings?client=${encodeURIComponent(clientName)}&sort=amount&pageSize=10`
      : null,
  );

  const q = quote.data?.quotes?.[ticker] || null;
  const closes = (candles.data?.candles || []).map((c) => Number(c.close));
  const rows = filings.data?.results || [];
  const up = q ? (q.change ?? 0) >= 0 : true;

  return (
    <div className="lbx-modal-backdrop" onClick={onClose}>
      <div
        className="lbx-modal lbx-cc"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${companyLabel || ticker} company card`}
      >
        <button type="button" className="lbx-modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* header */}
        <div className="lbx-cc-head">
          <div>
            <h3 className="lbx-cc-name">{companyLabel || clientName || ticker}</h3>
            <div className="lbx-cc-tags">
              <span className="lbx-tickpill lbx-mono">{ticker}</span>
              {exchange ? <span className="lbx-cc-exch">{exchange}</span> : null}
            </div>
          </div>
          <div className="lbx-cc-quote">
            {quote.loading ? (
              <span className="lbx-muted lbx-mono">Loading…</span>
            ) : q ? (
              <>
                <span className="lbx-cc-price lbx-mono">${q.price}</span>
                <span className={`lbx-chg ${up ? 'up' : 'down'} lbx-mono`}>
                  {up ? '+' : ''}
                  {q.change}%
                </span>
              </>
            ) : (
              <span className="lbx-muted lbx-mono">Price unavailable</span>
            )}
          </div>
        </div>

        {/* sparkline */}
        <div className="lbx-cc-chart">
          {candles.loading ? (
            <div className="lbx-cc-spark lbx-cc-spark--empty" aria-hidden />
          ) : (
            <Sparkline closes={closes} />
          )}
          <span className="lbx-cc-chart-label">3-month price</span>
        </div>

        {/* this company's lobbying */}
        <div className="lbx-cc-sec">This company&apos;s lobbying · largest filings</div>
        {filings.loading ? (
          <p className="lbx-modal-muted">Loading filings…</p>
        ) : rows.length ? (
          <ul className="lbx-cc-filings">
            {rows.map((f, i) => (
              <li key={f.uuid || i}>
                <button
                  type="button"
                  className="lbx-cc-frow"
                  onClick={() => onOpenFiling?.(f.uuid)}
                >
                  <span className="lbx-cc-fmeta">
                    <span className="lbx-cc-freg">{f.registrant || '—'}</span>
                    <span className="lbx-muted">
                      {f.period || '—'}
                      {(f.issues || []).length
                        ? ` · ${(f.issues || [])
                            .slice(0, 2)
                            .map((is) => is.display || is.code)
                            .join(', ')}`
                        : ''}
                    </span>
                  </span>
                  <span className="lbx-cc-famt lbx-mono">
                    {f.amount != null && f.amount > 0 ? fmtSpend(f.amount) : '—'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lbx-modal-muted">
            No disclosed lobbying on file for {companyLabel || clientName}.
          </p>
        )}

        <div className="lbx-modal-foot">
          <span>
            <ExternalLink size={11} /> Lobbying: Senate LDA · lda.gov · Quote: market data
          </span>
          <a
            className="lbx-cc-more"
            href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ticker} on Yahoo Finance <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
