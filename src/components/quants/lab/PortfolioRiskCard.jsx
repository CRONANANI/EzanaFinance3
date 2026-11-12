'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmtInt, fmtMoney, fmtPct, fmtRatio } from './lab-format';

/**
 * Risk of the signed-in user's mock portfolio at today's weights. Sits in the
 * page's card row, so it brings its own .ql-root scope for the shared table
 * and stat styles.
 */
export function PortfolioRiskCard() {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch('/api/quants/portfolio-risk');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error('failed');
      setData(json);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          Portfolio Risk
        </h3>
      </div>
      <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
        <div className="ql-root qr-card">
          {state === 'loading' && <p className="ql-hint">Measuring your mock portfolio.</p>}
          {state === 'error' && (
            <p className="ql-hint">
              Portfolio risk could not be loaded.{' '}
              <button type="button" className="ql-link" onClick={load}>
                Retry
              </button>
            </p>
          )}
          {state === 'ready' && data?.empty && (
            <p className="ql-hint">
              {data.reason === 'no_positions'
                ? 'Your mock portfolio has no open positions. Place a mock trade and its risk will be measured here.'
                : 'There is not enough shared price history for your holdings to measure risk yet.'}
            </p>
          )}
          {state === 'ready' && data && !data.empty && (
            <>
              <p className="ql-hint">
                Your mock portfolio at today&apos;s weights, replayed over the last{' '}
                {fmtInt(data.observations)} sessions ({data.from} to {data.to}).
              </p>
              <dl className="ql-stats qr-stats">
                <div className="ql-stat">
                  <dt className="ql-label">Volatility</dt>
                  <dd className="ql-stat-value">{fmtPct(data.volatility, 1)}</dd>
                  <dd className="ql-stat-hint">Annualised</dd>
                </div>
                <div className="ql-stat">
                  <dt className="ql-label">Beta</dt>
                  <dd className="ql-stat-value">{fmtRatio(data.beta)}</dd>
                  <dd className="ql-stat-hint">
                    Against {data.benchmark}, correlation {fmtRatio(data.correlation)}
                  </dd>
                </div>
                <div className="ql-stat">
                  <dt className="ql-label">1-day VaR 95%</dt>
                  <dd className="ql-stat-value negative">{fmtMoney(data.valueAtRisk95Dollars)}</dd>
                  <dd className="ql-stat-hint">
                    {fmtPct(data.valueAtRisk95)} of {fmtMoney(data.totalValue)}
                  </dd>
                </div>
                <div className="ql-stat">
                  <dt className="ql-label">Effective holdings</dt>
                  <dd className="ql-stat-value">{fmtRatio(data.effectiveHoldings, 1)}</dd>
                  <dd className="ql-stat-hint">
                    From {data.holdings.length} positions, cash {fmtPct(data.cashWeight, 0)}
                  </dd>
                </div>
              </dl>

              <div className="ql-table-wrap">
                <table className="ql-table">
                  <thead>
                    <tr>
                      <th scope="col">Holding</th>
                      <th scope="col" className="ql-num">
                        Weight
                      </th>
                      <th scope="col" className="ql-num">
                        Volatility
                      </th>
                      <th scope="col" className="ql-num">
                        Beta
                      </th>
                      <th scope="col" className="ql-num">
                        Share of risk
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holdings.slice(0, 8).map((h) => (
                      <tr key={h.ticker}>
                        <th scope="row">{h.ticker}</th>
                        <td className="ql-num">{fmtPct(h.weight, 1)}</td>
                        <td className="ql-num">{fmtPct(h.volatility, 1)}</td>
                        <td className="ql-num">{fmtRatio(h.beta)}</td>
                        <td className="ql-num">
                          <span className="qr-share">
                            <span
                              className="qr-share-fill"
                              style={{
                                width: `${Math.min(Math.max((h.riskShare || 0) * 100, 0), 100)}%`,
                              }}
                            />
                          </span>
                          {fmtPct(h.riskShare, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.holdings.length > 8 && (
                <p className="ql-hint">
                  Showing the 8 largest of {data.holdings.length} holdings. All of them are in the
                  figures above.
                </p>
              )}
              {data.beyondCap?.length > 0 && (
                <p className="ql-hint">
                  Only the {data.holdings.length} largest positions are measured. Left out:{' '}
                  {data.beyondCap.join(', ')}.
                </p>
              )}

              {data.sectors?.length > 0 && (
                <div className="qr-sectors">
                  <h4 className="ql-eyebrow ql-eyebrow--spaced">Sector concentration</h4>
                  {data.sectors.map((s) => (
                    <div key={s.sector} className="qr-sector">
                      <span className="qr-sector-name">{s.sector}</span>
                      <span className="qr-sector-bar">
                        <span
                          className="qr-share-fill"
                          style={{ width: `${Math.min(Math.max(s.weight * 100, 0), 100)}%` }}
                        />
                      </span>
                      <span className="qr-sector-pct">{fmtPct(s.weight, 0)}</span>
                    </div>
                  ))}
                  <p className="ql-hint">Share of total portfolio value, cash included.</p>
                </div>
              )}

              {data.notes?.length > 0 && (
                <ul className="ql-warnings">
                  {data.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              <p className="ql-hint">
                Average correlation between holdings {fmtRatio(data.averageCorrelation)}. Worst
                single day in the window {fmtPct(data.worstDay)}. This replays past returns at
                current weights. It is not a forecast and not your account&apos;s own history.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortfolioRiskCard;
