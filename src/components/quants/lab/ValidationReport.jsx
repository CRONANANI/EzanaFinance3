'use client';

import { useMemo } from 'react';
import {
  NA,
  fmtInt,
  fmtMoney,
  fmtPct,
  fmtRatio,
  fmtSignedPct,
  linePaths,
  tone,
} from './lab-format';

const W = 960;
const H = 220;

const OBJECTIVE_KEYS = { sharpe: 'sharpe', cagr: 'cagr', calmar: 'calmar' };
const OBJECTIVE_LABELS = { sharpe: 'Sharpe', cagr: 'annualised return', calmar: 'Calmar' };

function Stat({ label, value, hint, toneClass = '' }) {
  return (
    <div className="ql-stat">
      <dt className="ql-label">{label}</dt>
      <dd className={`ql-stat-value ${toneClass}`}>{value}</dd>
      {hint && <dd className="ql-stat-hint">{hint}</dd>}
    </div>
  );
}

const SPLIT_ROWS = [
  ['Period', (s) => `${s.startDate} to ${s.endDate}`, null],
  ['Sessions', (s) => fmtInt(s.observations), null],
  ['Total return', (s) => fmtSignedPct(s.totalReturn), (s) => s.totalReturn],
  ['Annualised return', (s) => fmtSignedPct(s.cagr), (s) => s.cagr],
  ['Benchmark return', (s) => fmtSignedPct(s.benchmarkReturn), null],
  ['Volatility', (s) => fmtPct(s.volatility), null],
  ['Sharpe', (s) => fmtRatio(s.sharpe), null],
  ['Sortino', (s) => fmtRatio(s.sortino), null],
  ['Max drawdown', (s) => fmtPct(s.maxDrawdown), null],
  ['Closed trades', (s) => fmtInt(s.closedTrades), null],
  ['Win rate', (s) => fmtPct(s.winRate, 1), null],
  ['Profit factor', (s) => fmtRatio(s.profitFactor), null],
];

export function ValidationReport({ validation }) {
  const r = validation.results || {};
  const { split, costSensitivity = [], sweep, walkForward: wf } = r;
  const labels = r.axisLabels || {};

  const describe = (params) =>
    params
      ? Object.entries(params)
          .map(([path, v]) => `${labels[path] || path} = ${v}`)
          .join('; ')
      : 'As saved';

  const chart = useMemo(() => {
    const curve = wf?.curve || [];
    const equity = curve.map((p) => p.equity);
    const bench = curve.map((p) => (typeof p.benchmark === 'number' ? p.benchmark : null));
    const { paths } = linePaths([equity, bench], W, H);
    return { strategy: paths[0], bench: paths[1], hasBench: bench.some((v) => v !== null), curve };
  }, [wf]);

  const sweepRows = useMemo(() => {
    if (!sweep) return [];
    const key = OBJECTIVE_KEYS[sweep.objective] || 'sharpe';
    return sweep.rows
      .map((row, index) => ({ ...row, index }))
      .sort((a, b) => (b.is?.[key] ?? -Infinity) - (a.is?.[key] ?? -Infinity));
  }, [sweep]);

  if (!split || !wf) return null;
  const first = chart.curve[0];
  const last = chart.curve[chart.curve.length - 1];

  return (
    <div className="ql-report">
      <div className="ql-report-head">
        <div>
          <h3 className="ql-report-title">Validation report</h3>
          <p className="ql-hint">
            Strategy version {r.version ?? NA} · {validation.config?.startDate} to{' '}
            {validation.config?.endDate} · {fmtInt(r.engineRuns)} simulations
          </p>
        </div>
        <span className="ql-tag">Historical simulation</span>
      </div>

      {(validation.warnings || []).length > 0 && (
        <ul className="ql-warnings">
          {validation.warnings.map((w) => (
            <li key={w}>
              <i className="bi bi-exclamation-triangle" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}

      {/* ── Split ── */}
      <div className="ql-section">
        <h4 className="ql-eyebrow">In sample against out of sample</h4>
        <p className="ql-hint">
          The strategy exactly as saved, measured on the first {split.splitPct}% of the window and
          then on the rest. A result that only holds in the first part was probably fitted to it.
        </p>
        <div className="ql-table-wrap">
          <table className="ql-table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col" className="ql-num">
                  In sample
                </th>
                <th scope="col" className="ql-num">
                  Out of sample
                </th>
                <th scope="col" className="ql-num">
                  Full window
                </th>
              </tr>
            </thead>
            <tbody>
              {SPLIT_ROWS.map(([label, format, signed]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {[split.inSample, split.outOfSample, split.full].map((s, i) => (
                    <td key={i} className={`ql-num ${signed ? tone(signed(s)) : ''}`}>
                      {format(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Walk-forward ── */}
      <div className="ql-section">
        <h4 className="ql-eyebrow">Walk-forward ({wf.mode})</h4>
        <p className="ql-hint">
          {wf.reselected
            ? 'In each fold the parameters are chosen on the training period only, then applied to the test period that follows. The figures below are from test periods alone.'
            : 'The strategy as saved, run on each test period in turn. No parameters are being tested, so this shows how stable the result is from one period to the next.'}
        </p>
        <dl className="ql-stats">
          <Stat
            label="Test-period return"
            value={fmtSignedPct(wf.combined?.totalReturn)}
            toneClass={tone(wf.combined?.totalReturn)}
            hint={`Benchmark ${fmtSignedPct(wf.combined?.benchmarkReturn)}`}
          />
          <Stat
            label="Annualised"
            value={fmtSignedPct(wf.combined?.cagr)}
            toneClass={tone(wf.combined?.cagr)}
          />
          <Stat label="Sharpe" value={fmtRatio(wf.combined?.sharpe)} />
          <Stat
            label="Max drawdown"
            value={fmtPct(wf.combined?.maxDrawdown)}
            toneClass={wf.combined?.maxDrawdown < 0 ? 'negative' : ''}
          />
          <Stat
            label="Profitable folds"
            value={`${wf.profitableFolds} of ${wf.testedFolds}`}
            hint={`${fmtInt(wf.combined?.closedTrades)} trades`}
          />
          <Stat
            label="Efficiency"
            value={fmtPct(wf.efficiency, 0)}
            hint="Test return as a share of training return"
          />
        </dl>

        {chart.curve.length > 1 && (
          <figure className="ql-chart">
            <figcaption className="ql-chart-cap">
              <span className="ql-eyebrow">Test periods joined end to end</span>
              <span className="ql-legend">
                <span className="ql-key ql-key--strategy" /> Strategy
                {chart.hasBench && (
                  <>
                    <span className="ql-key ql-key--bench" /> {r.benchmark} buy and hold
                  </>
                )}
              </span>
            </figcaption>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Growth of 1 across the test periods, ${first.date} to ${last.date}, ending at ${fmtRatio(last.equity)}`}
            >
              {chart.hasBench && <path d={chart.bench} className="ql-line ql-line--bench" />}
              <path d={chart.strategy} className="ql-line ql-line--strategy" />
            </svg>
            <div className="ql-axis">
              <span>{first.date} · starts at 1.00</span>
              <span>
                ends at {fmtRatio(last.equity)} · {last.date}
              </span>
            </div>
          </figure>
        )}

        <div className="ql-table-wrap">
          <table className="ql-table">
            <thead>
              <tr>
                <th scope="col">Fold</th>
                <th scope="col">Trained on</th>
                <th scope="col">Tested on</th>
                <th scope="col">Parameters used</th>
                <th scope="col" className="ql-num">
                  Train Sharpe
                </th>
                <th scope="col" className="ql-num">
                  Test Sharpe
                </th>
                <th scope="col" className="ql-num">
                  Test return
                </th>
                <th scope="col" className="ql-num">
                  Test trades
                </th>
              </tr>
            </thead>
            <tbody>
              {wf.folds.map((f, i) => (
                <tr key={f.testStart}>
                  <th scope="row">{i + 1}</th>
                  <td>
                    {f.trainStart} to {f.trainEnd}
                  </td>
                  <td>
                    {f.testStart} to {f.testEnd}
                  </td>
                  <td className="ql-wrap">{describe(f.params)}</td>
                  <td className="ql-num">{fmtRatio(f.train?.sharpe)}</td>
                  <td className="ql-num">{fmtRatio(f.test?.sharpe)}</td>
                  <td className={`ql-num ${tone(f.test?.totalReturn)}`}>
                    {fmtSignedPct(f.test?.totalReturn)}
                  </td>
                  <td className="ql-num">{fmtInt(f.test?.closedTrades)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sweep ── */}
      {sweep && (
        <div className="ql-section">
          <h4 className="ql-eyebrow">Parameter sweep ({sweep.combinations} combinations)</h4>
          <p className="ql-hint">
            Each combination is fitted on the in-sample period and scored on the out-of-sample
            period. The selection is made on in-sample {OBJECTIVE_LABELS[sweep.objective]} only.
          </p>
          <dl className="ql-stats">
            <Stat
              label="Skill probability"
              value={fmtPct(sweep.deflatedSharpe, 0)}
              hint="Deflated Sharpe of the selection. 95% is the usual bar"
            />
            <Stat
              label="Luck hurdle"
              value={fmtRatio(sweep.luckHurdleSharpe)}
              hint="Sharpe the best of this many random tries would show"
            />
            <Stat
              label="Rank carry-over"
              value={fmtRatio(sweep.rankCorrelation)}
              hint="1 means the in-sample order held out of sample; 0 means it did not"
            />
            <Stat
              label="Profitable out of sample"
              value={fmtPct(sweep.profitableOutOfSample, 0)}
              hint="Share of all combinations"
            />
          </dl>
          <div className="ql-table-wrap">
            <table className="ql-table">
              <thead>
                <tr>
                  <th scope="col">Parameters</th>
                  <th scope="col" className="ql-num">
                    In-sample Sharpe
                  </th>
                  <th scope="col" className="ql-num">
                    In-sample return
                  </th>
                  <th scope="col" className="ql-num">
                    Trades
                  </th>
                  <th scope="col" className="ql-num">
                    Out-of-sample Sharpe
                  </th>
                  <th scope="col" className="ql-num">
                    Out-of-sample return
                  </th>
                  <th scope="col" className="ql-num">
                    Trades
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {sweepRows.map((row) => (
                  <tr key={row.index} className={row.index === sweep.bestIndex ? 'is-active' : ''}>
                    <th scope="row" className="ql-wrap">
                      {describe(row.params)}
                    </th>
                    <td className="ql-num">{fmtRatio(row.is?.sharpe)}</td>
                    <td className={`ql-num ${tone(row.is?.totalReturn)}`}>
                      {fmtSignedPct(row.is?.totalReturn)}
                    </td>
                    <td className="ql-num">{fmtInt(row.is?.closedTrades)}</td>
                    <td className="ql-num">{fmtRatio(row.oos?.sharpe)}</td>
                    <td className={`ql-num ${tone(row.oos?.totalReturn)}`}>
                      {fmtSignedPct(row.oos?.totalReturn)}
                    </td>
                    <td className="ql-num">{fmtInt(row.oos?.closedTrades)}</td>
                    <td>
                      {row.index === sweep.bestIndex
                        ? 'Selected'
                        : !row.valid
                          ? 'Invalid values'
                          : !row.eligible
                            ? 'Too few trades'
                            : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Costs ── */}
      <div className="ql-section">
        <h4 className="ql-eyebrow">Sensitivity to trading costs</h4>
        <p className="ql-hint">
          The full window re-run with slippage and commission scaled. Real fills are usually worse
          than assumed, so a strategy should survive at least double its expected costs.
        </p>
        <div className="ql-table-wrap">
          <table className="ql-table">
            <thead>
              <tr>
                <th scope="col">Costs</th>
                <th scope="col" className="ql-num">
                  Total return
                </th>
                <th scope="col" className="ql-num">
                  Annualised
                </th>
                <th scope="col" className="ql-num">
                  Sharpe
                </th>
                <th scope="col" className="ql-num">
                  Max drawdown
                </th>
                <th scope="col" className="ql-num">
                  Costs paid
                </th>
              </tr>
            </thead>
            <tbody>
              {costSensitivity.map((c) => (
                <tr key={c.multiple} className={c.multiple === 1 ? 'is-active' : ''}>
                  <th scope="row">
                    {c.multiple === 0
                      ? 'None'
                      : c.multiple === 1
                        ? 'As set'
                        : `${c.multiple} times`}
                  </th>
                  <td className={`ql-num ${tone(c.totalReturn)}`}>{fmtSignedPct(c.totalReturn)}</td>
                  <td className={`ql-num ${tone(c.cagr)}`}>{fmtSignedPct(c.cagr)}</td>
                  <td className="ql-num">{fmtRatio(c.sharpe)}</td>
                  <td className="ql-num">{fmtPct(c.maxDrawdown)}</td>
                  <td className="ql-num">{fmtMoney(c.totalCosts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="ql-hint">
        Engine {validation.engine_version}, validation {validation.validation_version}. Report{' '}
        {validation.id}.
      </p>
    </div>
  );
}

export default ValidationReport;
