'use client';

import './hero-dashboard-mock.css';

/* Miniature, living two-panel mockup of the authenticated dashboard home
   (/home, the "broadsheet") for the hero iMac. Mirrors the real page's
   Band II "Positions & progress" board on the left (holdings table with
   the real SYMBOL / NAME / DAY / VALUE / WEIGHT / 7-DAY columns, the
   pagination footer, and the sector-breakdown band) and the ELO rating
   rail on the right (rating over 10,000, tier badge, progress to the
   next tier, earned-by-category, and a rotating achievement strip).

   Tier ladder: the platform's canonical table (@/lib/elo-tier-colors)
   tops out at Grandmaster = 3,000+, so the marketing walk below (3,205
   to 8,700 on the /10,000 scale) would never cross a tier on it. The
   mock therefore defines its own ILLUSTRATIVE ladder, scaled to the
   walk, so the hero shows tier promotions:
     3,000-4,999  Expert       (chart blue)
     5,000-6,999  Master       (chart purple)
     7,000+       Grandmaster  (emerald, reserved for the apex tier)
   Names reuse the product's Master/Grandmaster vocabulary; the pill,
   bar fill, band caption, and promotion achievements all derive from
   this ladder so the copy never contradicts the number.

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

/* Six rows: the real page's sectorRows plus the rolled-up remainder. The pcts
   here are the BASE mix; per-tick drift is layered on in sectorRowsFor(). */
const SECTORS = [
  { label: 'Technology', pct: 46.6, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Energy', pct: 21.3, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Financials', pct: 14.8, color: 'var(--emerald)' },
  { label: 'Industrials', pct: 9.7, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Healthcare', pct: 5.4, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Other', pct: 2.2, color: 'var(--emerald)' },
];

/* Earned-by-category: `base` is the floor-of-cycle percentage and `span` how
   far it trends up as the ELO climbs toward the peak, so the three bars rise
   with the rating (category percentages, not shares of 100). */
const EARNED = [
  { label: 'Learning', base: 34, span: 14, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Trading', base: 20, span: 11, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Community', base: 10, span: 8, color: 'var(--emerald)' },
];

/* The rating climbs from the floor to the peak over one slow cycle (~35
   ticks at the showcase's 2s cadence), then wraps INSTANTLY back to the
   floor and climbs again: a decline is never animated, the reset reads as a
   new cycle. Precomputed at module scope as a fixed table of seeded steps,
   normalised so the last entry lands exactly on the peak: the displayed
   value is then a pure lookup on `tick`, which keeps SSR and the first
   client render identical and keeps the walk free of Math.random. Steps
   land mostly in the +80 to +220 range with an occasional larger jump. */
const ELO_FLOOR = 3205;
const ELO_PEAK = 8700;
const ELO_DENOM = 10000;
const ELO_STEPS = 34;
const ELO_WALK = (() => {
  const steps = Array.from(
    { length: ELO_STEPS },
    (_, i) => 0.55 + seeded(i * 7.3) + (i % 7 === 5 ? 1.6 : 0),
  );
  const total = steps.reduce((a, b) => a + b, 0);
  const out = [ELO_FLOOR];
  let acc = 0;
  for (const step of steps) {
    acc += step;
    out.push(Math.round(ELO_FLOOR + ((ELO_PEAK - ELO_FLOOR) * acc) / total));
  }
  return out;
})();

/* Illustrative ladder for the walk above (see the header comment): pill tint,
   bar fill, and band captions all read from the active tier. `next` is the
   promotion threshold; the top tier is open-ended, its bar fills toward the
   walk's own peak so the apex still reads as progress completed. */
const MOCK_TIERS = [
  { label: 'Expert', min: 3000, next: 5000, color: 'var(--echo-chart-blue, var(--blue))' },
  { label: 'Master', min: 5000, next: 7000, color: 'var(--echo-chart-purple, var(--purple))' },
  { label: 'Grandmaster', min: 7000, next: null, color: 'var(--emerald)' },
];
function mockTierFor(elo) {
  for (let i = MOCK_TIERS.length - 1; i >= 0; i--) {
    if (elo >= MOCK_TIERS[i].min) return MOCK_TIERS[i];
  }
  return MOCK_TIERS[0];
}

/* The walk is read starting mid-cycle: tick 0 lands on the entry nearest
   5,850 (a MASTER value, never a promotion step). Under reduced motion the
   showcase's tick interval never starts, so that mid-cycle frame IS the
   permanent static render; animated visitors continue 5,850 -> 8,700, wrap,
   then see the full 3,205 -> 8,700 climb every cycle. */
const ELO_START = (() => {
  let best = 0;
  for (let i = 0; i < ELO_WALK.length; i++) {
    if (Math.abs(ELO_WALK[i] - 5850) < Math.abs(ELO_WALK[best] - 5850)) best = i;
  }
  while (
    best < ELO_WALK.length - 1 &&
    (best === 0 || mockTierFor(ELO_WALK[best]) !== mockTierFor(ELO_WALK[best - 1]))
  ) {
    best++;
  }
  return best;
})();

/* Illustrative platform events, not real entities or results. */
const ACHIEVEMENTS = [
  { chip: 'L', title: 'Completed: Options Fundamentals', pts: 150 },
  { chip: 'C', title: 'Finished 6th \u00b7 Weekly Trading Competition', pts: 230 },
  { chip: 'S', title: '7-day streak maintained', pts: 35 },
  { chip: 'T', title: 'Copy-trade request approved', pts: 120 },
];

/* Sector drift: a zero-sum chain of slow bounded sin waves nudges the five
   named sectors a fraction of a point per tick (rotation between sectors,
   not growth), and Other absorbs the one-decimal rounding drift so the list
   keeps summing to ~100. Ordering never changes. */
function sectorRowsFor(tick) {
  const d1 = Math.sin(tick * 0.75 + 1.7) * 0.75;
  const d2 = Math.sin(tick * 0.9 + 4.2) * 0.65;
  const d3 = Math.sin(tick * 1.05 + 2.6) * 0.55;
  const offsets = [d1, d2 - d1, -d2, d3, -d3];
  const named = SECTORS.slice(0, 5).map((s, i) => ({
    ...s,
    pct: Math.round((s.pct + offsets[i]) * 10) / 10,
  }));
  const other = {
    ...SECTORS[5],
    pct: Math.round((100 - named.reduce((a, s) => a + s.pct, 0)) * 10) / 10,
  };
  return [...named, other];
}

/* Earned-by-category: trends up with the ELO climb plus a small per-tick
   seeded wobble, so every tick visibly moves all three bars. */
function earnedRowsFor(tick, progress) {
  return EARNED.map((e, i) => ({
    ...e,
    pct: Math.round(e.base + e.span * progress + (seeded(tick * 2.7 + i * 5.1) - 0.5) * 2.4),
  }));
}

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
  /* ELO walks up through its cycle; the tier, band, caption, and the two
     synced panels all recompute from the displayed value so the whole screen
     reads as one living account and the copy never contradicts the number. */
  const idx = (tick + ELO_START) % ELO_WALK.length;
  const elo = ELO_WALK[idx];
  const prevElo = idx > 0 ? ELO_WALK[idx - 1] : null; // idx 0 is the instant wrap, not a step
  const tier = mockTierFor(elo);
  const next = tier.next ? MOCK_TIERS[MOCK_TIERS.indexOf(tier) + 1] : null;
  /* Fill = progress WITHIN the active band (near-0 right after a promotion,
     filling toward the next threshold; the open top band fills to the peak). */
  const bandCap = tier.next ?? ELO_PEAK;
  const bandPct = Math.min(1, Math.max(0, (elo - tier.min) / (bandCap - tier.min)));
  const progress = (elo - ELO_FLOOR) / (ELO_PEAK - ELO_FLOOR);
  const sectors = sectorRowsFor(tick);
  const earned = earnedRowsFor(tick, progress);
  /* On a promotion tick the achievement strip shows the crossing itself,
     then resumes its normal rotation on the next tick. */
  const promoted = prevElo !== null && mockTierFor(prevElo) !== tier;
  const achievement = promoted
    ? { chip: tier.label[0], title: `Promoted to ${tier.label}`, pts: elo - prevElo }
    : ACHIEVEMENTS[tick % ACHIEVEMENTS.length];

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
          {sectors.map((s) => (
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
            <span className="hdm-mono hdm-elo-current hdm-t">{elo.toLocaleString('en-US')}</span>
            <span className="hdm-mono hdm-elo-suffix">/ {ELO_DENOM.toLocaleString('en-US')}</span>
          </div>
          <div className="hdm-elo-tier">
            {/* Pill and dot wear the ACTIVE tier's color (hairline border +
                text, transparent fill); both cross-fade at each promotion. */}
            <span
              className="hdm-tierlabel hdm-t"
              style={{ color: tier.color, borderColor: tier.color }}
            >
              <span className="hdm-tierdot hdm-t" style={{ background: tier.color }} />
              {tier.label}
            </span>
            <span className="hdm-mono hdm-elo-peak">PEAK {ELO_PEAK.toLocaleString('en-US')}</span>
          </div>
          <span className="hdm-bar-track hdm-bar-track--elo">
            <span
              className="hdm-bar-fill hdm-t"
              style={{ width: `${(bandPct * 100).toFixed(1)}%`, background: tier.color }}
            />
          </span>
          <div className="hdm-elo-ends hdm-mono">
            <span>
              {tier.next
                ? `${tier.min.toLocaleString('en-US')}-${(tier.next - 1).toLocaleString('en-US')} BAND`
                : `${tier.min.toLocaleString('en-US')}+ BAND`}
            </span>
            <span>
              {next
                ? `${(next.min - elo).toLocaleString('en-US')} TO ${next.label.toUpperCase()}`
                : 'TOP TIER REACHED'}
            </span>
          </div>
        </section>

        <section className="hdm-card hdm-card--earned">
          <div className="hdm-block-title hdm-mono hdm-earned-title">EARNED BY CATEGORY</div>
          {earned.map((e) => (
            <div key={e.label} className="hdm-barrow hdm-barrow--earned">
              <span className="hdm-barlabel">{e.label}</span>
              <span className="hdm-bar-track hdm-bar-track--earned">
                <span
                  className="hdm-bar-fill hdm-t"
                  style={{ width: `${e.pct}%`, background: e.color }}
                />
              </span>
              <span className="hdm-mono hdm-barval">{e.pct}%</span>
            </div>
          ))}
        </section>

        {/* Rotating achievements: one at a time, swapped by the tick. The key
            is the entry itself, so React remounts the row and the slide-in
            replays on every change. Under reduced motion the tick never
            starts, so entry 0 renders statically and the slide is disabled. */}
        <section className="hdm-card hdm-card--ach">
          <div className="hdm-block-title hdm-mono">RECENT ACHIEVEMENTS</div>
          <div key={achievement.title} className="hdm-ach">
            <span className="hdm-ach-chip hdm-mono">{achievement.chip}</span>
            <span className="hdm-ach-title">{achievement.title}</span>
            <span className="hdm-mono hdm-ach-pts">+{achievement.pts} ELO</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HeroDashboardMock;
