'use client';

import './hero-dashboard-mock.css';

/* Miniature, living two-panel mockup of the authenticated dashboard home
   (/home, the "broadsheet") for the hero iMac. Mirrors the real page's
   Band II "Positions & progress" board on the left (holdings table with
   the real SYMBOL / NAME / DAY / VALUE / WEIGHT / 7-DAY columns, the
   pagination footer, the sector-breakdown and position-P&L blocks, and
   the watchlist) and the ELO rating plus Ways to improve rail on the
   right (tier pill, rating over 10,000, progress to the next tier, and
   the real improvement paths from ProfileEloCard).

   Deterministic: every frame-to-frame change derives from integer `tick`
   via seeded sin (no Math.random). Decorative: the parent composition is
   aria-hidden with pointer-events none. Values, holdings, and watchlist
   rows are illustrative, not attributed to any real account. */

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
];

const SECTORS = [
  { label: 'Technology', pct: 46.6, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Energy', pct: 21.3, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Financials', pct: 14.8, color: 'var(--emerald)' },
];

/* Position P&L: base dollar gain per position (negative = loss). */
const PNL = [1840, 1120, 760, -320, 540, 280];

/* Two rows: the screen's vertical budget at the smallest scale, where
   fractional-scale line rounding costs ~15 design px, does not fit three. */
const WATCHLIST = [
  { sym: 'AMD', name: 'Adv. Micro', px: 214.8, base: 1.1 },
  { sym: 'TSM', name: 'Taiwan Semi', px: 268.4, base: 0.7 },
];

/* The real improvement paths (ProfileEloCard IMPROVEMENT_PATHS), trimmed
   to what fits the rail at mockup size. Point ranges use plain hyphens. */
const IMPROVE = [
  {
    ch: 'L',
    title: 'Complete a course module',
    pts: '+5-15',
    desc: 'Bronze courses give ELO each',
  },
  { ch: 'A', title: 'Maintain your day streak', pts: '+1-5', desc: 'Bonus +5 every 7 days' },
  {
    ch: 'P',
    title: 'Beat the market this month',
    pts: '+50-200',
    desc: 'Outperforming SPY earns ELO',
  },
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
            <span>PAGE 1 OF 2 · 10 TOTAL</span>
            <span className="hdm-pager-btns">
              <i className="hdm-pill" />
              <i className="hdm-pill" />
            </span>
          </div>
        </div>

        <div className="hdm-twoup">
          <section className="hdm-block">
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

          <section className="hdm-block">
            <div className="hdm-block-title hdm-mono">POSITION P&amp;L</div>
            <div className="hdm-pnl">
              {PNL.map((base, i) => {
                /* One bar extends slightly each tick. */
                const grow = i === tick % PNL.length ? 1.14 : 1;
                const v = Math.round(base * grow);
                const up = v >= 0;
                const h = Math.min(100, (Math.abs(v) / 2100) * 100);
                return (
                  <span key={i} className="hdm-pnl-col">
                    <span className="hdm-pnl-bar-wrap">
                      <span
                        className={`hdm-pnl-bar hdm-t ${up ? 'hdm-pnl-bar--up' : 'hdm-pnl-bar--down'}`}
                        style={{ height: `${Math.max(8, h)}%` }}
                      />
                    </span>
                    <span className={`hdm-mono hdm-pnl-val ${up ? 'hdm-up' : 'hdm-down'}`}>
                      {up ? '+' : '-'}$
                      {Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}K` : Math.abs(v)}
                    </span>
                  </span>
                );
              })}
            </div>
          </section>
        </div>

        <section className="hdm-block hdm-watch">
          <div className="hdm-block-head">
            <span className="hdm-block-title hdm-mono">WATCHLIST</span>
            <span className="hdm-catpill hdm-mono">Semis</span>
          </div>
          {WATCHLIST.map((w, i) => {
            const d = w.base + (seeded(tick * 3 + i * 7) - 0.5) * 0.3;
            const up = d >= 0;
            const px = w.px + (seeded(tick + i * 5) - 0.5) * 1.4;
            return (
              <div key={w.sym} className="hdm-wrow">
                <span className="hdm-mono hdm-sym">{w.sym}</span>
                <span className="hdm-name">{w.name}</span>
                <span className="hdm-mono hdm-r hdm-val hdm-t">{px.toFixed(2)}</span>
                <span className={`hdm-mono hdm-r hdm-t ${up ? 'hdm-up' : 'hdm-down'}`}>
                  {up ? '+' : ''}
                  {d.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </section>
      </div>

      {/* ── RIGHT: ELO rating + Ways to improve rail ── */}
      <div className="hdm-rail">
        <section className="hdm-card">
          <div className="hdm-block-head">
            <span className="hdm-block-title hdm-mono">ELO RATING</span>
            <span className="hdm-link hdm-mono">Leaderboard</span>
          </div>
          <div className="hdm-elo-row">
            <span className="hdm-mono hdm-elo-current hdm-t">{elo}</span>
            <span className="hdm-mono hdm-elo-suffix">/ 10,000</span>
          </div>
          <div className="hdm-elo-tier">
            <span className="hdm-tierdot" />
            <span className="hdm-tierlabel">Novice</span>
            <span className="hdm-mono hdm-elo-peak">PEAK 240</span>
          </div>
          <span className="hdm-bar-track">
            <span
              className="hdm-bar-fill hdm-t"
              style={{ width: `${(pctToNext * 100).toFixed(1)}%`, background: 'var(--emerald)' }}
            />
          </span>
          <div className="hdm-elo-ends hdm-mono">
            <span>0-999 BAND</span>
            <span>{1000 - elo} TO APPRENTICE</span>
          </div>
          <div className="hdm-block-title hdm-mono hdm-earned-title">EARNED BY CATEGORY</div>
          {EARNED.map((e) => (
            <div key={e.label} className="hdm-barrow">
              <span className="hdm-barlabel">{e.label}</span>
              <span className="hdm-bar-track">
                <span
                  className="hdm-bar-fill hdm-t"
                  style={{ width: `${e.pct * 100}%`, background: e.color }}
                />
              </span>
            </div>
          ))}
        </section>

        <section className="hdm-card hdm-improve">
          <div className="hdm-block-title hdm-mono">WAYS TO IMPROVE</div>
          {IMPROVE.map((it) => (
            <div key={it.ch} className="hdm-imp">
              <span className="hdm-chip hdm-mono">{it.ch}</span>
              <span className="hdm-imp-body">
                <span className="hdm-imp-head">
                  <span className="hdm-imp-title">{it.title}</span>
                  <span className="hdm-mono hdm-imp-pts">{it.pts}</span>
                </span>
                <span className="hdm-imp-desc">{it.desc}</span>
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default HeroDashboardMock;
