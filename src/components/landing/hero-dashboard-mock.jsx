'use client';

import './hero-dashboard-mock.css';

/* Miniature, living two-panel mockup of the authenticated dashboard home
   (/home, the "broadsheet") for the hero iMac. Mirrors the real page's
   Band II "Positions & progress" board on the left (holdings table with
   the real SYMBOL / NAME / DAY / VALUE / WEIGHT / 7-DAY columns, the
   pagination footer, and the sector-breakdown band) and the ELO rating
   rail on the right (rating over 10,000, tier badge, progress to the
   next tier, and earned-by-category).

   Deliberately sparse: at mockup scale only two blocks per panel stay
   legible, so each one is given room rather than packing the screen.

   Deterministic: every frame-to-frame change derives from integer `tick`
   via seeded sin (no Math.random). Decorative: the parent composition is
   aria-hidden with pointer-events none. Values and holdings rows are
   illustrative, not attributed to any real account. */

function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

/* Holdings: symbol, name, base day delta, position value, weight. */
const HOLDINGS = [
  { sym: 'NVDA', name: 'NVIDIA Corp', base: 1.4, val: 24180, wt: 19.4 },
  { sym: 'MSFT', name: 'Microsoft', base: 0.6, val: 19640, wt: 15.7 },
  { sym: 'AVGO', name: 'Broadcom', base: 0.9, val: 14320, wt: 11.5 },
  { sym: 'XOM', name: 'Exxon Mobil', base: -0.5, val: 11870, wt: 9.5 },
  { sym: 'PLTR', name: 'Palantir', base: 2.1, val: 9240, wt: 7.4 },
  { sym: 'JPM', name: 'JPMorgan', base: 0.4, val: 8460, wt: 6.8 },
  { sym: 'LMT', name: 'Lockheed', base: -0.3, val: 6980, wt: 5.6 },
];

/* Six rows: the real page's sectorRows plus the rolled-up remainder. */
const SECTORS = [
  { label: 'Technology', pct: 46.6, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Energy', pct: 21.3, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Financials', pct: 14.8, color: 'var(--emerald)' },
  { label: 'Industrials', pct: 9.7, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Healthcare', pct: 5.4, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Other', pct: 2.2, color: 'var(--emerald)' },
];

const EARNED = [
  { label: 'Learning', pct: 0.42, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Trading', pct: 0.26, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Community', pct: 0.14, color: 'var(--emerald)' },
];

/* Tiny inline row sparkline: 7 deterministic points tinted by direction. */
function RowSpark({ seed, up }) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const y = 3 + seeded(seed + i * 3.7) * 8;
    return `${(i * 7).toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const cls = up ? 'hdm-sparkline--up' : 'hdm-sparkline--down';
  return (
    <svg className="hdm-spark-cell" viewBox="0 0 42 14" preserveAspectRatio="none" aria-hidden>
      <polygon className={`hdm-t hdm-sparkarea ${cls}`} points={`0,14 ${pts} 42,14`} />
      <polyline className={`hdm-t hdm-sparkline ${cls}`} points={pts} />
    </svg>
  );
}

export function HeroDashboardMock({ tick = 0 }) {
  /* ELO counts up in small deterministic steps and holds under the tier cap. */
  const elo = 180 + (tick % 7) * 12;
  const pctToNext = Math.min(1, elo / 1000);

  return (
    <div className="hdm-root">
      {/* ── LEFT: Positions & progress board ── */}
      <div className="hdm-board">
        <div className="hdm-sec-head">
          <span className="hdm-sec-num hdm-mono">II</span>
          <span className="hdm-sec-title">Positions &amp; progress</span>
          <span className="hdm-sec-meta hdm-mono">
            HOLDINGS · STREAK · ELO
            <span className="hdm-live" />
          </span>
        </div>

        <div className="hdm-table">
          <div className="hdm-hrow hdm-hrow--head hdm-mono">
            <span>SYMBOL</span>
            <span>NAME</span>
            <span className="hdm-r">DAY</span>
            <span className="hdm-r">VALUE</span>
            <span className="hdm-r">WEIGHT</span>
            <span className="hdm-r">7-DAY</span>
          </div>
          {HOLDINGS.map((h, i) => {
            const d = h.base + (seeded(tick + i * 11) - 0.5) * 0.4;
            const up = d >= 0;
            return (
              <div key={h.sym} className="hdm-hrow">
                <span className="hdm-mono hdm-sym">{h.sym}</span>
                <span className="hdm-name">{h.name}</span>
                <span className={`hdm-mono hdm-r hdm-t ${up ? 'hdm-up' : 'hdm-down'}`}>
                  {up ? '+' : ''}
                  {d.toFixed(2)}%
                </span>
                <span className="hdm-mono hdm-r hdm-val">${h.val.toLocaleString('en-US')}</span>
                <span className="hdm-mono hdm-r hdm-wt">{h.wt.toFixed(1)}%</span>
                <RowSpark seed={tick * 2 + i * 13} up={up} />
              </div>
            );
          })}
          <div className="hdm-pager hdm-mono">
            <span>PAGE 1 OF 2 · 14 TOTAL</span>
            <span className="hdm-pager-btns">
              <i className="hdm-pill" />
              <i className="hdm-pill" />
            </span>
          </div>
        </div>

        <section className="hdm-block hdm-sectors">
          <div className="hdm-block-title hdm-mono">SECTOR BREAKDOWN</div>
          {SECTORS.map((s) => (
            <div key={s.label} className="hdm-barrow">
              <span className="hdm-bardot" style={{ background: s.color }} />
              <span className="hdm-barlabel">{s.label}</span>
              <span className="hdm-bar-track">
                <span
                  className="hdm-bar-fill hdm-t"
                  style={{ width: `${s.pct}%`, background: s.color }}
                />
              </span>
              <span className="hdm-mono hdm-barval">{s.pct.toFixed(1)}%</span>
            </div>
          ))}
        </section>
      </div>

      {/* ── RIGHT: ELO rating rail ── */}
      <div className="hdm-rail">
        <section className="hdm-card hdm-card--elo">
          <div className="hdm-block-head">
            <span className="hdm-block-title hdm-block-title--elo hdm-mono">ELO RATING</span>
            <span className="hdm-link hdm-mono">Leaderboard</span>
          </div>
          <div className="hdm-elo-row">
            <span className="hdm-mono hdm-elo-current hdm-t">{elo}</span>
            <span className="hdm-mono hdm-elo-suffix">/ 10,000</span>
          </div>
          <div className="hdm-elo-tier">
            <span className="hdm-tierlabel">
              <span className="hdm-tierdot" />
              Novice
            </span>
            <span className="hdm-mono hdm-elo-peak">PEAK 240</span>
          </div>
          <span className="hdm-bar-track hdm-bar-track--elo">
            <span
              className="hdm-bar-fill hdm-t"
              style={{ width: `${(pctToNext * 100).toFixed(1)}%`, background: 'var(--emerald)' }}
            />
          </span>
          <div className="hdm-elo-ends hdm-mono">
            <span>0-999 BAND</span>
            <span>{1000 - elo} TO APPRENTICE</span>
          </div>
        </section>

        <section className="hdm-card hdm-card--earned">
          <div className="hdm-block-title hdm-mono hdm-earned-title">EARNED BY CATEGORY</div>
          {EARNED.map((e) => (
            <div key={e.label} className="hdm-barrow hdm-barrow--earned">
              <span className="hdm-barlabel">{e.label}</span>
              <span className="hdm-bar-track hdm-bar-track--earned">
                <span
                  className="hdm-bar-fill hdm-t"
                  style={{ width: `${e.pct * 100}%`, background: e.color }}
                />
              </span>
              <span className="hdm-mono hdm-barval">{Math.round(e.pct * 100)}%</span>
            </div>
          ))}
        </section>

        {/* Single teaser row: fills the rail's remaining height without
            reintroducing a dense block. */}
        <section className="hdm-card hdm-lead">
          <span className="hdm-block-title hdm-mono">LEADERBOARD</span>
          <span className="hdm-mono hdm-lead-rank">#4,182 of 12.4K</span>
        </section>
      </div>
    </div>
  );
}

export default HeroDashboardMock;
