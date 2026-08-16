'use client';

import './hero-dashboard-mock.css';

/* Miniature, living mockup of the authenticated dashboard home (/home, the
   "broadsheet") for the hero iMac. Mirrors the real page's structure at
   mockup fidelity: the top app bar (the real shell has a top navbar, no
   side rail), the hero band's greeting-left / portfolio-value-right split,
   Band I's portfolio area chart, Band II's Holdings table, and Band V's
   Congressional tracker column. Deterministic: every frame-to-frame change
   derives from integer `tick` via seeded sin (no Math.random). Decorative:
   the parent composition is aria-hidden with pointer-events none.

   Values and tickers are illustrative; the tracker rows reference filing
   EVENTS (the platform's real data shape), never invented returns. */

function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

const BASE_VALUE = 124873.4;
const SPARK_BASE = [0.32, 0.35, 0.33, 0.4, 0.44, 0.42, 0.5, 0.54, 0.52, 0.58, 0.62, 0.66];

const HOLDINGS = [
  { tk: 'NVDA', px: 1188.2, base: 1.4 },
  { tk: 'MSFT', px: 512.9, base: 0.6 },
  { tk: 'XOM', px: 118.4, base: -0.5 },
  { tk: 'PLTR', px: 64.1, base: 2.1 },
];

const FEED = [
  { who: 'Rep. Whitfield', what: 'disclosure filed', tag: 'LMT' },
  { who: 'Sen. Alvarez', what: 'new 13F position', tag: 'AVGO' },
  { who: 'Rep. Chen', what: 'options exercise', tag: 'MSFT' },
  { who: 'Sen. Brooks', what: 'disclosure filed', tag: 'XOM' },
  { who: 'Rep. Osei', what: 'periodic report', tag: 'PFE' },
];

export function HeroDashboardMock({ tick = 0 }) {
  const drift = (seeded(tick) - 0.5) * 240;
  const value = BASE_VALUE + drift;
  const dayChange = 1.62 + seeded(tick * 3) * 0.5; /* stays positive per brand semantics */

  const spark = SPARK_BASE.map((v, i) => [
    i / (SPARK_BASE.length - 1),
    Math.min(0.92, v + 0.05 * seeded(tick * 2 + i)),
  ]);
  const sw = 300;
  const sh = 64;
  const sparkPts = spark
    .map(([x, y]) => `${(x * sw).toFixed(1)},${(sh - y * sh).toFixed(1)}`)
    .join(' ');

  const feedStart = tick % FEED.length;
  const feedRows = [0, 1, 2].map((i) => FEED[(feedStart + i) % FEED.length]);

  return (
    <div className="hdm-root">
      {/* Slim top app bar: the real dashboard shell is a top navbar. */}
      <div className="hdm-topbar">
        <span className="hdm-topbar-logo" />
        {[26, 20, 24, 18].map((w, i) => (
          <span key={i} className="hdm-topbar-item" style={{ width: `${w}px` }} />
        ))}
        <span className="hdm-topbar-avatar" />
      </div>

      <div className="hdm-main">
        {/* Hero band: greeting left, portfolio value + day change right. */}
        <header className="hdm-head">
          <div className="hdm-greet">Good morning, Noah.</div>
          <div className="hdm-head-r">
            <div className="hdm-value hdm-mono hdm-t">
              $
              {value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="hdm-day hdm-mono hdm-t">
              +{dayChange.toFixed(2)}% today
              <span className="hdm-live" />
            </div>
          </div>
        </header>

        {/* Band I: the wide portfolio area chart. */}
        <section className="hdm-chart-card">
          <div className="hdm-card-kicker hdm-mono">LATELY ON EZANA · 30D</div>
          <svg viewBox={`0 0 ${sw} ${sh}`} className="hdm-spark" preserveAspectRatio="none">
            <line x1="0" y1={sh * 0.33} x2={sw} y2={sh * 0.33} className="hdm-grid" />
            <line x1="0" y1={sh * 0.66} x2={sw} y2={sh * 0.66} className="hdm-grid" />
            <polygon points={`0,${sh} ${sparkPts} ${sw},${sh}`} className="hdm-t hdm-spark-area" />
            <polyline points={sparkPts} className="hdm-t hdm-spark-line" />
          </svg>
        </section>

        {/* Band II Holdings table | Band V Congressional tracker. */}
        <div className="hdm-cols">
          <section className="hdm-table-card">
            <div className="hdm-card-kicker hdm-mono">HOLDINGS</div>
            {HOLDINGS.map((h, i) => {
              const d = h.base + (seeded(tick + i * 11) - 0.5) * 0.4;
              const up = d >= 0;
              return (
                <div key={h.tk} className="hdm-row">
                  <span className="hdm-mono hdm-tk">{h.tk}</span>
                  <span className="hdm-mono hdm-px hdm-t">{h.px.toFixed(2)}</span>
                  <span className={`hdm-mono hdm-t ${up ? 'hdm-up' : 'hdm-down'}`}>
                    {up ? '+' : ''}
                    {d.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </section>

          <section className="hdm-feed-card">
            <div className="hdm-card-kicker hdm-mono">CONGRESSIONAL TRACKER</div>
            {feedRows.map((r, i) => (
              <div
                key={`${r.who}-${feedStart}-${i}`}
                className={`hdm-feed-row hdm-t${i === 0 ? ' hdm-feed-row--new' : ''}`}
              >
                <span className="hdm-feed-who">{r.who}</span>
                <span className="hdm-feed-what">{r.what}</span>
                <span className="hdm-mono hdm-feed-tag">{r.tag}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

export default HeroDashboardMock;
