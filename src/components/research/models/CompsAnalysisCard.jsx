'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import './comps-analysis-card.css';

const MULTIPLE_COLS = [
  { key: 'pe', label: 'P/E', fmt: (v) => v?.toFixed(1) ?? '–' },
  { key: 'evRevenue', label: 'EV/Rev', fmt: (v) => v?.toFixed(1) ?? '–' },
  { key: 'evEbitda', label: 'EV/EBITDA', fmt: (v) => v?.toFixed(1) ?? '–' },
  { key: 'pb', label: 'P/B', fmt: (v) => v?.toFixed(1) ?? '–' },
  { key: 'divYield', label: 'Div Yield', fmt: (v) => (v != null ? `${v.toFixed(1)}%` : '–') },
  { key: 'grossMargin', label: 'Gross Mgn', fmt: (v) => (v != null ? `${v.toFixed(1)}%` : '–') },
  { key: 'revenueGrowth', label: 'Rev Growth', fmt: (v) => (v != null ? `${v.toFixed(1)}%` : '–') },
];

/* Target-row cell class: discount sits below the peer 25th percentile,
   premium above the 75th. Colour is paired with an arrow and hidden text. */
function posColor(pos) {
  if (pos === 'discount') return 'is-discount';
  if (pos === 'premium') return 'is-premium';
  return '';
}

function verdictConfig(v) {
  return (
    {
      undervalued: { icon: 'bi-graph-up-arrow', tone: 'pos', label: 'Undervalued' },
      overvalued: { icon: 'bi-graph-down-arrow', tone: 'neg', label: 'Overvalued' },
      fairly_valued: { icon: 'bi-dash-lg', tone: 'mid', label: 'Fairly Valued' },
      insufficient_data: { icon: 'bi-dash-lg', tone: 'flat', label: 'Insufficient Data' },
    }[v] || { icon: 'bi-dash-lg', tone: 'flat', label: v }
  );
}

function computeRankScore(p) {
  let score = 0;
  let count = 0;
  if (p.grossMargin != null) {
    score += p.grossMargin;
    count++;
  }
  if (p.revenueGrowth != null) {
    score += p.revenueGrowth;
    count++;
  }
  if (p.divYield != null) {
    score += p.divYield * 2;
    count++;
  }
  if (p.pe != null && p.pe > 0) {
    score += 100 / p.pe;
    count++;
  }
  if (p.evEbitda != null && p.evEbitda > 0) {
    score += 50 / p.evEbitda;
    count++;
  }
  if (p.evRevenue != null && p.evRevenue > 0) {
    score += 20 / p.evRevenue;
    count++;
  }
  if (p.marketCap != null) {
    score += Math.log10(Math.max(p.marketCap, 1)) * 0.5;
    count++;
  }
  return count > 0 ? score / count : 0;
}

function SortIcon({ sortKey, activeKey, direction }) {
  if (sortKey !== activeKey)
    return <i className="bi bi-chevron-expand cmp-sort-icon is-idle" aria-hidden="true" />;
  if (direction === 'asc')
    return <i className="bi bi-chevron-up cmp-sort-icon" aria-hidden="true" />;
  return <i className="bi bi-chevron-down cmp-sort-icon" aria-hidden="true" />;
}

export function CompsAnalysisCard({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/comps/${encodeURIComponent(symbol)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setError(json.error || `Request failed (${res.status})`);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else {
        setSortKey(null);
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedPeers = useMemo(() => {
    if (!data?.peers) return [];
    if (!sortKey) return data.peers;
    const peers = [...data.peers];
    peers.sort((a, b) => {
      let va;
      let vb;
      if (sortKey === 'ranking') {
        va = computeRankScore(a);
        vb = computeRankScore(b);
      } else if (sortKey === 'marketCap') {
        va = a.marketCap ?? 0;
        vb = b.marketCap ?? 0;
      } else {
        va = a[sortKey] ?? -Infinity;
        vb = b[sortKey] ?? -Infinity;
      }
      if (va === -Infinity && vb === -Infinity) return 0;
      if (va === -Infinity) return 1;
      if (vb === -Infinity) return -1;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return peers;
  }, [data?.peers, sortKey, sortDir]);

  if (!symbol) {
    return (
      <CompsState
        title="No ticker selected"
        text="Choose a company to benchmark it against its peers."
        onClose={onClose}
      />
    );
  }

  if (loading) return <CompsLoading />;

  if (error) {
    /* Presentation only: the API guard answers 429 with "Too many requests". */
    const isRateLimited = /too many requests|\(429\)/i.test(String(error));
    return (
      <CompsState
        tone={isRateLimited ? 'warn' : 'error'}
        title={isRateLimited ? 'Rate limit reached' : 'Comparable analysis unavailable'}
        text={error}
        onRetry={load}
        onClose={onClose}
      />
    );
  }

  if (!data) {
    return (
      <CompsState
        title={`No comparable analysis for ${symbol}`}
        text="The peer data came back empty. Try again in a moment."
        onRetry={load}
        onClose={onClose}
      />
    );
  }

  const { target, peerStats, positions, valuation, verdict } = data;
  const peers = sortedPeers;
  const vc = verdictConfig(verdict.verdict);

  const stripVars = [
    { label: 'Price', value: target.price != null ? `$${target.price.toFixed(2)}` : '–' },
    { label: 'Mkt Cap', value: target.marketCapFormatted || '–' },
    { label: 'P/E', value: target.pe?.toFixed(1) ?? '–' },
    { label: 'EV/EBITDA', value: target.evEbitda?.toFixed(1) ?? '–' },
    { label: 'Peers', value: `${peers.length}` },
    {
      label: 'vs. Peers',
      value:
        valuation.premiumDiscount != null
          ? `${valuation.premiumDiscount > 0 ? '+' : ''}${valuation.premiumDiscount.toFixed(1)}%`
          : '–',
    },
  ];

  const ariaSort = (key) =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <section className="cmp" aria-labelledby="cmp-title">
      <header className="cmp-head">
        <div className="cmp-head-id">
          <span className="cmp-icon" aria-hidden="true">
            <i className="bi bi-bar-chart-line" />
          </span>
          <div className="cmp-head-text">
            <h3 id="cmp-title" className="cmp-title">
              Comparable Company Analysis
            </h3>
            <p className="cmp-desc">
              Peer benchmarking · {symbol} · {target.sector || 'N/A'} · {peers.length} peers
            </p>
          </div>
        </div>
        <div className="cmp-head-actions">
          <div className={`cmp-badge is-${vc.tone}`}>
            <i className={`bi ${vc.icon}`} aria-hidden="true" />
            <span className="cmp-badge-text">
              <span className="cmp-badge-label">{vc.label}</span>
              <span className="cmp-badge-sub">vs. peer median</span>
            </span>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="cmp-btn">
              <i className="bi bi-x-lg" aria-hidden="true" /> Close
            </button>
          )}
        </div>
      </header>

      <ModelVariableStrip variables={stripVars} className="cmp-strip" />

      <div className="cmp-table-block">
        <div className="cmp-table-wrap">
          <table className="cmp-table">
            <thead>
              <tr>
                <th
                  scope="col"
                  className={sortKey === 'ranking' ? 'is-active' : undefined}
                  aria-sort={ariaSort('ranking')}
                >
                  <button type="button" className="cmp-sort" onClick={() => handleSort('ranking')}>
                    Company Ranking
                    <SortIcon sortKey="ranking" activeKey={sortKey} direction={sortDir} />
                  </button>
                </th>
                <th
                  scope="col"
                  className={sortKey === 'marketCap' ? 'is-active' : undefined}
                  aria-sort={ariaSort('marketCap')}
                >
                  <button
                    type="button"
                    className="cmp-sort"
                    onClick={() => handleSort('marketCap')}
                  >
                    Mkt Cap
                    <SortIcon sortKey="marketCap" activeKey={sortKey} direction={sortDir} />
                  </button>
                </th>
                {MULTIPLE_COLS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={sortKey === c.key ? 'is-active' : undefined}
                    aria-sort={ariaSort(c.key)}
                  >
                    <button type="button" className="cmp-sort" onClick={() => handleSort(c.key)}>
                      {c.label}
                      <SortIcon sortKey={c.key} activeKey={sortKey} direction={sortDir} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="cmp-row cmp-row--target">
                <td>
                  <span className="cmp-sym">{target.symbol}</span>
                  <span className="cmp-tag">Target</span>
                </td>
                <td>{target.marketCapFormatted}</td>
                {MULTIPLE_COLS.map((c) => {
                  const pos = positions[c.key]?.position;
                  return (
                    <td key={c.key} className={posColor(pos) || undefined}>
                      {pos === 'discount' && (
                        <i className="bi bi-arrow-down-short cmp-pos-icon" aria-hidden="true" />
                      )}
                      {pos === 'premium' && (
                        <i className="bi bi-arrow-up-short cmp-pos-icon" aria-hidden="true" />
                      )}
                      {c.fmt(target[c.key])}
                      {(pos === 'discount' || pos === 'premium') && (
                        <span className="cmp-vh"> ({pos} to peers)</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {peers.map((p, idx) => (
                <tr key={p.symbol} className="cmp-row">
                  <td>
                    <span className="cmp-rank">{idx + 1}.</span>
                    <span className="cmp-sym">{p.symbol}</span>
                    <span className="cmp-peer-name">{p.name}</span>
                  </td>
                  <td>{p.marketCapFormatted}</td>
                  {MULTIPLE_COLS.map((c) => (
                    <td key={c.key}>{c.fmt(p[c.key])}</td>
                  ))}
                </tr>
              ))}

              <tr className="cmp-row cmp-row--median">
                <td>Peer Median</td>
                <td />
                {MULTIPLE_COLS.map((c) => (
                  <td key={c.key}>{c.fmt(peerStats[c.key]?.median)}</td>
                ))}
              </tr>
              <tr className="cmp-row cmp-row--range">
                <td>25th – 75th pctl</td>
                <td />
                {MULTIPLE_COLS.map((c) => {
                  const s = peerStats[c.key];
                  return (
                    <td key={c.key}>
                      {s?.p25 != null ? `${c.fmt(s.p25)} – ${c.fmt(s.p75)}` : '–'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="cmp-legend" aria-label="Target row legend">
          <li className="is-discount">
            <i className="bi bi-arrow-down-short" aria-hidden="true" /> Discount: below peer 25th
            pctl
          </li>
          <li className="is-premium">
            <i className="bi bi-arrow-up-short" aria-hidden="true" /> Premium: above peer 75th pctl
          </li>
        </ul>
      </div>

      {valuation.methods.length > 0 && (
        <div className="cmp-implied">
          <h4 className="cmp-block-title">Implied Valuation (Peer-Median Multiples)</h4>
          <ul className="cmp-implied-strip">
            {valuation.methods.map((m) => {
              const diff = target.price
                ? ((m.impliedPrice - target.price) / target.price) * 100
                : 0;
              const isUp = diff > 0;
              return (
                <li key={m.method} className="cmp-implied-cell">
                  <span className="cmp-implied-label">{m.method}</span>
                  <span className="cmp-implied-price">${m.impliedPrice.toFixed(2)}</span>
                  <span className={`cmp-implied-diff ${isUp ? 'is-up' : 'is-down'}`}>
                    <i
                      className={`bi ${isUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`}
                      aria-hidden="true"
                    />
                    {isUp ? '+' : ''}
                    {diff.toFixed(1)}% vs current
                  </span>
                </li>
              );
            })}
          </ul>
          {valuation.avgImpliedPrice && (
            <p className="cmp-implied-avg">
              Average implied price:{' '}
              <span className="cmp-implied-avg-value">${valuation.avgImpliedPrice.toFixed(2)}</span>
              <span className="cmp-implied-avg-delta">
                ({valuation.premiumDiscount > 0 ? '+' : ''}
                {valuation.premiumDiscount?.toFixed(1)}%{' '}
                {valuation.premiumDiscount > 0 ? 'premium' : 'discount'} to current)
              </span>
            </p>
          )}
        </div>
      )}

      <details className="cmp-method">
        <summary>
          <i className="bi bi-info-circle" aria-hidden="true" /> How this works
        </summary>
        <p>
          Peers are selected by FMP&apos;s peer-matching algorithm (sector, size, business model).
          Multiples are TTM (trailing twelve months). Implied valuation applies peer-median
          multiples to {symbol}
          &apos;s financials. Click any column header to sort peers. Company Ranking sorts by a
          composite score based on margins, growth, and valuation efficiency.
        </p>
      </details>
    </section>
  );
}

function CompsLoading() {
  return (
    <section className="cmp" aria-busy="true" aria-label="Loading comparable company analysis">
      <div className="cmp-skel cmp-skel--title" />
      <div className="cmp-skel cmp-skel--strip" />
      <div className="cmp-skel cmp-skel--table" />
    </section>
  );
}

function CompsState({ title, text, tone, onRetry, onClose }) {
  return (
    <section
      className={`cmp cmp--state${tone ? ` is-${tone}` : ''}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {onClose && (
        <div className="cmp-state-actions">
          <button type="button" onClick={onClose} className="cmp-btn">
            <i className="bi bi-x-lg" aria-hidden="true" /> Close
          </button>
        </div>
      )}
      <p className="cmp-state-title">{title}</p>
      <p className="cmp-state-text">{text}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="cmp-btn">
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Retry
        </button>
      )}
    </section>
  );
}

export default CompsAnalysisCard;
