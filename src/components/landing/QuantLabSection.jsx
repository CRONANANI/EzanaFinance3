'use client';

/*
 * Quant Lab landing section: "From a Sentence to a Portfolio".
 * Built from the Claude Design handoff (design F, Sentence to Portfolio).
 *
 * The strategy shown uses only rules the Quant Lab engine runs today
 * (src/lib/quants/strategy-spec.js): close above an SMA, a congress purchase
 * disclosure within N days (60 is the engine's ceiling), equal weight across
 * a maximum number of positions, and an exit rule. Keep it that way: if the
 * copy here changes, check it against the engine first.
 *
 * Every figure is illustrative sample data defined in this file. The return
 * series are seeded walks (no Math.random), so server and client render the
 * same picture and every visitor sees the same one.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './quant-lab-section.css';

const STEP_MS = 2800;
const CUTOFF = 36; // where price equals its 200-day average, percent of plot width
const HOLD = 4; // maximum open positions
const COMMISSION_BPS = 10;
const SLIPPAGE_BPS = 5;
const DAILY_COST = 0.00007; // illustrative cost drag per trading day

const STEPS = [
  {
    name: 'Universe',
    note: 'Start from a list of up to 20 tickers. Survivorship note: this is today’s list. Delisted companies are missing, and the report says so.',
  },
  {
    name: 'Signal',
    note: 'Keep names closing above their 200-day moving average. Signals are read on the close and orders fill at the next open.',
  },
  {
    name: 'Filter',
    note: 'Keep only names where a member of Congress disclosed a purchase in the last 60 days, dated by disclosure: when it became public, not when it happened.',
  },
  {
    name: 'Hold',
    note: 'The first four names to signal are held at equal weight, in whole shares, checked against cash. Later signals are turned away at the position limit.',
  },
  {
    name: 'Costs',
    note: `${COMMISSION_BPS} bps commission plus ${SLIPPAGE_BPS} bps slippage, charged on every fill.`,
  },
  {
    name: 'Result',
    note: 'Equity is marked at every close with the benchmark beside it. Every statistic is computed or shown as n/a, never invented.',
  },
];

// key, value, index of the step that activates the line (-1 = comment)
const RULES = [
  ['', '# trend with a capitol filter', -1],
  ['universe', '20 large-cap US stocks', 0],
  ['signal', 'Close above the 200-day average', 1],
  ['filter', 'Congress purchase disclosed, last 60 days', 2],
  ['hold', 'Up to four positions, equal weight', 3],
  ['exit', 'Close below the 200-day average', 3],
  ['costs', `${COMMISSION_BPS} bps commission, ${SLIPPAGE_BPS} bps slippage`, 4],
  ['benchmark', 'S&P 500 (SPY)', 5],
];

/* ticker, trend (0-100, x axis: price against its 200-day average), position
   from top (0-100, y axis), congress purchase disclosed, and for the names
   that pass both rules the illustrative session on which the signal fired.
   The engine fills entries in signal order, ties alphabetically. */
const STOCKS = [
  ['LLY', 2, 6, false, 0],
  ['GOOGL', 58, 6, false, 0],
  ['META', 72, 15, false, 0],
  ['COST', 44, 24, true, 5],
  ['AMZN', 57, 22, true, 4],
  ['MSFT', 50, 31, false, 0],
  ['NFLX', 66, 35, false, 0],
  ['JNJ', 45, 38, true, 6],
  ['JPM', 40, 45, true, 7],
  ['NVDA', 24, 57, false, 0],
  ['AAPL', 52, 68, true, 4],
  ['XOM', 66, 64, true, 3],
  ['V', 89, 60, false, 0],
  ['BRK.B', 11, 76, false, 0],
  ['TSLA', 21, 84, false, 0],
  ['MA', 74, 78, true, 1],
  ['HD', 91, 74, true, 1],
  ['AVGO', 62, 87, false, 0],
  ['UNH', 82, 90, true, 2],
  ['PG', 96, 88, false, 0],
].map(([ticker, trend, top, congress, signalDay]) => ({
  ticker,
  trend,
  top,
  signalDay,
  signal: trend > CUTOFF,
  filter: trend > CUTOFF && congress,
}));

/* Seeded LCG: deterministic, so SSR and hydration agree. */
function noise(seed, n) {
  let s = seed;
  const out = [];
  for (let i = 0; i < n; i += 1) {
    s = (s * 9301 + 49297) % 233280;
    out.push(s / 233280 - 0.5);
  }
  return out;
}

function stats(rets) {
  let e = 1;
  let peak = 1;
  let dd = 0;
  let sum = 0;
  let sq = 0;
  const eq = [1];
  rets.forEach((r) => {
    e *= 1 + r;
    eq.push(e);
    if (e > peak) peak = e;
    dd = Math.min(dd, e / peak - 1);
    sum += r;
    sq += r * r;
  });
  const m = sum / rets.length;
  const sd = Math.sqrt(Math.max(sq / rets.length - m * m, 1e-12));
  return { eq, total: e - 1, dd, sharpe: (m / sd) * Math.sqrt(252) };
}

function linePath(vals, min, max, w, h, pad) {
  const r = max - min || 1;
  return vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = pad + (1 - (v - min) / r) * (h - 2 * pad);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

const pct = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v * 100).toFixed(2)}%`;
const two = (n) => String(n).padStart(2, '0');

function buildModel() {
  const passing = STOCKS.filter((s) => s.filter);
  const held = [...passing]
    .sort((a, b) => a.signalDay - b.signalDay || a.ticker.localeCompare(b.ticker))
    .slice(0, HOLD)
    .map((s) => s.ticker);
  const S = stats(noise(23, 252).map((x) => 0.0008 - DAILY_COST + x * 0.022));
  const B = stats(noise(91, 252).map((x) => 0.0004 + x * 0.018));
  const all = S.eq.concat(B.eq);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pathA = linePath(S.eq, min, max, 600, 240, 16);
  return {
    held,
    nSignal: STOCKS.filter((s) => s.signal).length,
    nFilter: passing.length,
    pathA,
    pathB: linePath(B.eq, min, max, 600, 240, 16),
    area: `${pathA} L600 240 L0 240 Z`,
    metrics: [
      { label: 'Return, after costs', value: pct(S.total), tone: S.total >= 0 ? 'pos' : 'neg' },
      { label: 'Sharpe ratio', value: S.sharpe.toFixed(2), tone: '' },
      { label: 'Max drawdown', value: pct(S.dd), tone: 'neg' },
      { label: 'Cost drag', value: `${(DAILY_COST * 252 * 100).toFixed(2)}% / yr`, tone: '' },
    ],
  };
}

function dotKind(stock, step, held) {
  if (step === 0) return 'universe';
  if (step === 1) return stock.signal ? 'passing' : 'excluded';
  if (step === 2) return stock.filter ? 'passing' : 'excluded';
  return held.includes(stock.ticker) ? 'held' : 'excluded';
}

export function QuantLabSection({ ctaHref = '/auth/signup' }) {
  const model = useMemo(buildModel, []);
  const stageRef = useRef(null);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const started = useRef(false);

  /* First run starts when the stage scrolls into view, unless motion is
     reduced. The stage is watched, not the whole section: once the panes
     stack on a phone the section is taller than the screen and 35% of it
     could never be visible at once. */
  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          setAuto(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* Advance one step at a time, stop on Result. */
  useEffect(() => {
    if (!auto) return undefined;
    if (step >= STEPS.length - 1) {
      setAuto(false);
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [auto, step]);

  const pick = (k) => {
    started.current = true;
    setAuto(false);
    setStep(k);
  };
  const run = () => {
    started.current = true;
    setStep(0);
    setAuto(true);
  };

  const tiles = [
    ['Universe', 0, `${STOCKS.length} stocks`],
    ['After signal', 1, `${model.nSignal} stocks`],
    ['After filter', 2, `${model.nFilter} stocks`],
    ['Held, equal weight', 3, `${HOLD} × ${100 / HOLD}%`],
  ];
  const showResult = step === STEPS.length - 1;
  const showCutoff = step === 1 || step === 2;

  return (
    <section className="qls-section" id="quant" aria-labelledby="qls-heading">
      <div className="qls-container">
        <header className="qls-header">
          <p className="section-eyebrow lf-mono">Quant Lab</p>
          <h2 id="qls-heading" className="qls-title">
            From a Sentence to a Portfolio
          </h2>
          <p className="qls-lead">
            Every strategy reads as plain sentences. Watch each rule do its job: universe, signal,
            filter, hold and costs, then read the result.
          </p>
        </header>

        <div className="qls-body">
          <div className="qls-controls">
            <div className="qls-steps">
              {STEPS.map((s, k) => {
                const on = k === step;
                const done = k < step || (on && !auto);
                return (
                  <button
                    key={s.name}
                    type="button"
                    className={`qls-step${on ? ' is-active' : ''}${k <= step ? ' is-reached' : ''}`}
                    aria-pressed={on}
                    onClick={() => pick(k)}
                  >
                    <span className="qls-step-track" aria-hidden="true">
                      {done ? <span className="qls-step-fill" /> : null}
                      {on && auto ? <span key={step} className="qls-step-fill is-running" /> : null}
                    </span>
                    <span className="qls-step-label">
                      <span className="qls-step-num">{two(k + 1)}</span>
                      <span className="qls-step-name">{s.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="qls-run" onClick={run}>
              Run pipeline
            </button>
          </div>

          <div className="qls-panes">
            <div className="qls-pane qls-pane-rules">
              <div className="qls-pane-head">
                <span>Strategy Lab / Rules</span>
                <span>
                  Rule {two(step + 1)} of {two(STEPS.length)}
                </span>
              </div>

              <div className="qls-rules">
                {RULES.map(([key, val, at]) => {
                  const state =
                    at < 0 ? 'comment' : at === step ? 'active' : at > step ? 'pending' : 'done';
                  return (
                    <div key={val} className={`qls-rule is-${state}`}>
                      {key ? <span className="qls-rule-key">{key}</span> : null}
                      <span className="qls-rule-val">{val}</span>
                    </div>
                  );
                })}
              </div>

              <div className="qls-note" aria-live="polite">
                <div className="qls-note-tag">
                  Rule {two(step + 1)} / {STEPS[step].name}
                </div>
                <p className="qls-note-text">{STEPS[step].note}</p>
              </div>

              <div className="qls-tiles">
                {tiles.map(([label, at, value]) => (
                  <div key={label} className="qls-tile">
                    <span className="qls-tile-label">{label}</span>
                    <span className={`qls-tile-value${step >= at ? '' : ' is-pending'}`}>
                      {step >= at ? value : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div ref={stageRef} className="qls-pane qls-pane-stage">
              <div className="qls-pane-head">
                <span>Backtesting / {STEPS[step].name}</span>
                <span>Illustrative data</span>
              </div>

              {showResult ? (
                <div className="qls-result">
                  <div className="qls-legend">
                    <span>
                      <i className="qls-swatch" aria-hidden="true" />
                      Strategy, after costs
                    </span>
                    <span>
                      <i className="qls-swatch is-dashed" aria-hidden="true" />
                      Benchmark
                    </span>
                  </div>
                  <div className="qls-chart">
                    <svg
                      viewBox="0 0 600 240"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Illustrative backtest result: strategy after costs against benchmark"
                    >
                      <path className="qls-chart-grid" d="M0 60H600M0 120H600M0 180H600" />
                      <path className="qls-chart-area" d={model.area} />
                      <path className="qls-chart-bench" d={model.pathB} />
                      <path className="qls-chart-line" d={model.pathA} />
                    </svg>
                  </div>
                  <div className="qls-metrics">
                    {model.metrics.map((m) => (
                      <div key={m.label} className="qls-tile">
                        <span className="qls-tile-label">{m.label}</span>
                        <span className={`qls-tile-value${m.tone ? ` is-${m.tone}` : ''}`}>
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="qls-holdings">
                    <span className="qls-holdings-label">Holdings</span>
                    <div className="qls-holdings-list">
                      {[...model.held].sort().map((t) => (
                        <span key={t}>
                          <i className="qls-key is-held" aria-hidden="true" />
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="qls-holdings-weight">{100 / HOLD}% each</span>
                  </div>
                </div>
              ) : (
                <div className="qls-plot-wrap">
                  <div className="qls-plot-row">
                    <div className="qls-axis-y">Volatility</div>
                    <div
                      className="qls-plot"
                      role="img"
                      aria-label="Illustrative scatter of twenty stocks by price against the 200-day average and by volatility, narrowing as each rule is applied"
                    >
                      {showCutoff ? (
                        <div className="qls-cutoff" style={{ left: `${CUTOFF}%` }}>
                          <span>{step === 2 ? '+ congress filter' : '200-day average'}</span>
                        </div>
                      ) : null}
                      {STOCKS.map((s) => {
                        const kind = dotKind(s, step, model.held);
                        return (
                          <div
                            key={s.ticker}
                            className={`qls-dot is-${kind}`}
                            style={{ left: `${s.trend}%`, top: `${s.top}%` }}
                          >
                            <span className="qls-dot-mark" />
                            <span className="qls-dot-label">{s.ticker}</span>
                            {step === 4 && kind === 'held' ? (
                              <span className="qls-dot-cost">
                                -{COMMISSION_BPS + SLIPPAGE_BPS} bps
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="qls-axis-x">Price against the 200-day average</div>
                  <div className="qls-legend">
                    <span>
                      <i className="qls-key is-excluded" aria-hidden="true" />
                      Excluded
                    </span>
                    <span>
                      <i className="qls-key is-universe" aria-hidden="true" />
                      In universe
                    </span>
                    <span>
                      <i className="qls-key is-passing" aria-hidden="true" />
                      Passing
                    </span>
                    <span>
                      <i className="qls-key is-held" aria-hidden="true" />
                      Held
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="qls-footer">
          <a className="lp-btn-primary qls-cta" href={ctaHref}>
            Open Quant Lab
          </a>
          <p className="qls-legal">
            Nothing here places a real order. This section demonstrates the backtest engine with
            simulated figures. They are not past performance and not investment advice.
          </p>
        </footer>
      </div>
    </section>
  );
}
