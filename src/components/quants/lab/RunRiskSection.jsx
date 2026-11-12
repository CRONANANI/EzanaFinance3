'use client';

import { useMemo } from 'react';
import { runRisk } from '@/lib/quants/risk';
import {
  fmtDays,
  fmtInt,
  fmtMoney,
  fmtPct,
  fmtRatio,
  fmtSignedPct,
  linePaths,
  tone,
} from './lab-format';

const W = 460;
const H = 120;

function MiniChart({ title, series, format, label }) {
  const { path, min, max } = useMemo(() => {
    const { paths, min: lo, max: hi } = linePaths([series], W, H);
    return { path: paths[0], min: lo, max: hi };
  }, [series]);
  return (
    <figure className="ql-chart qr-mini">
      <figcaption className="ql-chart-cap">
        <span className="ql-eyebrow">{title}</span>
        <span className="ql-legend">
          {format(min)} to {format(max)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <path d={path} className="ql-line ql-line--strategy" />
      </svg>
    </figure>
  );
}

/**
 * How one stored run earned its result: computed in the browser from the
 * curve and ledger already on the run, so it needs no request of its own.
 */
export function RunRiskSection({ results }) {
  const risk = useMemo(() => runRisk(results), [results]);
  const d = risk.distribution;
  if (!d.observations) return null;
  const vol = risk.rolling.map((p) => p.volatility);
  const betas = risk.rolling.map((p) => p.beta);
  const hasBeta = betas.some((b) => typeof b === 'number');
  const firstRoll = risk.rolling[0]?.date;
  const lastRoll = risk.rolling[risk.rolling.length - 1]?.date;

  return (
    <div className="ql-section">
      <h4 className="ql-eyebrow">Risk detail</h4>
      <p className="ql-hint">
        How the result was earned: whether risk was steady, how bad the bad stretches were, and
        where the profit came from.
      </p>

      {risk.notes.length > 0 && (
        <ul className="ql-warnings">
          {risk.notes.map((n) => (
            <li key={n}>
              <i className="bi bi-exclamation-triangle" aria-hidden /> {n}
            </li>
          ))}
        </ul>
      )}

      <dl className="ql-stats">
        <div className="ql-stat">
          <dt className="ql-label">Up days</dt>
          <dd className="ql-stat-value">{fmtPct(d.positiveDays, 1)}</dd>
          <dd className="ql-stat-hint">Of {fmtInt(d.observations)} sessions</dd>
        </div>
        <div className="ql-stat">
          <dt className="ql-label">Skew</dt>
          <dd className="ql-stat-value">{fmtRatio(d.skew)}</dd>
          <dd className="ql-stat-hint">Below 0: losses run larger than gains</dd>
        </div>
        <div className="ql-stat">
          <dt className="ql-label">Kurtosis</dt>
          <dd className="ql-stat-value">{fmtRatio(d.kurtosis)}</dd>
          <dd className="ql-stat-hint">3 is a normal curve; higher is fatter tails</dd>
        </div>
        <div className="ql-stat">
          <dt className="ql-label">Daily VaR 99%</dt>
          <dd className="ql-stat-value">{fmtPct(d.valueAtRisk99)}</dd>
          <dd className="ql-stat-hint">Expected shortfall {fmtPct(d.expectedShortfall99)}</dd>
        </div>
        <div className="ql-stat">
          <dt className="ql-label">Time in market</dt>
          <dd className="ql-stat-value">{fmtPct(risk.exposure.timeInMarket, 0)}</dd>
          <dd className="ql-stat-hint">
            Average {fmtRatio(risk.exposure.averagePositions, 1)} positions
          </dd>
        </div>
      </dl>

      {risk.rolling.length > 1 && (
        <>
          <div className="qr-pair">
            <MiniChart
              title={`Rolling volatility (${risk.window} sessions)`}
              series={vol}
              format={(v) => fmtPct(v, 1)}
              label={`Annualised volatility over rolling ${risk.window} session windows, ${firstRoll} to ${lastRoll}`}
            />
            {hasBeta && (
              <MiniChart
                title={`Rolling beta (${risk.window} sessions)`}
                series={betas}
                format={(v) => fmtRatio(v)}
                label={`Beta to the benchmark over rolling ${risk.window} session windows, ${firstRoll} to ${lastRoll}`}
              />
            )}
          </div>
          <div className="ql-axis">
            <span>{firstRoll}</span>
            <span>{lastRoll}</span>
          </div>
        </>
      )}

      <div className="qr-pair">
        <div>
          <h4 className="ql-eyebrow ql-eyebrow--spaced">Deepest drawdowns</h4>
          {risk.episodes.length === 0 ? (
            <p className="ql-hint">Equity never fell below an earlier peak.</p>
          ) : (
            <div className="ql-table-wrap">
              <table className="ql-table">
                <thead>
                  <tr>
                    <th scope="col">Peak</th>
                    <th scope="col">Trough</th>
                    <th scope="col" className="ql-num">
                      Depth
                    </th>
                    <th scope="col" className="ql-num">
                      Fall
                    </th>
                    <th scope="col" className="ql-num">
                      Recovery
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {risk.episodes.map((e) => (
                    <tr key={e.peakDate}>
                      <td>{e.peakDate}</td>
                      <td>{e.troughDate}</td>
                      <td className="ql-num negative">{fmtPct(e.depth)}</td>
                      <td className="ql-num">{fmtDays(e.daysToTrough)}</td>
                      <td className="ql-num">
                        {e.daysToRecover === null ? 'not yet' : fmtDays(e.daysToRecover)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h4 className="ql-eyebrow ql-eyebrow--spaced">Worst and best days</h4>
          <div className="ql-table-wrap">
            <table className="ql-table">
              <thead>
                <tr>
                  <th scope="col">Worst</th>
                  <th scope="col" className="ql-num">
                    Return
                  </th>
                  <th scope="col">Best</th>
                  <th scope="col" className="ql-num">
                    Return
                  </th>
                </tr>
              </thead>
              <tbody>
                {risk.extremes.worst.map((w, i) => {
                  const b = risk.extremes.best[i];
                  return (
                    <tr key={w.date}>
                      <td>{w.date}</td>
                      <td className={`ql-num ${tone(w.return)}`}>{fmtSignedPct(w.return)}</td>
                      <td>{b?.date}</td>
                      <td className={`ql-num ${tone(b?.return)}`}>{fmtSignedPct(b?.return)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {risk.contributions.length > 0 && (
        <>
          <h4 className="ql-eyebrow ql-eyebrow--spaced">Where the profit came from</h4>
          <div className="ql-table-wrap">
            <table className="ql-table">
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  <th scope="col" className="ql-num">
                    Closed trades
                  </th>
                  <th scope="col" className="ql-num">
                    Win rate
                  </th>
                  <th scope="col" className="ql-num">
                    Average hold
                  </th>
                  <th scope="col" className="ql-num">
                    P&amp;L
                  </th>
                  <th scope="col" className="ql-num">
                    Added to return
                  </th>
                </tr>
              </thead>
              <tbody>
                {risk.contributions.slice(0, 10).map((c) => (
                  <tr key={c.ticker}>
                    <th scope="row">{c.ticker}</th>
                    <td className="ql-num">{fmtInt(c.trades)}</td>
                    <td className="ql-num">{fmtPct(c.winRate, 0)}</td>
                    <td className="ql-num">{fmtDays(c.averageHoldDays)}</td>
                    <td className={`ql-num ${tone(c.pnl)}`}>{fmtMoney(c.pnl)}</td>
                    <td className={`ql-num ${tone(c.contribution)}`}>
                      {fmtSignedPct(c.contribution)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default RunRiskSection;
