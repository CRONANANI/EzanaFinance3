'use client';

import { useEffect, useRef } from 'react';
import './portfolio-signal-card.css';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';

/**
 * "Your portfolio" signal card — moved out of the landing hero (where it was
 * `.lp-card`, a translucent white glass panel floating over the dotted map) and
 * into the pinned Seven-Dimensions section.
 *
 * Two things changed in the move and nothing else:
 *   1. It is now a standard Ezana token card (--surface-card / --border-primary)
 *      instead of a white glass panel, because it no longer sits on the dark map
 *      and has to work in BOTH landing dark-lock and body.light-mode.
 *   2. The value count-up now fires on first intersection rather than on mount,
 *      since the card is below the fold.
 *
 * Content is illustrative marketing data, not a live fetch — same as before.
 */

/* The portfolio total the count-up lands on, and where it starts from.

   START is a real starting balance rather than a fraction of the target. It
   used to be `TARGET * 0.86`, which made the climb a fixed 14% of whatever
   the total happened to be — a bar that barely moves and says nothing. From
   8,412.37 to 55,318.26 the counter actually travels, which is the point of
   having one.

   The delta caption below is tied to these: 55,318.26 - 1,068.72 puts the
   prior close at 54,249.54, and 1,068.72 of that is +1.97%. Change either
   number and that line has to move with it. */
const TARGET = 55318.26;
const START = 8412.37;
const fmtUSD = (n) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* JSON snippet builders: `j` is a syntax-highlighted span, `raw` is plain text.
   Every space/newline is explicit so the rendered <pre> matches exactly. */
const j = (c, t) => ({ c, t });
const raw = (t) => ({ t });

/* One snippet: `"signal": <name>,\n<k1>: <v1>, <k2>: <v2>`. */
const sig = (name, k1, v1, k2, v2) => [
  j('k', '"signal"'),
  raw(': '),
  j('s', `"${name}"`),
  raw(',\n'),
  j('k', `"${k1}"`),
  raw(': '),
  v1,
  raw(', '),
  j('k', `"${k2}"`),
  raw(': '),
  v2,
];

/* Three signals per dimension, 21 unique snippets. The card always shows the
   trio of the dimension on screen; nothing repeats between dimensions (no
   `signal` value appears twice in this file; scripts/check-signal-uniqueness.mjs
   enforces it). Values are illustrative marketing placeholders. Keys mirror
   DATASET_TAXONOMY ids. */
const SIGNALS_BY_DIMENSION = {
  capitol: [
    sig('government_contracts', 'ticker', j('s', '"PLTR"'), 'value', j('s', '"$27M"')),
    sig('congress_trade', 'chamber', j('s', '"house"'), 'side', j('n', 'buy')),
    sig('lobbying_spend', 'sector', j('s', '"defense"'), 'Δqoq', j('n', '+18%')),
  ],
  titans: [
    sig('institutional_sell', 'filing', j('s', '"13F"'), 'Δposition', j('neg', '-1.2M')),
    sig('new_position', 'manager', j('s', '"macro_fund"'), 'weight', j('n', '2.4%')),
    sig('insider_buy', 'form', j('s', '"4"'), 'shares', j('n', '+40k')),
  ],
  eyes: [
    sig('satellite_footfall', 'sector', j('s', '"retail"'), 'Δ30d', j('n', '+4.8%')),
    sig('parking_density', 'chain', j('s', '"big_box"'), 'Δwow', j('neg', '-2.1%')),
    sig('tanker_traffic', 'basin', j('s', '"gulf"'), 'vessels', j('n', '+11')),
  ],
  whispers: [
    sig('consumer_spending', 'sector', j('s', '"discretionary"'), 'Δ30d', j('n', '+6.2%')),
    sig('app_downloads', 'category', j('s', '"fintech"'), 'rank_Δ', j('n', '+3')),
    sig('search_interest', 'term', j('s', '"refinance"'), 'Δ7d', j('neg', '-9%')),
  ],
  hive: [
    sig('retail_chatter', 'cohort', j('s', '"retail_boards"'), 'mentions_7d', j('n', '+212%')),
    sig('copy_flow', 'strategy', j('s', '"momentum"'), 'followers', j('n', '+1.4k')),
    sig('prediction_market', 'event', j('s', '"rate_cut"'), 'odds', j('n', '64%')),
  ],
  lighthouse: [
    sig('shipping_volume', 'route', j('s', '"transpacific"'), 'Δ30d', j('neg', '-3.1%')),
    sig('fx_reserve_shift', 'region', j('s', '"gcc"'), 'Δqoq', j('n', '+5%')),
    sig('sovereign_spread', 'issuer', j('s', '"em_10y"'), 'bps', j('neg', '+35')),
  ],
  regulatory: [
    sig('rule_filing', 'agency', j('s', '"SEC"'), 'stage', j('s', '"comment_period"')),
    sig(
      'antitrust_review',
      'deal',
      j('s', '"vertical_merger"'),
      'status',
      j('s', '"second_request"'),
    ),
    sig('tariff_schedule', 'hs_code', j('s', '"8542"'), 'rate_Δ', j('n', '+10pp')),
  ],
};

const SIGNAL_TITLES = {
  capitol: ['Contract award', 'Congressional trade', 'Lobbying spend'],
  titans: ['13F change', 'New institutional position', 'Insider filing'],
  eyes: ['Satellite footfall', 'Parking density', 'Tanker traffic'],
  whispers: ['Card spend', 'App downloads', 'Search interest'],
  hive: ['Retail chatter', 'Copy flow', 'Prediction market'],
  lighthouse: ['Shipping volume', 'Reserve shift', 'Sovereign spread'],
  regulatory: ['Rule filing', 'Antitrust review', 'Tariff schedule'],
};

export function PortfolioSignalCard({ activeLabel = null, activeColor = 'var(--emerald)' }) {
  /* The card always shows exactly the three snippets of the dimension on
     screen. With nothing pinned (which is also what the server renders:
     DimensionScrollSection starts unpinned, so activeLabel is null on first
     paint) it rests on the first taxonomy dimension's trio. */
  const activeIdx = DATASET_TAXONOMY.findIndex((d) => d.label === activeLabel);
  const dim = activeIdx === -1 ? DATASET_TAXONOMY[0] : DATASET_TAXONOMY[activeIdx];
  const trio = SIGNALS_BY_DIMENSION[dim.id] || [];
  const signals = trio.map((json, i) => ({
    id: `${dim.id}-${i}`,
    name: SIGNAL_TITLES[dim.id]?.[i] ? `${dim.label}: ${SIGNAL_TITLES[dim.id][i]}` : dim.label,
    json,
  }));
  const valueRef = useRef(null);
  const ranRef = useRef(false);

  useEffect(() => {
    const el = valueRef.current;
    if (!el || typeof window === 'undefined' || !window.matchMedia) return undefined;
    // The DOM already ships the final value as text, so no-JS / reduced-motion
    // visitors read the correct number with no animation at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;

    let frame;
    const run = () => {
      if (ranRef.current) return;
      ranRef.current = true;
      /* 2,200 rather than 1,400: the range is now more than five times what
         it was, and at the old duration the digits blur past rather than
         reading as a climb. Same cubic ease-out. */
      const dur = 2200;
      const begin = START;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmtUSD(begin + (TARGET - begin) * e);
        if (p < 1) frame = requestAnimationFrame(step);
        else el.textContent = fmtUSD(TARGET);
      };
      frame = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className="psc-card"
      role="group"
      aria-label="Portfolio signal preview"
      /* Lives on the root now rather than on .psc-foot, so the leading signal
         block can read the active dimension's colour too. */
      style={{ '--psc-accent': activeColor }}
    >
      <div className="psc-head">
        <div className="psc-id">
          <span className="psc-flag" aria-hidden>
            <i className="bi bi-bar-chart-line" />
          </span>
          <div className="psc-name">Your portfolio</div>
        </div>
        <div className="psc-tag">
          <i className="bi bi-check-circle-fill" aria-hidden /> Synced
        </div>
      </div>

      <div className="psc-value">
        <div className="psc-bigval" ref={valueRef}>
          {fmtUSD(TARGET)}
        </div>
        <div className="psc-delta">
          +$1,068.72 <span>(+1.97%)</span>
        </div>
      </div>

      <div className="psc-sentiment">
        <div className="psc-sent-top">
          <span className="psc-sent-label">Portfolio sentiment rating</span>
          <span className="psc-sent-rating">
            Bullish <b>78</b>
            <span className="psc-sent-max">/100</span>
          </span>
        </div>
        <div className="psc-sent-bar">
          <i style={{ width: '78%' }} />
        </div>
      </div>

      <div className="psc-why">
        <span className="psc-why-windfall">Windfalls</span> and{' '}
        <span className="psc-why-headwind">headwinds</span> to watch out for:
      </div>

      {/* Keying the container by the dimension restarts the entry animation
          each time the dimension on screen changes. */}
      <div className="psc-signals" key={dim.id}>
        {signals.map((s, i) => (
          <div
            className={`psc-signal${activeIdx !== -1 && i === 0 ? ' psc-signal--active' : ''}`}
            key={s.id}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="psc-sig-head">
              <span className="psc-sig-name">{s.name}</span>
            </div>
            <pre className="psc-sig-json">
              {s.json.map((seg, i2) =>
                seg.c ? (
                  <span key={i2} className={seg.c}>
                    {seg.t}
                  </span>
                ) : (
                  seg.t
                ),
              )}
            </pre>
          </div>
        ))}
      </div>

      {/* Live tie-in to the pinned right column. Purely additive: the card's
          position and content are constant; only this one strip reflects which
          dimension is on screen. Delete this block to make the card 100% static. */}
      <div className="psc-foot">
        <span className="psc-foot-label">Now weighing</span>
        <span className="psc-foot-dim">{activeLabel || 'All seven dimensions'}</span>
      </div>
    </div>
  );
}

export default PortfolioSignalCard;
