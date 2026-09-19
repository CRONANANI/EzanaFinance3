/**
 * SonarSection — the Sonar landing band.
 *
 * Makes the Sonar mechanic legible in three seconds: a ping goes out, eight
 * datasets light up, a cited briefing comes back. The animation is the argument,
 * which is why this is a choreographed loop rather than a screenshot.
 *
 * Structure: an eyebrow row and headline block over three columns — the ping bar
 * and live synthesis panel on the left, the radar (SonarRadar) in the centre, the
 * sourced-matches dossier on the right.
 *
 * Motion is one 15s CSS master timeline in sonar-band.css. Every sequenced
 * element shares var(--snr-cycle) and is keyed by percentage of it, so the radar
 * and the text cannot drift apart over time. Nothing is pseudo-random, so SSR and
 * client markup are identical. Every element's base style is the composed END
 * frame, which means prefers-reduced-motion resolves the whole band to the
 * finished composition just by killing animation — no second stylesheet, nothing
 * left blank. The loop ticks only while the band is in view, via the same
 * IntersectionObserver pattern as the other landing sections, toggling
 * animation-play-state rather than unmounting.
 *
 * The ping bar is a real form that routes to /sonar. The typed query, the
 * pointer and the two panels are decorative narration layered over it: they are
 * aria-hidden, and the subhead carries the same information for assistive tech.
 * No Sonar API is called from the landing page.
 *
 * Bracketed placeholders are deliberate, per 01-BRIEF.md section 6. They stay
 * bracketed until an approved cached fixture replaces all of them at once; no
 * figure is invented to fill one.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { SonarRadar } from './SonarRadar';
import './sonar-band.css';

const SYNTHESIS = [
  { cls: 'snr-anim-syn1', lead: true, text: '[ONE SENTENCE HEADLINE READ]', cite: null },
  { cls: 'snr-anim-syn2', text: 'Contract awards in the last [N] days. ', cite: '[S3]' },
  { cls: 'snr-anim-syn3', text: 'House and Senate trades in the same window. ', cite: '[S2]' },
  { cls: 'snr-anim-syn4', text: 'Lobbying filings name the same budget line. ', cite: '[S7]' },
  {
    cls: 'snr-anim-syn5',
    text: 'Echo coverage cross checked on the live web. ',
    cite: '[S1] [S8]',
  },
];

const ROWS = [
  { cls: 'snr-anim-row0', tag: 'ECHO', source: 'Echo editorial', line: '[MATCH TITLE]' },
  {
    cls: 'snr-anim-row1',
    tag: 'CONGRESS',
    source: 'House disclosure',
    line: '[MEMBER], [TRADE TYPE], [DATE]',
  },
  {
    cls: 'snr-anim-row2',
    tag: 'CONTRACTS',
    source: 'usaspending.gov',
    line: '[AWARDING AGENCY], [AWARD VALUE]',
  },
  {
    cls: 'snr-anim-row3',
    tag: 'MARKETS',
    source: 'polymarket',
    line: '[MARKET QUESTION], [XX]% YES',
  },
  { cls: 'snr-anim-row4', tag: 'SEC', source: 'EDGAR', line: '[FORM TYPE] filed [DATE]' },
];

export function SonarSection() {
  const bandRef = useRef(null);
  const [inView, setInView] = useState(true);

  /* Viewport gating. Pausing rather than unmounting: unmounting restarts the
     loop mid-sequence on scroll back, which reads as broken. */
  useEffect(() => {
    const el = bandRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={bandRef} className={`snr-band${inView ? '' : ' snr-paused'}`}>
      <div className="snr-grid-layer" aria-hidden="true" />

      <div className="snr-inner">
        <div className="snr-head">
          <div className="snr-eyebrow-row">
            <span className="snr-beacon" aria-hidden="true" />
            <span className="snr-eyebrow">Sonar</span>
            <span className="snr-rule" aria-hidden="true" />
            <span className="snr-kicker">RESEARCH SURFACE, NOT A CHATBOT</span>
          </div>
          <h2 className="snr-headline">Ping anything. Sonar sweeps everything.</h2>
          <p className="snr-subhead">
            One query, swept across congressional trades, government contracts, SEC filings,
            prediction markets, lobbying disclosures, Echo editorial, and the live web. Every claim
            cited. Findings only, never advice.
          </p>
        </div>

        <div className="snr-cols">
          <div className="snr-col-left">
            <form className="snr-pingbar" action="/sonar" method="get" role="search">
              <i className="bi bi-search snr-pingbar-icon" aria-hidden="true" />
              <label className="snr-label-sr" htmlFor="snr-ping-input">
                Ping a company, ticker, politician or bill
              </label>
              <input
                id="snr-ping-input"
                className="snr-input"
                type="search"
                name="q"
                placeholder=" "
                autoComplete="off"
              />
              {/* Decorative demo: the typed query, its caret and the pointer.
                  Clears the moment the real field is focused or typed into. */}
              <span className="snr-demo" aria-hidden="true">
                <span className="snr-query snr-anim-query">Lockheed Martin</span>
                <span className="snr-caret snr-anim-caret" />
              </span>
              <button type="submit" className="snr-ping-btn snr-anim-press">
                Ping
              </button>
              <svg
                className="snr-cursor snr-anim-cursor"
                viewBox="0 0 24 24"
                fill="#ffffff"
                stroke="#04261c"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 3l14 8.5-6.2 1.4L9.7 19z" />
              </svg>
            </form>

            <div className="snr-synth">
              <div className="snr-panel-head" aria-hidden="true">
                <span className="snr-beacon-sm" />
                <span className="snr-panel-title">LIVE SYNTHESIS</span>
                <span className="snr-rule-soft" />
                <span className="snr-status">
                  <span className="snr-state-ready snr-anim-ready">READY</span>
                  <span className="snr-state-sweep snr-anim-sweepstate">SWEEPING 8 DATASETS</span>
                  <span className="snr-state-done snr-anim-done">8 CLAIMS CITED</span>
                </span>
              </div>

              <div className="snr-synth-body" aria-hidden="true">
                <p className="snr-empty snr-anim-idle">
                  Awaiting ping. Nothing is synthesized until you ask.
                </p>
                {SYNTHESIS.map((l) => (
                  <p key={l.cls} className={`snr-line${l.lead ? ' snr-line-lead' : ''} ${l.cls}`}>
                    {l.text}
                    {l.cite ? <span className="snr-cite">{l.cite}</span> : null}
                  </p>
                ))}
              </div>

              <div className="snr-divider-line" aria-hidden="true" />

              <div className="snr-foot">
                <p className="snr-footnote">
                  Findings only, never financial advice. Every claim carries its source.
                </p>
                <a className="snr-cta" href="/sonar">
                  Run your first ping
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="snr-col-radar">
            <SonarRadar />
          </div>

          <div className="snr-col-dossier" aria-hidden="true">
            <div className="snr-dossier-head">
              <span className="snr-dossier-title">SOURCED MATCHES</span>
              <span className="snr-rule" />
              <span className="snr-meta">LMT</span>
            </div>

            <div className="snr-dossier-body">
              <p className="snr-empty snr-anim-idle">
                No matches yet.
                <br />
                The dossier fills as each dataset returns.
              </p>

              <div className="snr-rows">
                {ROWS.map((r) => (
                  <div key={r.tag} className={`snr-row ${r.cls}`}>
                    <div className="snr-row-top">
                      <span className="snr-tag">{r.tag}</span>
                      <span className="snr-rule" />
                      <span className="snr-src">{r.source}</span>
                    </div>
                    <span className="snr-row-line">{r.line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="snr-row-footer snr-anim-row5">
              <span className="snr-meta">13F, LOBBYING, WEB</span>
              <span className="snr-rule-soft" />
              <span className="snr-meta">3 MORE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SonarSection;
