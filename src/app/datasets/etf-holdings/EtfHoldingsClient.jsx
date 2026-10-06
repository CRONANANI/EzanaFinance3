'use client';

/**
 * ETF Holdings from Form N-PORT: pick an ETF for its top holdings and its
 * asset-category and country mix; search which tracked ETFs hold a stock;
 * compare two ETFs' overlap (per shared security, the smaller weight).
 */
import { useEffect, useMemo, useState } from 'react';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { usd, int, pct, shortDate, OPENFIGI_NOTE, NOT_REPORTED } from '@/lib/titans/format';
import './etf-holdings.css';

function useJson(url) {
  const [s, setS] = useState({ status: url ? 'loading' : 'idle', data: null });
  useEffect(() => {
    if (!url) {
      setS({ status: 'idle', data: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setS({ status: 'loading', data: null });
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setS({ status: d?.ok ? 'ready' : 'error', data: d }))
      .catch(() => !ctrl.signal.aborted && setS({ status: 'error', data: null }));
    return () => ctrl.abort();
  }, [url]);
  return s;
}

function Bars({ items, label }) {
  if (!items?.length) return <p className="etfx-note">{NOT_REPORTED}</p>;
  const max = Math.max(...items.map((i) => i.pct || 0), 1);
  return (
    <ul className="etfx-bars" aria-label={label}>
      {items.map((i) => (
        <li key={i.key} className="etfx-bar-row">
          <span className="etfx-bar-label" title={i.label}>
            {i.label}
          </span>
          <span className="etfx-bar-track" aria-hidden="true">
            <span
              className="etfx-bar-fill"
              style={{ width: `${Math.max(1, ((i.pct || 0) / max) * 100)}%` }}
            />
          </span>
          <span className="etfx-mono">{pct(i.pct, 1)}</span>
        </li>
      ))}
    </ul>
  );
}

const Holding = ({ h }) =>
  h.ticker ? (
    <span className="etfx-ticker">{h.ticker}</span>
  ) : (
    <span className="etfx-muted">{h.name || 'Unmapped'}</span>
  );

function FundView({ seriesId }) {
  const s = useJson(seriesId ? `/api/titans/etf?series=${seriesId}` : null);
  const f = s.data?.fund;
  if (s.status === 'loading') return <div className="etfx-skel" aria-busy="true" />;
  if (s.status === 'error') return <p className="etfx-empty">Holdings could not be loaded.</p>;
  if (!f) return <p className="etfx-empty">No holdings loaded for this ETF yet.</p>;
  return (
    <div aria-live="polite">
      <dl className="etfx-stats" style={{ justifyContent: 'flex-start', margin: '4px 0 16px' }}>
        <div className="etfx-stat">
          <dt>Report date</dt>
          <dd>{shortDate(f.reportDate)}</dd>
        </div>
        <div className="etfx-stat">
          <dt>Net assets</dt>
          <dd>{usd(f.netAssets) || NOT_REPORTED}</dd>
        </div>
        <div className="etfx-stat">
          <dt>Holdings</dt>
          <dd>{int(f.holdingsCount)}</dd>
        </div>
      </dl>
      <div className="etfx-grid">
        <section className="etfx-card" aria-labelledby="etfx-top-h">
          <h3 id="etfx-top-h" className="etfx-card-title">
            Top 25 holdings
          </h3>
          <div className="etfx-table-wrap">
            <table className="etfx-table">
              <thead>
                <tr>
                  <th scope="col">Holding</th>
                  <th scope="col">Name</th>
                  <th scope="col" className="r">
                    Weight
                  </th>
                  <th scope="col" className="r">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {f.top.map((h, i) => (
                  <tr key={`${h.cusip || h.name}-${i}`}>
                    <td>
                      <Holding h={h} />
                    </td>
                    <td>{h.name}</td>
                    <td className="etfx-mono r">{pct(h.pct, 2) || NOT_REPORTED}</td>
                    <td className="etfx-mono r">{usd(h.value) || NOT_REPORTED}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="etfx-card" aria-labelledby="etfx-asset-h">
            <h3 id="etfx-asset-h" className="etfx-card-title">
              By asset category
            </h3>
            <Bars items={f.byAsset} label="Weight by asset category" />
          </section>
          <section className="etfx-card" aria-labelledby="etfx-country-h">
            <h3 id="etfx-country-h" className="etfx-card-title">
              By country
            </h3>
            <Bars items={f.byCountry} label="Weight by country" />
          </section>
        </div>
      </div>
    </div>
  );
}

function WhoHolds() {
  const [q, setQ] = useState('');
  const [ticker, setTicker] = useState('');
  const s = useJson(ticker ? `/api/titans/etf?holds=${encodeURIComponent(ticker)}` : null);
  const holders = s.data?.holders || [];
  return (
    <section className="etfx-section" aria-labelledby="etfx-who-h">
      <h2 id="etfx-who-h" className="etfx-section-title">
        Which ETFs hold this stock?
      </h2>
      <form
        className="etfx-controls"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setTicker(q.trim().toUpperCase());
        }}
      >
        <input
          className="etfx-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ticker, e.g. AAPL"
          aria-label="Ticker"
        />
        <button type="submit" className="etfx-btn">
          <i className="bi bi-search" aria-hidden="true" /> Find ETFs
        </button>
      </form>
      <div aria-live="polite">
        {s.status === 'loading' ? (
          <div className="etfx-skel" aria-busy="true" />
        ) : s.status === 'error' ? (
          <p className="etfx-empty">{s.data?.error || 'Search failed.'}</p>
        ) : s.status === 'ready' ? (
          holders.length ? (
            <div className="etfx-table-wrap">
              <table className="etfx-table">
                <thead>
                  <tr>
                    <th scope="col">ETF</th>
                    <th scope="col">Fund</th>
                    <th scope="col" className="r">
                      Weight
                    </th>
                    <th scope="col" className="r">
                      Value
                    </th>
                    <th scope="col">Report date</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.map((h) => (
                    <tr key={h.ticker}>
                      <td>
                        <span className="etfx-ticker">{h.ticker}</span>
                      </td>
                      <td>{h.fund}</td>
                      <td className="etfx-mono r">{pct(h.pct, 2)}</td>
                      <td className="etfx-mono r">{usd(h.value) || NOT_REPORTED}</td>
                      <td className="etfx-mono">{shortDate(h.reportDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="etfx-empty">No tracked ETF holds {ticker} in its latest N-PORT report.</p>
          )
        ) : null}
      </div>
    </section>
  );
}

function Overlap({ funds }) {
  const [a, setA] = useState(funds[0]?.seriesId || '');
  const [b, setB] = useState(funds[1]?.seriesId || '');
  const s = useJson(a && b && a !== b ? `/api/titans/etf?a=${a}&b=${b}` : null);
  const o = s.data?.overlap;
  const sel = (v, set, label) => (
    <select
      className="etfx-select"
      value={v}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
    >
      {funds.map((f) => (
        <option key={f.seriesId} value={f.seriesId}>
          {f.ticker}
        </option>
      ))}
    </select>
  );
  return (
    <section className="etfx-section" aria-labelledby="etfx-ov-h">
      <h2 id="etfx-ov-h" className="etfx-section-title">
        Overlap between two ETFs
      </h2>
      <p className="etfx-note">
        For each security both hold, the smaller of the two weights; summed.
      </p>
      <div className="etfx-controls">
        {sel(a, setA, 'First ETF')}
        <span className="etfx-muted">and</span>
        {sel(b, setB, 'Second ETF')}
      </div>
      <div aria-live="polite">
        {a === b ? (
          <p className="etfx-note">Pick two different ETFs.</p>
        ) : s.status === 'loading' ? (
          <div className="etfx-skel" aria-busy="true" />
        ) : s.status === 'error' || !o ? (
          s.status === 'idle' ? null : (
            <p className="etfx-empty">Overlap could not be computed.</p>
          )
        ) : (
          <>
            <p className="etfx-note">
              <span className="etfx-mono">{pct(o.overlapPct, 1)}</span> overlap across{' '}
              <span className="etfx-mono">{int(o.sharedCount)}</span> shared holdings.
            </p>
            {o.shared.length ? (
              <div className="etfx-table-wrap">
                <table className="etfx-table">
                  <thead>
                    <tr>
                      <th scope="col">Holding</th>
                      <th scope="col">Name</th>
                      <th scope="col" className="r">
                        {o.a} weight
                      </th>
                      <th scope="col" className="r">
                        {o.b} weight
                      </th>
                      <th scope="col" className="r">
                        Overlap
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.shared.slice(0, 25).map((h) => (
                      <tr key={h.key}>
                        <td>
                          <Holding h={h} />
                        </td>
                        <td>{h.name}</td>
                        <td className="etfx-mono r">{pct(h.weightA, 2)}</td>
                        <td className="etfx-mono r">{pct(h.weightB, 2)}</td>
                        <td className="etfx-mono r">{pct(h.overlap, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default function EtfHoldingsClient({ funds, notCovered }) {
  const [seriesId, setSeriesId] = useState(funds[0]?.seriesId || '');
  const tickerItems = useMemo(
    () =>
      funds.slice(0, 20).map((f) => ({
        id: f.seriesId,
        lead: f.ticker,
        main: f.name || f.ticker,
        value: usd(f.netAssets) || NOT_REPORTED,
      })),
    [funds],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Tracked ETFs by net assets' });

  return (
    <div className="etfx-page">
      <header className="etfx-header">
        <p className="etfx-eyebrow">DATASETS · TITANS SHADOW</p>
        <h1 className="etfx-title">ETF holdings</h1>
        <p className="etfx-sub">
          What the largest US-listed ETFs hold, which ETFs hold a given stock, and how much two ETFs
          overlap. N-PORT holdings are published about 60 days after each quarter ends.
        </p>
        <dl className="etfx-stats">
          <div className="etfx-stat">
            <dt>ETFs tracked</dt>
            <dd>{funds.length || '–'}</dd>
          </div>
        </dl>
      </header>

      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      {!funds.length ? (
        <p className="etfx-empty etfx-section">
          No ETF holdings loaded yet. They are read from Form N-PORT filings on SEC EDGAR daily.
        </p>
      ) : (
        <>
          <section className="etfx-section" aria-labelledby="etfx-pick-h">
            <h2 id="etfx-pick-h" className="etfx-section-title">
              Holdings
            </h2>
            <div className="etfx-controls">
              <select
                className="etfx-select"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                aria-label="Choose an ETF"
              >
                {funds.map((f) => (
                  <option key={f.seriesId} value={f.seriesId}>
                    {f.ticker}
                    {f.name ? ` · ${f.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <FundView seriesId={seriesId} />
          </section>
          <WhoHolds />
          {funds.length > 1 ? <Overlap funds={funds} /> : null}
        </>
      )}

      {notCovered?.length ? (
        <p className="etfx-note etfx-section">
          Not covered:{' '}
          {notCovered.map((n, i) => (
            <span key={n.ticker} title={n.reason}>
              <span className="etfx-mono">{n.ticker}</span> ({n.reason})
              {i < notCovered.length - 1 ? '; ' : ''}
            </span>
          ))}
        </p>
      ) : null}

      <footer className="etfx-foot">
        <p>Source: SEC EDGAR, Form N-PORT (public quarter-end reports).</p>
        <p>{OPENFIGI_NOTE}</p>
      </footer>
    </div>
  );
}
