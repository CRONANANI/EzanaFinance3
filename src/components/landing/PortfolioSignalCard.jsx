'use client';

import { useEffect, useRef } from 'react';
import './portfolio-signal-card.css';

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

const TARGET = 124873.4;
const fmtUSD = (n) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* JSON snippet builders — `j` is a syntax-highlighted span, `raw` is plain text.
   Every space/newline is explicit so the rendered <pre> matches exactly. */
const j = (c, t) => ({ c, t });
const raw = (t) => ({ t });

const SIGNALS = [
  {
    name: 'Consumer Whispers',
    json: [
      j('k', '"signal"'),
      raw(': '),
      j('s', '"consumer_spending"'),
      raw(',\n'),
      j('k', '"sector"'),
      raw(': '),
      j('s', '"discretionary"'),
      raw(', '),
      j('k', '"Δ30d"'),
      raw(': '),
      j('n', '+6.2%'),
    ],
  },
  {
    name: 'Capitol Watch',
    json: [
      j('k', '"signal"'),
      raw(': '),
      j('s', '"government_contracts"'),
      raw(',\n'),
      j('k', '"ticker"'),
      raw(': '),
      j('s', '"PLTR"'),
      raw(', '),
      j('k', '"value"'),
      raw(': '),
      j('s', '"$27M"'),
    ],
  },
  {
    name: 'Titans Shadow',
    json: [
      j('k', '"signal"'),
      raw(': '),
      j('s', '"institutional_sell"'),
      raw(',\n'),
      j('k', '"filing"'),
      raw(': '),
      j('s', '"13F"'),
      raw(', '),
      j('k', '"Δposition"'),
      raw(': '),
      j('neg', '-1.2M'),
    ],
  },
];

export function PortfolioSignalCard({ activeLabel = null, activeColor = 'var(--emerald)' }) {
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
      const dur = 1400;
      const begin = TARGET * 0.86;
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
    <div className="psc-card" role="group" aria-label="Portfolio signal preview">
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
          +$2,418.09 <span>(+1.97%)</span>
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

      <div className="psc-signals">
        {SIGNALS.map((s) => (
          <div className="psc-signal" key={s.name}>
            <div className="psc-sig-head">
              <span className="psc-sig-name">{s.name}</span>
              <span className="psc-sig-analyze">Analyze</span>
            </div>
            <pre className="psc-sig-json">
              {s.json.map((seg, i) =>
                seg.c ? (
                  <span key={i} className={seg.c}>
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
      <div className="psc-foot" style={{ '--psc-accent': activeColor }}>
        <span className="psc-foot-label">Now weighing</span>
        <span className="psc-foot-dim">{activeLabel || 'All seven dimensions'}</span>
      </div>
    </div>
  );
}

export default PortfolioSignalCard;
