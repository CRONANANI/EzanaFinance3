'use client';

/**
 * Legislation markets — pairs tracked bills with live Polymarket political
 * markets (/api/congress/legislation-markets) and shows our transparent
 * structural model probability beside the market-implied probability, with the
 * informational edge between them.
 *
 * COMPLIANCE: informational market analysis ONLY — "model estimate vs
 * market-implied", never a bet recommendation or stake sizing. Honest empty
 * state; no mock data.
 */
import { useEffect, useState } from 'react';
import { BillStageChip } from './chips';

function pct(v) {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

export function LegislationMarketsSection({
  title = 'Legislation markets',
  intro = 'Where a tracked bill lines up with a live prediction market, we show our transparent structural passage estimate beside the market-implied probability. Informational only — not investment or betting advice.',
  limit = 6,
}) {
  const [state, setState] = useState({ loading: true, pairs: [], disclaimer: '' });

  useEffect(() => {
    let alive = true;
    fetch('/api/congress/legislation-markets')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setState({
          loading: false,
          pairs: Array.isArray(d?.pairs) ? d.pairs : [],
          disclaimer: d?.disclaimer || '',
        });
      })
      .catch(() => alive && setState({ loading: false, pairs: [], disclaimer: '' }));
    return () => {
      alive = false;
    };
  }, []);

  const { loading, pairs, disclaimer } = state;
  const top = pairs.slice(0, limit);

  return (
    <section className="congress-surface mkt-card" aria-label={title}>
      <div className="congress-surface-head">
        <h2 className="congress-surface-title">{title}</h2>
        <span className="congress-surface-badge">Model vs market</span>
      </div>
      <p className="congress-surface-intro">{intro}</p>

      {loading ? (
        <p className="congress-surface-empty">Loading legislation markets…</p>
      ) : !top.length ? (
        <p className="congress-surface-empty">
          No bill-to-market matches right now — pairs appear here when a tracked bill lines up with
          an active political prediction market.
        </p>
      ) : (
        <ul className="congress-legmarket-list">
          {top.map((p) => (
            <li key={p.billId} className="congress-legmarket-row">
              <div className="congress-legmarket-main">
                <span className="congress-legmarket-bill">
                  {String(p.type || '').toUpperCase()} {p.number} · {p.billTitle}
                </span>
                <span className="congress-legmarket-market">{p.market?.question}</span>
                {p.stage ? <BillStageChip stage={p.stage} size="sm" /> : null}
              </div>
              <div className="congress-legmarket-nums">
                <span className="congress-legmarket-num">
                  <span className="congress-legmarket-num-label">Model</span>
                  <span className="congress-legmarket-num-val">{pct(p.model)}</span>
                </span>
                <span className="congress-legmarket-num">
                  <span className="congress-legmarket-num-label">Market</span>
                  <span className="congress-legmarket-num-val">{pct(p.implied)}</span>
                </span>
                <span
                  className={`congress-legmarket-edge ${
                    (p.edge ?? 0) > 0 ? 'is-pos' : (p.edge ?? 0) < 0 ? 'is-neg' : ''
                  }`}
                >
                  {p.edge == null ? '—' : `${p.edge > 0 ? '+' : ''}${Math.round(p.edge * 100)} pts`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {disclaimer ? <p className="congress-surface-method">{disclaimer}</p> : null}
    </section>
  );
}
