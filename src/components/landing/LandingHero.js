'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import { HeroDottedMap } from './HeroDottedMap';
import './landing-hero.css';

// The dotted continents render as a static, SSR'd layer (HeroDottedMap) so they
// paint with the page — in step with the inline signal-routes overlay — instead
// of popping in a few seconds later from the old `ssr:false` world-map chunk.
// The hero never used the interactive map's pan/zoom/hover, so none of that
// (or its ~1,300-line chunk) ships here anymore. The heavy interactive
// <WorldMap> is unchanged on /market-analysis.

/**
 * Landing hero — "Global Signal" (Column × Ezana hybrid).
 *
 * A full-bleed band: a dotted world map with animated emerald signal routes
 * behind a left copy column (headline → lead → sub → CTAs → fine print) and a
 * floating portfolio-intelligence card. The card content is illustrative
 * marketing data, not a live fetch. The global navbar lives in the layout and
 * is untouched.
 */

/* Hero headline, split into balanced .lp-line rows (each stays on one line on
   desktop — see white-space:nowrap). Words are flattened to per-word .w spans
   for the staggered rise animation; the emphasized tail carries `mark`. */
const HEADLINE = [
  { words: ['The', 'edge', 'belongs', 'to'] },
  { words: ['the', 'informed,', 'where'] },
  { words: ['knowledge', 'compounds'], mark: true },
  { words: ['into opportunity'], mark: true },
];

const TARGET = 124873.4;
const fmtUSD = (n) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* JSON snippet builders — `j` is a syntax-highlighted span, `t` is raw text.
   Every space/newline is explicit so the rendered <pre> matches exactly. */
const j = (c, t) => ({ c, t });
const t = (text) => ({ t: text });

const SIGNALS = [
  {
    name: 'Consumer Whispers',
    json: [
      j('p', '{'),
      t(' '),
      j('k', '"signal"'),
      t(': '),
      j('s', '"consumer_spending"'),
      t(',\n  '),
      j('k', '"sector"'),
      t(': '),
      j('s', '"discretionary"'),
      t(', '),
      j('k', '"Δ30d"'),
      t(': '),
      j('n', '+6.2%'),
      t(' '),
      j('p', '}'),
    ],
  },
  {
    name: 'Capitol Watch',
    json: [
      j('p', '{'),
      t(' '),
      j('k', '"signal"'),
      t(': '),
      j('s', '"government_contracts"'),
      t(',\n  '),
      j('k', '"funding_agency"'),
      t(': '),
      j('s', '"Department of Agriculture"'),
      t(',\n  '),
      j('k', '"ticker"'),
      t(': '),
      j('s', '"PLTR"'),
      t(', '),
      j('k', '"value"'),
      t(': '),
      j('s', '"$27M"'),
      t(' '),
      j('p', '}'),
    ],
  },
  {
    name: 'Titans Shadow',
    json: [
      j('p', '{'),
      t(' '),
      j('k', '"signal"'),
      t(': '),
      j('s', '"institutional_sell"'),
      t(',\n  '),
      j('k', '"filing"'),
      t(': '),
      j('s', '"13F"'),
      t(', '),
      j('k', '"Δposition"'),
      t(': '),
      j('neg', '-1.2M'),
      t(' '),
      j('p', '}'),
    ],
  },
];

/* Decorative signal routes overlaid on the dotted world map. Rendered as raw
   markup so the SMIL <animateMotion> comets and route gradient stay
   byte-identical to the design source; all colors resolve from theme tokens
   via CSS classes. The dotted continents themselves are now the
   market-analysis <WorldMap> (real continent shapes), rendered below this
   overlay — see the .lp-map block in LandingHero(). */
const ROUTES_HTML = `
  <svg class="lp-routes" viewBox="0 0 1840 820" preserveAspectRatio="none">
    <defs>
      <linearGradient id="lpRouteGrad" x1="0" y1="0" x2="1" y2="0">
        <stop class="lp-grad-a" offset="0" />
        <stop class="lp-grad-b" offset="1" />
      </linearGradient>
    </defs>
    <path d="M 542 237 Q 700 120 920 172" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
    <path d="M 920 172 Q 1120 230 1290 352" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
    <circle r="4.5" class="lp-comet">
      <animateMotion dur="3.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"
        path="M 542 237 Q 700 120 920 172 Q 1120 230 1290 352" />
    </circle>
    <g class="lp-node">
      <circle cx="542" cy="237" r="4" class="lp-node-dot" />
      <circle cx="542" cy="237" r="4" stroke-width="1.5" class="lp-ping" />
    </g>
    <g class="lp-node">
      <circle cx="920" cy="172" r="4" class="lp-node-dot" />
      <circle cx="920" cy="172" r="4" stroke-width="1.5" class="lp-ping" style="animation-delay:1.1s" />
    </g>
    <g class="lp-node">
      <circle cx="1290" cy="352" r="5" class="lp-node-dot" />
      <circle cx="1290" cy="352" r="5" stroke-width="1.5" class="lp-ping" style="animation-delay:2s" />
    </g>
    <g class="lp-routes-extra">
      <path d="M 682 624 Q 730 430 542 237" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <path d="M 964 180 Q 718 116 472 230" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <path d="M 1203 330 Q 840 168 472 230" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <path d="M 1063 640 Q 660 560 294 254" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <circle r="3.8" class="lp-comet"><animateMotion dur="4.6s" begin="0.4s" repeatCount="indefinite" path="M 682 624 Q 730 430 542 237" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="5.2s" begin="1.2s" repeatCount="indefinite" path="M 964 180 Q 718 116 472 230" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="6s" begin="0.8s" repeatCount="indefinite" path="M 1203 330 Q 840 168 472 230" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="5.6s" begin="2s" repeatCount="indefinite" path="M 1063 640 Q 660 560 294 254" /></circle>
      <g class="lp-node"><circle cx="682" cy="624" r="3.5" class="lp-node-dot" /><circle cx="682" cy="624" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.3s" /></g>
      <g class="lp-node"><circle cx="964" cy="180" r="3.5" class="lp-node-dot" /><circle cx="964" cy="180" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.4s" /></g>
      <g class="lp-node"><circle cx="1203" cy="330" r="3.5" class="lp-node-dot" /><circle cx="1203" cy="330" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.9s" /></g>
      <g class="lp-node"><circle cx="1063" cy="640" r="3.5" class="lp-node-dot" /><circle cx="1063" cy="640" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.8s" /></g>
      <g class="lp-node"><circle cx="472" cy="230" r="4" class="lp-node-dot" /><circle cx="472" cy="230" r="4" stroke-width="1.5" class="lp-ping" style="animation-delay:1.1s" /></g>
      <g class="lp-node"><circle cx="294" cy="254" r="4" class="lp-node-dot" /><circle cx="294" cy="254" r="4" stroke-width="1.5" class="lp-ping" style="animation-delay:2.3s" /></g>
    </g>
  </svg>
  <div class="lp-map-fade"></div>
`;

export function LandingHero() {
  const [go, setGo] = useState(false);
  // On phones the dotted continents read too faint, so darken/strengthen the dot
  // colour at mobile widths only (desktop stays at the lighter tuned value).
  const [mapDense, setMapDense] = useState(false);
  const valueRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 480px)');
    const apply = () => setMapDense(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const raf = requestAnimationFrame(() => setGo(true));

    // Portfolio value count-up (86% → 100% of target). The DOM already ships
    // the final value as text, so no-JS / reduced-motion users see it correct.
    let frame;
    let timer;
    const el = valueRef.current;
    if (el && !reduce) {
      const dur = 1400;
      const begin = TARGET * 0.86;
      const run = (start) => {
        const tick = (now) => {
          const p = Math.min(1, (now - start) / dur);
          const e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmtUSD(begin + (TARGET - begin) * e);
          if (p < 1) frame = requestAnimationFrame(tick);
          else el.textContent = fmtUSD(TARGET);
        };
        frame = requestAnimationFrame(tick);
      };
      timer = setTimeout(() => run(performance.now()), 350);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`lp-hero${go ? ' lp-go' : ''}`}>
      {/* Background: dotted world map (market-analysis WorldMap, real
          continents, emerald-on-dark) + signal-routes overlay. The wrapper
          holds the exact footprint the old world-dots.png occupied
          (1840×820 aspect) so the hero layout doesn't shift. */}
      <div className="lp-map" aria-hidden="true">
        <div className="lp-map-worldmap">
          <HeroDottedMap
            dotColor={mapDense ? 'rgba(4, 120, 87, 0.92)' : 'rgba(5, 150, 105, 0.7)'}
          />
        </div>
        <div className="lp-map-layers" dangerouslySetInnerHTML={{ __html: ROUTES_HTML }} />
      </div>

      {/* Main band */}
      <div className="lp-band">
        <div className="lp-copy">
          <h1 className="lp-title">
            {(() => {
              let i = 0;
              return HEADLINE.map((line, li) => (
                <span className="lp-line" key={li}>
                  {line.words.map((word, wi) => {
                    const idx = i++;
                    return (
                      <Fragment key={wi}>
                        {wi > 0 && ' '}
                        <span className={line.mark ? 'w lp-mark' : 'w'} style={{ '--i': idx }}>
                          {word}
                        </span>
                      </Fragment>
                    );
                  })}
                </span>
              ));
            })()}
          </h1>

          <p className="lp-lead">Better data. Better decisions. Better returns.</p>
          <p className="lp-sub">
            Ezana turns scattered market signals into one clear read on your portfolio — the
            information edge once reserved for Wall Street, now built for you.
          </p>

          <div className="lp-actions">
            {/* Plain <a> (full-page nav) so the CTA reliably reaches the auth
                flow — matches the navbar's other cross-section marketing links. */}
            <a className="lp-btn-primary" href="/auth/signup">
              Get started
              <ArrowRight size={16} aria-hidden />
            </a>
            <button
              type="button"
              className="lp-btn-ghost"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('ezana:open-datasets-menu'));
                }
              }}
            >
              View datasets
            </button>
          </div>

          <p className="lp-note">Free to start · No brokerage required · Real-time disclosures</p>
        </div>

        {/* Floating intelligence card (illustrative marketing data) */}
        <div className="lp-card" role="group" aria-label="Portfolio signal preview">
          <div className="lp-card-head">
            <div className="lp-card-id">
              <span className="lp-flag">
                <BarChart3 size={16} aria-hidden />
              </span>
              <div>
                <div className="lp-card-name">Your portfolio</div>
              </div>
            </div>
            <div className="lp-card-tag">
              <CheckCircle2 size={12} aria-hidden /> Synced
            </div>
          </div>

          <div className="lp-card-value">
            <div className="lp-bigval" ref={valueRef}>
              {fmtUSD(TARGET)}
            </div>
            <div className="lp-delta">
              +$2,418.09 <span>(+1.97%)</span>
            </div>
          </div>

          <div className="lp-sentiment">
            <div className="lp-sent-top">
              <span className="lp-sent-label">Portfolio sentiment rating</span>
              <span className="lp-sent-rating">
                Bullish <b>78</b>
                <span className="lp-sent-max">/100</span>
              </span>
            </div>
            <div className="lp-sent-bar">
              <i style={{ width: '78%' }} />
            </div>
          </div>

          <div className="lp-why">
            <span className="lp-why-windfall">Windfalls</span> and{' '}
            <span className="lp-why-headwind">headwinds</span> to watch out for:
          </div>

          <div className="lp-signals">
            {SIGNALS.map((s) => (
              <div className="lp-signal" key={s.name}>
                <div className="lp-sig-head">
                  <span className="lp-sig-name">{s.name}</span>
                  <span className="lp-sig-analyze">Analyze</span>
                </div>
                <pre className="lp-sig-json">
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

          <div className="lp-card-foot">
            Ezana sources data across&nbsp;
            <a className="lp-foot-link" href="#resources">
              7 dimensions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
