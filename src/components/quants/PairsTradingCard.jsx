'use client';

import { useMemo, useState } from 'react';
import {
  fmtDays,
  fmtInt,
  fmtMoney,
  fmtPct,
  fmtRatio,
  fmtSignedPct,
  linePaths,
  tone,
} from './lab/lab-format';

const W = 460;
const H = 130;

const SIGNALS = {
  long_spread: (r) => `Spread is unusually low. The pairs trade is long ${r.y}, short ${r.x}.`,
  short_spread: (r) => `Spread is unusually high. The pairs trade is short ${r.y}, long ${r.x}.`,
  watch: () => 'Spread is stretched but has not reached the usual entry level of 2.',
  inside: () => 'Spread is inside its normal range. Nothing to do.',
  none: () => 'No signal: this pair did not pass the test, so a wide gap means nothing.',
};

const EXIT_REASONS = { reverted: 'Reverted', stop: 'Stop', open_at_end: 'Still open' };

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Something went wrong. Try again.');
  return json;
}

const verdict = (confidence) =>
  confidence ? `Cointegrated at ${confidence}% confidence` : 'Not cointegrated';

function Stat({ label, value, hint, toneClass = '' }) {
  return (
    <div className="ql-stat">
      <dt className="ql-label">{label}</dt>
      <dd className={`ql-stat-value ${toneClass}`}>{value}</dd>
      {hint && <dd className="ql-stat-hint">{hint}</dd>}
    </div>
  );
}

export function PairBacktest({ bt }) {
  const m = bt.metrics;
  const charts = useMemo(() => {
    const z = bt.zSeries.map((p) => p.z);
    const flat = (v) => z.map(() => v);
    const zPaths = linePaths([z, flat(bt.params.entryZ), flat(-bt.params.entryZ), flat(0)], W, H);
    const eq = linePaths([bt.curve.map((p) => p.equity)], W, H);
    return { z: zPaths.paths, equity: eq.paths[0], eqMin: eq.min, eqMax: eq.max };
  }, [bt]);

  return (
    <div className="ql-section">
      <h4 className="ql-eyebrow">
        Backtest: {bt.y} against {bt.x}
      </h4>
      <p className="ql-hint">
        Formed on {bt.formation.from} to {bt.formation.to} ({verdict(bt.formation.confidence)},
        hedge ratio {fmtRatio(bt.formation.hedgeRatio)}). Traded on {bt.trading.from} to{' '}
        {bt.trading.to}, which chose nothing.
      </p>

      {bt.warnings.length > 0 && (
        <ul className="ql-warnings">
          {bt.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <dl className="ql-stats qr-stats">
        <Stat
          label="Total return"
          value={fmtSignedPct(m.totalReturn)}
          toneClass={tone(m.totalReturn)}
          hint={`Annualised ${fmtSignedPct(m.cagr)}`}
        />
        <Stat
          label="Sharpe"
          value={fmtRatio(m.sharpe)}
          hint={`Volatility ${fmtPct(m.volatility, 1)}`}
        />
        <Stat
          label="Max drawdown"
          value={fmtPct(m.maxDrawdown)}
          toneClass={m.maxDrawdown < 0 ? 'negative' : ''}
        />
        <Stat
          label="Round trips"
          value={fmtInt(m.closedTrades)}
          hint={`Win rate ${fmtPct(m.winRate, 0)}`}
        />
        <Stat label="Average hold" value={fmtDays(m.averageHoldDays)} />
        <Stat
          label="Costs"
          value={fmtMoney(bt.costs.total)}
          hint={`Borrow ${fmtMoney(bt.costs.borrow)}`}
        />
      </dl>

      <div className="qr-pair">
        <figure className="ql-chart qr-mini">
          <figcaption className="ql-chart-cap">
            <span className="ql-eyebrow">Spread z-score</span>
            <span className="ql-legend">Dashed: entry at {bt.params.entryZ} and zero</span>
          </figcaption>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Z-score of the spread over the trading period, with entry levels at plus and minus ${bt.params.entryZ}`}
          >
            <path d={charts.z[1]} className="ql-line ql-line--bench" />
            <path d={charts.z[2]} className="ql-line ql-line--bench" />
            <path d={charts.z[3]} className="ql-line ql-line--bench" />
            <path d={charts.z[0]} className="ql-line ql-line--strategy" />
          </svg>
        </figure>
        <figure className="ql-chart qr-mini">
          <figcaption className="ql-chart-cap">
            <span className="ql-eyebrow">Equity</span>
            <span className="ql-legend">
              {fmtMoney(charts.eqMin)} to {fmtMoney(charts.eqMax)}
            </span>
          </figcaption>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`Account equity over the trading period, ending at ${fmtMoney(m.endEquity)}`}
          >
            <path d={charts.equity} className="ql-line ql-line--strategy" />
          </svg>
        </figure>
      </div>
      <div className="ql-axis">
        <span>{bt.trading.from}</span>
        <span>{bt.trading.to}</span>
      </div>

      {bt.trades.length > 0 && (
        <div className="ql-table-wrap">
          <table className="ql-table">
            <thead>
              <tr>
                <th scope="col">Entry</th>
                <th scope="col">Trade</th>
                <th scope="col" className="ql-num">
                  Entry z
                </th>
                <th scope="col">Exit</th>
                <th scope="col" className="ql-num">
                  Days
                </th>
                <th scope="col" className="ql-num">
                  P&amp;L
                </th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {bt.trades.slice(-12).map((t) => (
                <tr key={t.entryDate}>
                  <td>{t.entryDate}</td>
                  <td>{t.direction === 'long_spread' ? `Long ${bt.y}` : `Short ${bt.y}`}</td>
                  <td className="ql-num">{fmtRatio(t.entryZ)}</td>
                  <td>{t.exitDate || 'open'}</td>
                  <td className="ql-num">{fmtInt(t.holdDays)}</td>
                  <td className={`ql-num ${tone(t.pnl)}`}>{fmtMoney(t.pnl)}</td>
                  <td>{EXIT_REASONS[t.exitReason] || t.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {bt.trades.length > 12 && (
        <p className="ql-hint">
          Showing the last 12 of {bt.trades.length} trades. All of them are in the figures above.
        </p>
      )}
      <details className="ql-details">
        <summary>Assumptions behind these numbers</summary>
        <ul className="ql-plain">
          {bt.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function PairsTradingCard() {
  const [tickerA, setTickerA] = useState('KO');
  const [tickerB, setTickerB] = useState('PEP');
  const [entryZ, setEntryZ] = useState(2);
  const [exitZ, setExitZ] = useState(0.5);
  const [stopZ, setStopZ] = useState(4);
  const [years, setYears] = useState(4);
  const [data, setData] = useState(null);
  const [bt, setBt] = useState(null);
  const [busy, setBusy] = useState(''); // '' | 'test' | 'backtest'
  const [error, setError] = useState('');

  const pair = { tickerA: tickerA.trim().toUpperCase(), tickerB: tickerB.trim().toUpperCase() };
  const ready = pair.tickerA && pair.tickerB && pair.tickerA !== pair.tickerB;

  const analyze = async () => {
    if (!ready) return;
    setBusy('test');
    setError('');
    setBt(null);
    try {
      setData(await post('/api/quants/pairs', pair));
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const backtest = async () => {
    if (!ready) return;
    setBusy('backtest');
    setError('');
    try {
      setBt(
        await post('/api/quants/pairs/backtest', {
          ...pair,
          years,
          params: { entryZ: Number(entryZ), exitZ: Number(exitZ), stopZ: Number(stopZ) },
        }),
      );
    } catch (err) {
      setBt(null);
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3 className="ftq-section-title">
          <i className="bi bi-arrow-left-right" aria-hidden /> Pairs and Cointegration
        </h3>
      </div>
      <div className="ftq-card-body-pad">
        <div className="ql-root qr-card">
          <p className="ql-hint">
            Two stocks can be highly correlated and still drift apart for good. A pairs trade only
            makes sense when the gap between them reliably closes, which is what the cointegration
            test checks.
          </p>
          <div className="ql-row ql-row--tight">
            <label className="ql-field">
              <span className="ql-label">First ticker</span>
              <input
                className="ql-input ql-input--short"
                type="text"
                maxLength={10}
                value={tickerA}
                onChange={(e) => setTickerA(e.target.value.toUpperCase())}
              />
            </label>
            <label className="ql-field">
              <span className="ql-label">Second ticker</span>
              <input
                className="ql-input ql-input--short"
                type="text"
                maxLength={10}
                value={tickerB}
                onChange={(e) => setTickerB(e.target.value.toUpperCase())}
              />
            </label>
            <button
              type="button"
              className="ql-btn ql-btn--primary"
              disabled={!ready || !!busy}
              onClick={analyze}
            >
              {busy === 'test' ? 'Testing' : 'Test pair'}
            </button>
          </div>

          {error && (
            <div className="ql-errors" role="alert">
              <p>{error}</p>
            </div>
          )}

          {data && (
            <>
              <dl className="ql-stats qr-stats">
                <Stat
                  label="Verdict"
                  value={data.confidence ? `${data.confidence}%` : 'No'}
                  toneClass={data.confidence ? 'positive' : ''}
                  hint={verdict(data.confidence)}
                />
                <Stat
                  label="Test statistic"
                  value={fmtRatio(data.statistic)}
                  hint={`Needs below ${fmtRatio(data.critical[5])} for 95%`}
                />
                <Stat
                  label="Hedge ratio"
                  value={fmtRatio(data.hedgeRatio)}
                  hint={`${data.x} per unit of ${data.y}, by value`}
                />
                <Stat
                  label="Half-life"
                  value={fmtDays(data.halfLife)}
                  hint="Sessions to close half the gap"
                />
                <Stat
                  label="Spread z-score"
                  value={fmtRatio(data.zScore)}
                  hint="Now, against this window"
                />
                <Stat
                  label="Return correlation"
                  value={fmtRatio(data.correlation)}
                  hint="Shown for contrast only"
                />
              </dl>
              <p className="ql-hint">
                {(SIGNALS[data.signal] || SIGNALS.none)(data)} Measured on{' '}
                {fmtInt(data.observations)} shared sessions, {data.from} to {data.to}.
              </p>
              {data.notes.length > 0 && (
                <ul className="ql-warnings">
                  {data.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}

              <div className="ql-row ql-row--tight">
                <label className="ql-field">
                  <span className="ql-label">Enter at z</span>
                  <input
                    className="ql-input ql-input--num"
                    type="number"
                    min={0.5}
                    max={5}
                    step="any"
                    value={entryZ}
                    onChange={(e) => setEntryZ(e.target.value)}
                  />
                </label>
                <label className="ql-field">
                  <span className="ql-label">Exit at z</span>
                  <input
                    className="ql-input ql-input--num"
                    type="number"
                    min={0}
                    max={3}
                    step="any"
                    value={exitZ}
                    onChange={(e) => setExitZ(e.target.value)}
                  />
                </label>
                <label className="ql-field">
                  <span className="ql-label">Stop at z</span>
                  <input
                    className="ql-input ql-input--num"
                    type="number"
                    min={1}
                    max={10}
                    step="any"
                    value={stopZ}
                    onChange={(e) => setStopZ(e.target.value)}
                  />
                </label>
                <label className="ql-field">
                  <span className="ql-label">History</span>
                  <select
                    className="ql-input"
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                  >
                    {[2, 4, 6, 10].map((y) => (
                      <option key={y} value={y}>
                        {y} years
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="ql-btn"
                  disabled={!ready || !!busy}
                  onClick={backtest}
                >
                  {busy === 'backtest' ? 'Running backtest' : 'Backtest this pair'}
                </button>
              </div>
            </>
          )}

          {bt && <PairBacktest bt={bt} />}

          <p className="ql-hint">
            For educational and informational purposes only. Not financial advice. Past performance
            does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PairsTradingCard;
