'use client';

import { useMemo, useState } from 'react';
import {
  NA,
  areaPath,
  fmtDays,
  fmtInt,
  fmtMoney,
  fmtPct,
  fmtRatio,
  fmtSignedPct,
  linePaths,
  monthlyGrid,
  tone,
  tradesCsv,
} from './lab-format';
import { RunRiskSection } from './RunRiskSection';

const W = 960;
const H_EQUITY = 260;
const H_DD = 110;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LEDGER_PAGE = 50;

const EXIT_REASONS = {
  exit_rule: 'Exit rule',
  stop_loss: 'Stop loss',
  trailing_stop: 'Trailing stop',
  take_profit: 'Take profit',
  time: 'Max hold',
  open_at_end: 'Open at end of test',
};

function Stat({ label, value, hint, toneClass = '' }) {
  return (
    <div className="ql-stat">
      <dt className="ql-label">{label}</dt>
      <dd className={`ql-stat-value ${toneClass}`}>{value}</dd>
      {hint && <dd className="ql-stat-hint">{hint}</dd>}
    </div>
  );
}

/* One shared empty list, so a run without a curve keeps the memos stable. */
const NO_POINTS = [];

export function BacktestReport({ run }) {
  const m = run.metrics || {};
  const results = run.results || {};
  const curve = results.curve || NO_POINTS;
  const drawdown = results.drawdown || NO_POINTS;
  const trades = results.trades || [];
  const coverage = run.data_coverage || {};
  const [page, setPage] = useState(0);

  const equity = useMemo(() => {
    const strategy = curve.map((p) => p.equity);
    const bench = curve.map((p) => (typeof p.benchmark === 'number' ? p.benchmark : null));
    const { paths, min, max } = linePaths([strategy, bench], W, H_EQUITY);
    return {
      strategyPath: paths[0],
      benchPath: paths[1],
      min,
      max,
      hasBench: bench.some((v) => v !== null),
    };
  }, [curve]);

  const dd = useMemo(() => {
    const series = drawdown.map((p) => p.drawdown);
    const min = Math.min(0, ...series.filter((v) => typeof v === 'number'));
    const lo = min === 0 ? -0.01 : min;
    return { area: areaPath(series, W, H_DD, 0, lo, 0), min };
  }, [drawdown]);

  const grid = useMemo(() => monthlyGrid(results.monthly), [results.monthly]);
  const pages = Math.max(1, Math.ceil(trades.length / LEDGER_PAGE));
  const shown = trades.slice(page * LEDGER_PAGE, (page + 1) * LEDGER_PAGE);

  const download = () => {
    const blob = new Blob([tradesCsv(trades)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-${run.id}-trades.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const first = curve[0];
  const last = curve[curve.length - 1];

  return (
    <div className="ql-report">
      <div className="ql-report-head">
        <div>
          <h3 className="ql-report-title">Backtest results</h3>
          <p className="ql-hint">
            {m.startDate} to {m.endDate} · {fmtInt(m.observations)} sessions · strategy version{' '}
            {results.version ?? NA} · benchmark {results.benchmark ?? NA}
          </p>
        </div>
        <span className="ql-tag">Historical simulation</span>
      </div>

      {(run.warnings || []).length > 0 && (
        <ul className="ql-warnings">
          {run.warnings.map((w) => (
            <li key={w}>
              <i className="bi bi-exclamation-triangle" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}

      <dl className="ql-stats">
        <Stat
          label="Total return"
          value={fmtSignedPct(m.totalReturn)}
          toneClass={tone(m.totalReturn)}
          hint={`Benchmark ${fmtSignedPct(m.benchmarkReturn)}`}
        />
        <Stat
          label="Annualised return"
          value={fmtSignedPct(m.cagr)}
          toneClass={tone(m.cagr)}
          hint="Compound, calendar days"
        />
        <Stat label="Volatility" value={fmtPct(m.volatility)} hint="Annualised, 252 sessions" />
        <Stat
          label="Sharpe"
          value={fmtRatio(m.sharpe)}
          hint={`Risk-free ${fmtPct(m.riskFreeRate)}`}
        />
        <Stat label="Sortino" value={fmtRatio(m.sortino)} hint="Downside deviation" />
        <Stat
          label="Max drawdown"
          value={fmtPct(m.maxDrawdown)}
          toneClass={m.maxDrawdown < 0 ? 'negative' : ''}
          hint={`Longest ${fmtDays(m.longestDrawdownDays)}`}
        />
        <Stat label="Calmar" value={fmtRatio(m.calmar)} hint="Annual return over max drawdown" />
        <Stat
          label="Beta"
          value={fmtRatio(m.beta)}
          hint={`Correlation ${fmtRatio(m.correlation)}`}
        />
        <Stat
          label="Alpha"
          value={fmtSignedPct(m.alpha)}
          toneClass={tone(m.alpha)}
          hint="Jensen, annualised"
        />
        <Stat
          label="Daily VaR 95%"
          value={fmtPct(m.valueAtRisk95)}
          hint={`Expected shortfall ${fmtPct(m.expectedShortfall95)}`}
        />
        <Stat
          label="Closed trades"
          value={fmtInt(m.closedTrades)}
          hint={`Win rate ${fmtPct(m.winRate, 1)}`}
        />
        <Stat
          label="Profit factor"
          value={fmtRatio(m.profitFactor)}
          hint={`Expectancy ${fmtMoney(m.expectancy)}`}
        />
        <Stat
          label="Average hold"
          value={fmtDays(m.averageHoldDays)}
          hint={`Turnover ${fmtRatio(m.turnover)}x a year`}
        />
        <Stat
          label="Average exposure"
          value={fmtPct(m.averageGrossExposure, 1)}
          hint={`Peak ${fmtPct(m.maxGrossExposure, 1)}`}
        />
        <Stat
          label="Total costs"
          value={fmtMoney(m.totalCosts)}
          hint={`${fmtPct(m.costDrag)} of starting capital`}
        />
        <Stat
          label="Ending equity"
          value={fmtMoney(m.endEquity)}
          hint={`From ${fmtMoney(m.startEquity)}`}
        />
      </dl>

      <figure className="ql-chart">
        <figcaption className="ql-chart-cap">
          <span className="ql-eyebrow">Equity curve</span>
          <span className="ql-legend">
            <span className="ql-key ql-key--strategy" /> Strategy
            {equity.hasBench && (
              <>
                <span className="ql-key ql-key--bench" /> {results.benchmark} buy and hold
              </>
            )}
          </span>
        </figcaption>
        <svg
          viewBox={`0 0 ${W} ${H_EQUITY}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Strategy equity from ${fmtMoney(first?.equity)} on ${first?.date} to ${fmtMoney(last?.equity)} on ${last?.date}`}
        >
          {equity.hasBench && <path d={equity.benchPath} className="ql-line ql-line--bench" />}
          <path d={equity.strategyPath} className="ql-line ql-line--strategy" />
        </svg>
        <div className="ql-axis">
          <span>
            {first?.date} · low {fmtMoney(equity.min)}
          </span>
          <span>
            high {fmtMoney(equity.max)} · {last?.date}
          </span>
        </div>
      </figure>

      <figure className="ql-chart">
        <figcaption className="ql-chart-cap">
          <span className="ql-eyebrow">Drawdown</span>
          <span className="ql-legend">
            Deepest {fmtPct(dd.min)} ·{' '}
            {m.maxDrawdownRecoveryDays === null || m.maxDrawdownRecoveryDays === undefined
              ? 'not recovered in this window'
              : `recovered in ${fmtDays(m.maxDrawdownRecoveryDays)}`}
          </span>
        </figcaption>
        <svg
          viewBox={`0 0 ${W} ${H_DD}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Drawdown from peak, deepest ${fmtPct(dd.min)}`}
        >
          <path d={dd.area} className="ql-area ql-area--dd" />
        </svg>
      </figure>

      {grid.length > 0 && (
        <div className="ql-section">
          <h4 className="ql-eyebrow">Monthly returns</h4>
          <div className="ql-table-wrap">
            <table className="ql-table ql-table--months">
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  {MONTHS.map((mo) => (
                    <th key={mo} scope="col" className="ql-num">
                      {mo}
                    </th>
                  ))}
                  <th scope="col" className="ql-num">
                    Year
                  </th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row) => (
                  <tr key={row.year}>
                    <th scope="row">{row.year}</th>
                    {row.months.map((r, i) => (
                      <td key={MONTHS[i]} className={`ql-num ${tone(r)}`}>
                        {r === null ? '' : (r * 100).toFixed(1)}
                      </td>
                    ))}
                    <td className={`ql-num ql-strong ${tone(row.total)}`}>
                      {row.total === null ? '' : (row.total * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="ql-section">
        <div className="ql-section-head">
          <h4 className="ql-eyebrow">
            Trade ledger ({fmtInt(trades.length)}
            {m.openTrades ? `, ${m.openTrades} still open at the end` : ''})
          </h4>
          {trades.length > 0 && (
            <button type="button" className="ql-link" onClick={download}>
              <i className="bi bi-download" aria-hidden /> Export CSV
            </button>
          )}
        </div>
        {trades.length === 0 ? (
          <p className="ql-hint">
            The entry rules never fired in this window, so there is nothing to measure. Loosen the
            conditions or widen the dates.
          </p>
        ) : (
          <>
            <div className="ql-table-wrap">
              <table className="ql-table">
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col">Side</th>
                    <th scope="col" className="ql-num">
                      Shares
                    </th>
                    <th scope="col">Signal</th>
                    <th scope="col">Entry</th>
                    <th scope="col" className="ql-num">
                      Entry price
                    </th>
                    <th scope="col">Exit</th>
                    <th scope="col" className="ql-num">
                      Exit price
                    </th>
                    <th scope="col" className="ql-num">
                      Days
                    </th>
                    <th scope="col" className="ql-num">
                      P&amp;L
                    </th>
                    <th scope="col" className="ql-num">
                      Return
                    </th>
                    <th scope="col" className="ql-num">
                      Costs
                    </th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t, i) => (
                    <tr key={`${t.ticker}-${t.entryDate}-${i}`}>
                      <th scope="row">{t.ticker}</th>
                      <td>{t.side}</td>
                      <td className="ql-num">{fmtInt(t.shares)}</td>
                      <td>{t.signalDate}</td>
                      <td>{t.entryDate}</td>
                      <td className="ql-num">{fmtMoney(t.entryPrice, 2)}</td>
                      <td>{t.open ? 'open' : t.exitDate}</td>
                      <td className="ql-num">{fmtMoney(t.exitPrice, 2)}</td>
                      <td className="ql-num">{fmtInt(t.holdDays)}</td>
                      <td className={`ql-num ${tone(t.pnl)}`}>{fmtMoney(t.pnl, 2)}</td>
                      <td className={`ql-num ${tone(t.pnlPct)}`}>{fmtSignedPct(t.pnlPct)}</td>
                      <td className="ql-num">{fmtMoney(t.costs, 2)}</td>
                      <td>{EXIT_REASONS[t.exitReason] || t.exitReason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="ql-pager">
                <button
                  type="button"
                  className="ql-link"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="ql-hint">
                  Page {page + 1} of {pages}
                </span>
                <button
                  type="button"
                  className="ql-link"
                  disabled={page >= pages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <RunRiskSection results={results} />

      <div className="ql-two">
        <div className="ql-section">
          <h4 className="ql-eyebrow">Costs charged</h4>
          <dl className="ql-kv">
            <dt>Commissions</dt>
            <dd>{fmtMoney(results.costs?.commissions, 2)}</dd>
            <dt>Slippage</dt>
            <dd>{fmtMoney(results.costs?.slippage, 2)}</dd>
            <dt>Short borrow</dt>
            <dd>{fmtMoney(results.costs?.borrow, 2)}</dd>
            <dt>Total</dt>
            <dd>{fmtMoney(results.costs?.total, 2)}</dd>
          </dl>
          <h4 className="ql-eyebrow ql-eyebrow--spaced">Data used</h4>
          <dl className="ql-kv">
            {Object.entries(coverage).map(([t, c]) => (
              <div key={t} className="ql-kv-row">
                <dt>{t}</dt>
                <dd>
                  {c.bars
                    ? `${fmtInt(c.bars)} sessions, ${c.first} to ${c.last}`
                    : 'no price history'}
                  {c.missingSessions ? `, ${c.missingSessions} missing` : ''}
                </dd>
              </div>
            ))}
          </dl>
          <p className="ql-hint">
            Engine {run.engine_version}. Run {run.id}.
          </p>
        </div>
        <div className="ql-section">
          <h4 className="ql-eyebrow">Assumptions behind these numbers</h4>
          <ul className="ql-plain">
            {(results.assumptions || []).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BacktestReport;
