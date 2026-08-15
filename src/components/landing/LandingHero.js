'use client';

import { Fragment, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { HeroDottedMap } from './HeroDottedMap';
import { HeroDeviceShowcase } from './HeroDeviceShowcase';
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
 * right-side social copy-trading device showcase (HeroDeviceShowcase — a tilted
 * MacBook, a foreground phone, and glass satellite cards). The old floating
 * portfolio-intelligence card now lives in DimensionScrollSection as
 * PortfolioSignalCard. The global navbar lives in the layout and is untouched.
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

/* Decorative signal routes overlaid on the dotted world map. Rendered as raw
   markup so the SMIL <animateMotion> comets and route gradient stay
   byte-identical to the design source; all colors resolve from theme tokens
   via CSS classes. The dotted continents themselves are now the
   market-analysis <WorldMap> (real continent shapes), rendered below this
   overlay — see the .lp-map block in LandingHero().

   Dot-grid → overlay transform (dotted-map viewBox 0 0 337 170, contain in
   1840×820): x = 107.24 + u·4.82353, y = v·4.82353. City endpoints were computed
   with dotted-map's getPin() at the production config — compute, don't eyeball. */
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
      <path d="M 1058 622 Q 660 540 324 221" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <circle r="3.8" class="lp-comet"><animateMotion dur="4.6s" begin="0.4s" repeatCount="indefinite" path="M 682 624 Q 730 430 542 237" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="5.2s" begin="1.2s" repeatCount="indefinite" path="M 964 180 Q 718 116 472 230" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="6s" begin="0.8s" repeatCount="indefinite" path="M 1203 330 Q 840 168 472 230" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="5.6s" begin="2s" repeatCount="indefinite" path="M 1058 622 Q 660 540 324 221" /></circle>
      <g class="lp-node"><circle cx="682" cy="624" r="3.5" class="lp-node-dot" /><circle cx="682" cy="624" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.3s" /></g>
      <g class="lp-node"><circle cx="964" cy="180" r="3.5" class="lp-node-dot" /><circle cx="964" cy="180" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.4s" /></g>
      <g class="lp-node"><circle cx="1203" cy="330" r="3.5" class="lp-node-dot" /><circle cx="1203" cy="330" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.9s" /></g>
      <g class="lp-node"><circle cx="1058" cy="622" r="3.5" class="lp-node-dot" /><circle cx="1058" cy="622" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.8s" /></g>
      <g class="lp-node"><circle cx="472" cy="230" r="4" class="lp-node-dot" /><circle cx="472" cy="230" r="4" stroke-width="1.5" class="lp-ping" style="animation-delay:1.1s" /></g>
      <g class="lp-node"><circle cx="324" cy="221" r="4" class="lp-node-dot" /><circle cx="324" cy="221" r="4" stroke-width="1.5" class="lp-ping" style="animation-delay:2.3s" /></g>
      <!-- China → Australia -->
      <path d="M 1509 334 Q 1680 500 1622 689" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <path d="M 1484 284 Q 1560 470 1482 656" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <!-- China → West Africa -->
      <path d="M 1472 380 Q 1200 300 937 464" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <!-- Sweden → Ukraine -->
      <path d="M 1009 138 Q 1050 160 1067 213" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <!-- Norway → Tanzania -->
      <path d="M 971 130 Q 1120 320 1108 526" fill="none" stroke="url(#lpRouteGrad)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 9" />
      <circle r="3.8" class="lp-comet"><animateMotion dur="5.4s" begin="0.6s" repeatCount="indefinite" path="M 1509 334 Q 1680 500 1622 689" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="6.2s" begin="1.6s" repeatCount="indefinite" path="M 1472 380 Q 1200 300 937 464" /></circle>
      <circle r="3.8" class="lp-comet"><animateMotion dur="6.8s" begin="2.4s" repeatCount="indefinite" path="M 971 130 Q 1120 320 1108 526" /></circle>
      <g class="lp-node"><circle cx="1509" cy="334" r="3.5" class="lp-node-dot" /><circle cx="1509" cy="334" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.5s" /></g>
      <g class="lp-node"><circle cx="1622" cy="689" r="3.5" class="lp-node-dot" /><circle cx="1622" cy="689" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.6s" /></g>
      <g class="lp-node"><circle cx="1484" cy="284" r="3.5" class="lp-node-dot" /><circle cx="1484" cy="284" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:2.1s" /></g>
      <g class="lp-node"><circle cx="1482" cy="656" r="3.5" class="lp-node-dot" /><circle cx="1482" cy="656" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.8s" /></g>
      <g class="lp-node"><circle cx="1472" cy="380" r="3.5" class="lp-node-dot" /><circle cx="1472" cy="380" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:2.6s" /></g>
      <g class="lp-node"><circle cx="937" cy="464" r="3.5" class="lp-node-dot" /><circle cx="937" cy="464" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.2s" /></g>
      <g class="lp-node"><circle cx="1009" cy="138" r="3.5" class="lp-node-dot" /><circle cx="1009" cy="138" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.2s" /></g>
      <g class="lp-node"><circle cx="1067" cy="213" r="3.5" class="lp-node-dot" /><circle cx="1067" cy="213" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:1.9s" /></g>
      <g class="lp-node"><circle cx="971" cy="130" r="3.5" class="lp-node-dot" /><circle cx="971" cy="130" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:2.9s" /></g>
      <g class="lp-node"><circle cx="1108" cy="526" r="3.5" class="lp-node-dot" /><circle cx="1108" cy="526" r="3.5" stroke-width="1.5" class="lp-ping" style="animation-delay:.9s" /></g>
    </g>
  </svg>
  <div class="lp-map-fade"></div>
`;

export function LandingHero() {
  const [go, setGo] = useState(false);
  // On phones the dotted continents read too faint, so darken/strengthen the dot
  // colour at mobile widths only (desktop stays at the lighter tuned value).
  // Initialize from the same media query the effect below watches, so the first
  // paint already uses the correct variant on mobile — no post-mount src swap /
  // repaint of the (now module-cached) map.
  const [mapDense, setMapDense] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 480px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 480px)');
    const apply = () => setMapDense(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(raf);
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

        {/* Social copy-trading device showcase (decorative marketing UI —
            fictional people/funds, pointer-events: none; scales with the
            viewport and drops below the copy column under 1080px). */}
        <HeroDeviceShowcase />
      </div>
    </div>
  );
}
