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
/* Phones run the pipeline faster: the page is held still while it runs. */
const STEP_MS_PHONE = 1800;
/* The backtest windows a visitor can pick, in trading days. The figures are
   seeded walks of that length ending on END, so every visitor sees the same. */
const PERIODS = [
  { key: '1Y', days: 252, label: '1 year' },
  { key: '3Y', days: 756, label: '3 years' },
  { key: '5Y', days: 1260, label: '5 years' },
  { key: '10Y', days: 2520, label: '10 years' },
];
const END = Date.UTC(2026, 9, 30); // last session of the illustrative test
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* Most points the chart path draws; the statistics use every day. */
const MAX_PATH_POINTS = 420;
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

// key, value, index of the step that activates the line (-1 = comment), and
// other settings the engine accepts for that line (src/lib/quants/
// strategy-spec.js), shown greyed beside it once the run reaches it.
const RULES = [
  ['', '# trend with a capitol filter', -1, []],
  ['universe', '20 large-cap US stocks', 0, ['Your watchlist', 'Any 20 tickers']],
  [
    'signal',
    'Close above the 200-day average',
    1,
    ['RSI below 30', '50-day crosses above 200-day', 'MACD crosses its signal'],
  ],
  [
    'filter',
    'Congress purchase disclosed, last 60 days',
    2,
    ['Insider purchase, last 30 days', 'Volume spike'],
  ],
  ['hold', 'Up to four positions, equal weight', 3, ['Percent of equity', 'Up to ten positions']],
  ['exit', 'Close below the 200-day average', 3, ['8% stop loss', '10% trailing stop', 'Hold 90 days']],
  [
    'costs',
    `${COMMISSION_BPS} bps commission, ${SLIPPAGE_BPS} bps slippage`,
    4,
    ['Per-share commission', '20 bps slippage'],
  ],
  ['benchmark', 'S&P 500 (SPY)', 5, ['Nasdaq 100 (QQQ)', 'Russell 2000 (IWM)']],
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
  let peakAt = 0;
  let dd = 0;
  /* Where the worst drawdown ran: index in eq of its peak and its trough. */
  let ddFrom = 0;
  let ddTo = 0;
  let sum = 0;
  let sq = 0;
  const eq = [1];
  rets.forEach((r, i) => {
    e *= 1 + r;
    eq.push(e);
    if (e > peak) {
      peak = e;
      peakAt = i + 1;
    }
    if (e / peak - 1 < dd) {
      dd = e / peak - 1;
      ddFrom = peakAt;
      ddTo = i + 1;
    }
    sum += r;
    sq += r * r;
  });
  const m = sum / rets.length;
  const sd = Math.sqrt(Math.max(sq / rets.length - m * m, 1e-12));
  return { eq, total: e - 1, dd, ddFrom, ddTo, sharpe: (m / sd) * Math.sqrt(252) };
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

/* The same mapping as linePath, as percentages of the chart box. The svg is
   stretched (preserveAspectRatio none), so anything that must keep its shape
   (a dot, a label) is an HTML mark placed with these instead of svg text. */
function markAt(vals, i, min, max, h, pad) {
  const r = max - min || 1;
  return {
    left: (i / (vals.length - 1)) * 100,
    top: ((pad + (1 - (vals[i] - min) / r) * (h - 2 * pad)) / h) * 100,
  };
}

const pct = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v * 100).toFixed(2)}%`;
const two = (n) => String(n).padStart(2, '0');

/* Calendar date of trading day i of n ending on END (252 sessions a year). */
function dayLabel(i, n) {
  const d = new Date(END - (n - 1 - i) * (365.25 / 252) * 86400000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function thin(vals) {
  if (vals.length <= MAX_PATH_POINTS) return vals;
  const step = (vals.length - 1) / (MAX_PATH_POINTS - 1);
  return Array.from({ length: MAX_PATH_POINTS }, (_, k) => vals[Math.round(k * step)]);
}

function buildModel(days = 252) {
  const passing = STOCKS.filter((s) => s.filter);
  const held = [...passing]
    .sort((a, b) => a.signalDay - b.signalDay || a.ticker.localeCompare(b.ticker))
    .slice(0, HOLD)
    .map((s) => s.ticker);
  const S = stats(noise(23 + days, days).map((x) => 0.0008 - DAILY_COST + x * 0.022));
  const B = stats(noise(91 + days, days).map((x) => 0.0004 + x * 0.018));
  const all = S.eq.concat(B.eq);
  /* The path is drawn from a thinned copy (same x positions); the marks and
     the statistics read the full daily series. */
  const SA = thin(S.eq);
  const SB = thin(B.eq);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pathA = linePath(SA, min, max, 600, 240, 16);
  const ddPeak = markAt(S.eq, S.ddFrom, min, max, 240, 16);
  const ddTrough = markAt(S.eq, S.ddTo, min, max, 240, 16);
  const n = S.eq.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    left: f * 100,
    label: dayLabel(Math.round(f * (n - 1)), n),
  }));
  return {
    held,
    /* Where the strategy line ends, and its total return for the end tag. */
    end: { top: markAt(S.eq, S.eq.length - 1, min, max, 240, 16).top, value: pct(S.total) },
    /* The worst peak-to-trough stretch of the strategy, from the same series
       the Max drawdown tile reads. */
    drawdown: { peak: ddPeak, trough: ddTrough, value: pct(S.dd) },
    nSignal: STOCKS.filter((s) => s.signal).length,
    nFilter: passing.length,
    pathA,
    pathB: linePath(SB, min, max, 600, 240, 16),
    ticks,
    from: dayLabel(0, n),
    to: dayLabel(n - 1, n),
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
  const [period, setPeriod] = useState('3Y');
  const days = PERIODS.find((p) => p.key === period)?.days ?? 756;
  const model = useMemo(() => buildModel(days), [days]);
  const stageRef = useRef(null);
  const sectionRef = useRef(null);
  const controlsRef = useRef(null);
  /* Phones: the page is held still while the pipeline runs (see below). */
  const [locked, setLocked] = useState(false);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const started = useRef(false);
  /* Nov 18, phones only: the six bars start empty and no rule shows until the
     run reaches it; each rule appears as its bar starts to fill. When the last
     bar has filled, the page scrolls down to the result chart. `begun` is the
     reactive twin of `started`, so the first render can hold everything back. */
  const [isPhone, setIsPhone] = useState(false);
  const [begun, setBegun] = useState(false);
  const scrolledToResult = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsPhone(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  /* First run. Desktop: when the stage scrolls into view. Phones (Nov 18):
     when the step bars reach the upper part of the screen, the section's
     heading is brought to the top, the page is held still while the six
     rules run, then it lets go and scrolls to the chart. Reduced motion: no
     autoplay and no hold. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const phone = window.matchMedia('(max-width: 767px)').matches;
    const node = phone ? controlsRef.current : stageRef.current;
    if (!node) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        if (phone && sectionRef.current) {
          sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          /* Hold once the scroll has settled; holding mid-scroll would stop it. */
          window.setTimeout(() => setLocked(true), 500);
        }
        setBegun(true);
        setAuto(true);
      },
      /* Phones: fire once the bars are in the top 60% of the screen. */
      phone ? { rootMargin: '0px 0px -40% 0px', threshold: 1 } : { threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* Hold the page still while locked: no scroll by touch, wheel or keys. */
  useEffect(() => {
    if (!locked) return undefined;
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const stop = (e) => e.preventDefault();
    const keys = (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', stop, { passive: false });
    document.addEventListener('wheel', stop, { passive: false });
    document.addEventListener('keydown', keys);
    /* Never hold longer than the run itself plus a margin. */
    const safety = setTimeout(() => setLocked(false), STEPS.length * STEP_MS_PHONE + 4000);
    return () => {
      clearTimeout(safety);
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
      document.removeEventListener('touchmove', stop);
      document.removeEventListener('wheel', stop);
      document.removeEventListener('keydown', keys);
    };
  }, [locked]);

  /* Advance one step at a time, stop on Result. On a phone the Result bar gets
     its own fill like the other five, then the page scrolls to the chart once
     per automatic run. */
  useEffect(() => {
    if (!auto) return undefined;
    if (step >= STEPS.length - 1) {
      if (!isPhone) {
        setAuto(false);
        return undefined;
      }
      const t = setTimeout(() => {
        setAuto(false);
        setLocked(false);
        if (!scrolledToResult.current && stageRef.current) {
          scrolledToResult.current = true;
          /* After the hold lifts, so the scroll is not blocked. */
          requestAnimationFrame(() =>
            stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          );
        }
      }, STEP_MS_PHONE);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), isPhone ? STEP_MS_PHONE : STEP_MS);
    return () => clearTimeout(t);
  }, [auto, step, isPhone]);

  const pick = (k) => {
    started.current = true;
    setBegun(true);
    setAuto(false);
    setLocked(false);
    setStep(k);
  };
  /* Skip, while the page is held: straight to the result and the chart. */
  const skip = () => {
    pick(STEPS.length - 1);
    scrolledToResult.current = true;
    requestAnimationFrame(() =>
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };
  /* Phones hold the bars and rules back until the run starts. */
  const holding = isPhone && !begun;

  const tiles = [
    ['Universe', 0, `${STOCKS.length} stocks`],
    ['After signal', 1, `${model.nSignal} stocks`],
    ['After filter', 2, `${model.nFilter} stocks`],
    ['Held, equal weight', 3, `${HOLD} × ${100 / HOLD}%`],
  ];
  const showResult = step === STEPS.length - 1;
  const showCutoff = step === 1 || step === 2;

  return (
    <section ref={sectionRef} className="qls-section" id="quant" aria-labelledby="qls-heading">
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
          <div ref={controlsRef} className="qls-controls">
            <div className="qls-steps">
              {STEPS.map((s, k) => {
                const on = k === step;
                const done = !holding && (k < step || (on && !auto));
                return (
                  <button
                    key={s.name}
                    type="button"
                    className={`qls-step${on && !holding ? ' is-active' : ''}${!holding && k <= step ? ' is-reached' : ''}`}
                    aria-pressed={on}
                    onClick={() => pick(k)}
                  >
                    <span className="qls-step-track" aria-hidden="true">
                      {done ? <span className="qls-step-fill" /> : null}
                      {on && auto && !holding ? (
                        <span key={step} className="qls-step-fill is-running" />
                      ) : null}
                    </span>
                    <span className="qls-step-label">
                      <span className="qls-step-num">{two(k + 1)}</span>
                      <span className="qls-step-name">{s.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {locked ? (
              <button type="button" className="qls-skip" onClick={skip}>
                Skip to result <i className="bi bi-arrow-down" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="qls-panes">
            <div className="qls-pane qls-pane-rules">
              <div className="qls-pane-head">
                <span>Strategy Lab / Rules</span>
                <span>
                  Rule {two(step + 1)} of {two(STEPS.length)}
                </span>
              </div>

              <div className={`qls-rules${isPhone ? ' is-revealing' : ''}`}>
                {RULES.map(([key, val, at, alts]) => {
                  const state =
                    at < 0 ? 'comment' : at === step ? 'active' : at > step ? 'pending' : 'done';
                  /* On a phone a rule appears only once its bar has started. */
                  if (isPhone && (holding || at > step)) return null;
                  return (
                    <div key={val} className={`qls-rule is-${state}`}>
                      {key ? <span className="qls-rule-key">{key}</span> : null}
                      <span className="qls-rule-val">{val}</span>
                      {/* Other settings the engine takes for this line, greyed,
                          once the run has reached it. */}
                      {alts?.length && state !== 'pending' && state !== 'comment' ? (
                        <span className="qls-rule-alts" aria-label={`Other options: ${alts.join(', ')}`}>
                          {alts.map((o) => (
                            <span key={o} className="qls-rule-alt">
                              {o}
                            </span>
                          ))}
                        </span>
                      ) : null}
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
                <span>
                  Backtesting / {STEPS[step].name}
                  {showResult ? ` / ${PERIODS.find((p) => p.key === period)?.label}` : ''}
                </span>
                <span>Illustrative data</span>
              </div>

              {showResult ? (
                <div className="qls-result">
                  <div className="qls-result-top">
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
                    {/* The window the backtest runs over (Nov 18). */}
                    <div className="qls-periods" role="group" aria-label="Backtest period">
                      {PERIODS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          className={`qls-period${p.key === period ? ' is-on' : ''}`}
                          aria-pressed={p.key === period}
                          aria-label={`Backtest over ${p.label}`}
                          onClick={() => setPeriod(p.key)}
                        >
                          {p.key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="qls-chart">
                    <svg
                      viewBox="0 0 600 240"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`Illustrative backtest result: strategy after costs ends at ${model.end.value} against the benchmark, with a maximum drawdown of ${model.drawdown.value}`}
                    >
                      <path className="qls-chart-grid" d="M0 60H600M0 120H600M0 180H600" />
                      <path className="qls-chart-area" d={model.area} />
                      <path className="qls-chart-bench" d={model.pathB} />
                      <path className="qls-chart-line" d={model.pathA} />
                    </svg>
                    {/* Marks over the chart. The figures repeat the tiles
                        below, so the layer is hidden from assistive tech. */}
                    <div className="qls-chart-marks" aria-hidden="true">
                      <span
                        className="qls-dd-drop"
                        style={{
                          left: `${model.drawdown.peak.left}%`,
                          top: `${model.drawdown.peak.top}%`,
                        }}
                      />
                      <span
                        className="qls-dd-drop"
                        style={{
                          left: `${model.drawdown.trough.left}%`,
                          top: `${model.drawdown.trough.top}%`,
                        }}
                      />
                      <span
                        className="qls-dd-bar"
                        style={{
                          left: `${model.drawdown.peak.left}%`,
                          width: `${model.drawdown.trough.left - model.drawdown.peak.left}%`,
                        }}
                      >
                        <span className="qls-dd-label">Max drawdown {model.drawdown.value}</span>
                      </span>
                      <span className="qls-end" style={{ top: `${model.end.top}%` }}>
                        <span className="qls-end-tag">Strategy {model.end.value}</span>
                        <i className="qls-end-dot" />
                      </span>
                    </div>
                  </div>
                  {/* Dates along the bottom: the window the test ran over. */}
                  <div className="qls-axis-dates" aria-label={`From ${model.from} to ${model.to}`}>
                    {model.ticks.map((t, i) => (
                      <span
                        key={t.left}
                        className={`qls-axis-date${i === 0 ? ' is-first' : ''}${i === model.ticks.length - 1 ? ' is-last' : ''}`}
                        style={{ left: `${t.left}%` }}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>

                  {/* The portfolio the rules produced (Nov 18): the four names
                      that passed both rules and the weight each one gets. */}
                  <div key={period} className="qls-alloc">
                    <p className="qls-alloc-head">
                      <span className="qls-alloc-n">{model.held.length} stocks</span> passed the
                      signal and the filter, held at{' '}
                      <span className="qls-alloc-n">{100 / HOLD}% each</span>
                    </p>
                    <ul className="qls-alloc-list">
                      {[...model.held].sort().map((t, i) => (
                        <li key={t} className="qls-alloc-row" style={{ '--i': i }}>
                          <span className="qls-alloc-ticker">{t}</span>
                          <span className="qls-alloc-why">above 200-day · congress buy</span>
                          <span className="qls-alloc-bar" aria-hidden="true">
                            <span style={{ width: `${100 / HOLD}%` }} />
                          </span>
                          <span className="qls-alloc-w">{100 / HOLD}%</span>
                        </li>
                      ))}
                    </ul>
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
