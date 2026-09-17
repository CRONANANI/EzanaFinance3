/**
 * SocialLedgerSection — "Social investing / live ELO" landing section
 * (design concept 4a, "The Ledger + Tape").
 *
 * Three stacked pieces: centered copy → two-column ledger (event feed +
 * flat rating chart with cohort filters) → full-width Season Standings
 * band with an ELO event tape. All motion is CSS: feed rows and chart
 * draw share a 14s master loop, the tape scrolls at 30s, LIVE dots pulse
 * at 2s. prefers-reduced-motion shows the fully-rendered static state.
 * Data is static marketing content — no fetching.
 */

'use client';

import { useState } from 'react';
import './social-ledger.css';

// Chart geometry (viewBox 0 0 560 200). Your emerald line is constant
// across cohorts; the two grey comparison series swap per cohort.
const YOUR_LINE = [
  [0, 160],
  [80, 152],
  [160, 158],
  [240, 140],
  [320, 128],
  [400, 116],
  [480, 84],
  [560, 58],
];
const EVENT_MARKERS = [
  [320, 128],
  [480, 84],
];

const COHORTS = {
  friends: {
    label: 'Friends',
    caption: 'vs. 3 friends',
    lines: [
      {
        id: 'a',
        cls: 'sled-line--a',
        points: [
          [0, 72],
          [80, 66],
          [160, 70],
          [240, 60],
          [320, 58],
          [400, 52],
          [480, 46],
          [560, 44],
        ],
      },
      {
        id: 'b',
        cls: 'sled-line--b',
        points: [
          [0, 148],
          [80, 140],
          [160, 144],
          [240, 132],
          [320, 120],
          [400, 124],
          [480, 112],
          [560, 102],
        ],
      },
    ],
  },
  whales: {
    label: 'Whales',
    caption: 'vs. 13F whales',
    lines: [
      {
        id: 'a',
        cls: 'sled-line--a',
        points: [
          [0, 60],
          [80, 64],
          [160, 58],
          [240, 66],
          [320, 54],
          [400, 50],
          [480, 52],
          [560, 40],
        ],
      },
      {
        id: 'b',
        cls: 'sled-line--b',
        points: [
          [0, 120],
          [80, 118],
          [160, 124],
          [240, 110],
          [320, 114],
          [400, 104],
          [480, 96],
          [560, 90],
        ],
      },
    ],
  },
  politicians: {
    label: 'Politicians',
    caption: 'vs. Congress',
    lines: [
      {
        id: 'a',
        cls: 'sled-line--a',
        points: [
          [0, 96],
          [80, 90],
          [160, 98],
          [240, 86],
          [320, 92],
          [400, 78],
          [480, 72],
          [560, 66],
        ],
      },
      {
        id: 'b',
        cls: 'sled-line--b',
        points: [
          [0, 140],
          [80, 146],
          [160, 136],
          [240, 142],
          [320, 130],
          [400, 134],
          [480, 122],
          [560, 118],
        ],
      },
    ],
  },
};

const STANDINGS = [
  { rank: '01', name: 'Daniel R.', elo: '1512', delta: '—', deltaKind: 'flat', variant: 'top' },
  {
    rank: '02',
    name: 'You',
    handle: '@axum',
    elo: '1498',
    delta: '+24',
    deltaKind: 'up',
    variant: 'you',
  },
  { rank: '03', name: 'Maya K.', elo: '1470', badge: 'NEW' },
  { rank: '04', name: 'Priya S.', elo: '1441', delta: '-5', deltaKind: 'down' },
];

const TAPE = [
  { delta: '+24 ELO', text: 'Won ‘Q3 Momentum Sprint’' },
  { delta: '+5 ELO', text: '7-day login streak' },
  { delta: '+12 ELO', text: 'Top 10% weekly P&L' },
  { delta: '+8 ELO', text: 'Research post upvoted' },
  { text: 'Maya K. joined your rankings' },
];

const toPoints = (pts) => pts.map((p) => p.join(',')).join(' ');
const lastPoint = (pts) => pts[pts.length - 1];

export function SocialLedgerSection() {
  const [cohort, setCohort] = useState('friends');
  const active = COHORTS[cohort];
  const youEnd = lastPoint(YOUR_LINE);

  return (
    <section className="sled-section" aria-labelledby="sled-heading">
      {/* ── 1. Copy block ── */}
      <div className="sled-copy">
        <p className="sled-eyebrow">Social investing</p>
        <h2 id="sled-heading" className="sled-heading">
          Every move is on the record.
        </h2>
        <p className="sled-sub">
          Add a friend and your ratings start writing themselves: wins, streaks and research, each
          one a line in the ledger.
        </p>
      </div>

      {/* ── 2. Two-column ledger ── */}
      <div className="sled-ledger">
        {/* Left: event feed. Rows enter one by one on the 14s master loop. */}
        <div className="sled-feed">
          <div className="sled-row">
            <span className="sled-avatar">M</span>
            <span className="sled-row-body">
              <strong>Maya K.</strong> sent you a friend request
            </span>
            <span className="sled-time">09:41</span>
          </div>
          <div className="sled-row sled-row--wash">
            <span className="sled-avatar sled-avatar--check">✓</span>
            <span className="sled-row-body">
              Accepted: <strong>Maya joined your rankings</strong> at{' '}
              <span className="sled-num">1470</span>
            </span>
            <span className="sled-time">09:42</span>
          </div>
          <div className="sled-row">
            <span className="sled-delta">+12</span>
            <span className="sled-row-body">
              Top 10% weekly P&amp;L · <span className="sled-num">1462 → 1474</span>
            </span>
            <span className="sled-time">FRI</span>
          </div>
          <div className="sled-row">
            <span className="sled-delta">+24</span>
            <span className="sled-row-body">
              Won &lsquo;Q3 Momentum Sprint&rsquo; · <span className="sled-num">1474 → 1498</span>
            </span>
            <span className="sled-time">MON</span>
          </div>
          <div className="sled-row sled-row--wash">
            <span className="sled-delta">▲ 02</span>
            <span className="sled-row-body">
              You passed Priya S. · now <strong>#2 in your circle</strong>
            </span>
            <span className="sled-time">MON</span>
          </div>
        </div>

        {/* Right: flat rating chart. No card, no border — sits on the page. */}
        <div className="sled-chart">
          <div className="sled-chart-head">
            <span className="sled-chart-label">Your rating · @axum</span>
            <div className="sled-chart-controls">
              {Object.entries(COHORTS).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  className={`sled-pill${cohort === key ? ' is-active' : ''}`}
                  aria-pressed={cohort === key}
                  onClick={() => setCohort(key)}
                >
                  {c.label}
                </button>
              ))}
              <span className="sled-live">
                <i className="sled-live-dot" aria-hidden />
                LIVE
              </span>
            </div>
          </div>

          <div className="sled-rating">
            <span className="sled-rating-value">1498</span>
            <span className="sled-rating-delta">+36 this week</span>
            <span className="sled-rating-vs">{active.caption}</span>
          </div>

          {/* key={cohort} remounts the SVG so the draw animation restarts on
              cohort switch — the "quick redraw" from the design spec. */}
          <svg key={cohort} className="sled-svg" viewBox="0 0 560 200" aria-hidden>
            <defs>
              <linearGradient id="sledFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line className="sled-grid" x1="0" y1="50" x2="560" y2="50" />
            <line className="sled-grid" x1="0" y1="100" x2="560" y2="100" />
            <line className="sled-grid" x1="0" y1="150" x2="560" y2="150" />
            <path
              d={`M${toPoints(YOUR_LINE).replace(/ /g, ' L')} L560,200 0,200 Z`}
              fill="url(#sledFill)"
            />
            {active.lines.map((l) => (
              <polyline key={l.id} className={`sled-line ${l.cls}`} points={toPoints(l.points)} />
            ))}
            <polyline className="sled-line sled-line--you" points={toPoints(YOUR_LINE)} />
            {EVENT_MARKERS.map(([x, y]) => (
              <circle key={x} className="sled-marker" cx={x} cy={y} r="4" />
            ))}
            <circle className="sled-end sled-end--you" cx={youEnd[0]} cy={youEnd[1]} r="5" />
            {active.lines.map((l) => {
              const [x, y] = lastPoint(l.points);
              return (
                <circle
                  key={`end-${l.id}`}
                  className={`sled-end sled-end--${l.id}`}
                  cx={x}
                  cy={y}
                  r="4"
                />
              );
            })}
          </svg>

          <div className="sled-axis">
            <span>Season 4 · Week 01</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* ── 3. Season standings band (full-width) ── */}
      <div className="sled-band">
        <div className="sled-band-inner">
          <div className="sled-band-head">
            <span className="sled-eyebrow sled-eyebrow--left">Season 4 standings</span>
            <span className="sled-live">
              <i className="sled-live-dot" aria-hidden />
              LIVE
            </span>
          </div>

          <div className="sled-tiles">
            {STANDINGS.map((p) => (
              <div
                key={p.rank}
                className={[
                  'sled-tile',
                  p.variant === 'top' && 'sled-tile--top',
                  p.variant === 'you' && 'sled-tile--you',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="sled-tile-head">
                  <span className="sled-tile-rank">{p.rank}</span>
                  {p.badge ? (
                    <span className="sled-tile-badge">{p.badge}</span>
                  ) : (
                    <span className={`sled-tile-delta sled-tile-delta--${p.deltaKind}`}>
                      {p.delta}
                    </span>
                  )}
                </div>
                <div className="sled-tile-name">
                  {p.name}
                  {p.handle ? <span className="sled-tile-handle"> {p.handle}</span> : null}
                </div>
                <div className="sled-tile-elo">{p.elo}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Event tape — duplicated once; translateX(0 → -50%) at 30s linear.
            The spacing is a per-item margin rather than a flex gap: with a gap
            the track holds 9 gaps for 10 items, so half its width is not a
            whole number of items and the loop seams. A margin on every item
            makes the two halves identical, so -50% lands exactly on the
            duplicate and the tape is genuinely seamless. */}
        <div className="sled-tape" aria-hidden>
          <div className="sled-tape-track">
            {[...TAPE, ...TAPE].map((e, i) => (
              <span className="sled-tape-item" key={i}>
                {e.delta ? <span className="sled-tape-delta">{e.delta}</span> : null} {e.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SocialLedgerSection;
