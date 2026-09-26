/**
 * SonarSection: the Sonar landing band.
 *
 * Makes the Sonar mechanic legible in three seconds: a ping goes out, eight
 * datasets light up, a cited briefing comes back. The animation is the argument,
 * which is why this is a choreographed loop rather than a screenshot.
 *
 * Structure: an eyebrow row and headline block over three columns. The ping
 * bar and live synthesis panel sit on the left, the original orbital radar
 * (SonarOrbital, wrapping PersonalizationRadar unchanged) in the centre, and
 * the sourced-matches dossier on the right, poking in from the page edge.
 *
 * Motion is one 15s CSS master timeline in sonar-band.css. Every sequenced
 * element shares var(--snr-cycle) and is keyed by percentage of it, so the radar
 * and the text cannot drift apart over time. Nothing is pseudo-random, so SSR and
 * client markup are identical. Every element's base style is the composed END
 * frame, which means prefers-reduced-motion resolves the whole band to the
 * finished composition just by killing animation, with no second stylesheet and nothing
 * left blank. The loop ticks only while the band is in view, via the same
 * IntersectionObserver pattern as the other landing sections, toggling
 * animation-play-state rather than unmounting.
 *
 * The ping bar is a real form that routes to /sonar. The typed query and the
 * pointer are decorative narration layered over it. The synthesis panel is NOT
 * decorative any more: it holds real prose with real interactive links, so it
 * is exposed to assistive tech and only the status pills stay aria-hidden. The
 * dossier column remains narration.
 *
 * The synthesis links do not navigate. The tools they name live behind login,
 * so clicking one opens an auth gate offering log in or sign up rather than
 * dropping a signed-out visitor onto a gated route.
 *
 * The synthesis panel is a four-state surface. Pristine (no ping this visit)
 * runs the demo narration. From the first real submit onward the demo is frozen
 * out for the rest of the visit and the panel shows, in turn, a sweep skeleton
 * while the request is in flight, the real cited answer, or the failure at full
 * size. A backend failure must never leave the Lockheed demo copy on screen
 * pretending to be the answer to what was actually asked.
 *
 * On desktop the band is a full-viewport takeover. Scrolling down into it
 * snaps the page to the band and locks it: the body and navbar take the
 * band's ground colour and downward scroll is blocked, by wheel, touch,
 * keyboard and scrollbar drag alike. The bouncing chevron is the only way
 * down, and using it releases the lock for the rest of the visit. Upward
 * intent always releases immediately, so the lock is never a trap. Below
 * 1024px none of this runs: the stacked band is taller than a phone
 * viewport, and locking it would push content off screen with no way back.
 * The edge fades are gone; the page matching the band replaces them.
 *
 * The dossier renders deterministic bracketed placeholders on the server and
 * swaps in real public-record rows from /api/landing/sonar-fixture after
 * hydration. SSR and first client render are therefore byte identical, and a
 * failed fetch simply leaves the placeholders in place. No figure is ever
 * invented to fill a bracket.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SonarOrbital } from './SonarOrbital';
import { SonarLoader } from '@/components/sonar/SonarLoader';
import { geometryFor } from './sonar-geometry';
import './sonar-band.css';

/* Three short Lockheed Martin paragraphs. Link segments render as buttons
   styled as links: clicking one opens the auth gate instead of navigating.
   Figure-light on purpose, so nothing here can go stale or be a number nobody
   sourced. The snr-anim-syn1/3/5 classes are the existing timeline keys,
   reused rather than renumbered. */
const SYNTHESIS = [
  {
    cls: 'snr-anim-syn1',
    lead: true,
    segments: [
      {
        t: 'Lockheed Martin (LMT) is the largest U.S. defense prime, anchored by the F-35 program across Aeronautics, with Missiles and Fire Control, Rotary and Mission Systems, and Space rounding out the book. See the ',
      },
      { t: 'company screener', link: true },
      { t: ' and ' },
      { t: 'segment revenue chart', link: true },
      { t: '.' },
    ],
    cite: '[S1]',
  },
  {
    cls: 'snr-anim-syn3',
    segments: [
      {
        t: 'The vast majority of its revenue comes from U.S. government contracts, so award flow is the leading signal. Track it in the ',
      },
      { t: 'contract award tracker', link: true },
      { t: ' and the ' },
      { t: 'USAspending awards feed', link: true },
      { t: '.' },
    ],
    cite: '[S3]',
  },
  {
    cls: 'snr-anim-syn5',
    segments: [
      {
        t: 'Cross-signals: congressional trading disclosures periodically report LMT positions, SEC filings land on EDGAR, and defense budget questions trade on prediction markets. Open the ',
      },
      { t: 'congressional trades chart', link: true },
      { t: ', ' },
      { t: 'EDGAR filing stream', link: true },
      { t: ', or ' },
      { t: 'Echo coverage', link: true },
      { t: '.' },
    ],
    cite: '[S2] [S7]',
  },
];
/* Deterministic SSR fallback for the dossier. Replaced after hydration when
   /api/landing/sonar-fixture returns enough real rows. */
/* The eight datasets a ping sweeps, in the order the band claims them.
   All eight are always listed: the headline says eight datasets are joined,
   so showing eight is the proof, and a searched-but-dry one at reduced
   strength is a finding rather than an absence.

   `chip` is the short form, and it is short on purpose. The chips used to be
   derived with `label.toUpperCase().slice(0, 12)`, which rendered
   "CONGRESSIONAL TRADING" as "CONGRESSIONA" and "GOVERNMENT CONTRACTS" as
   "GOVERNMENT C". A chip that clips a letter names nothing.

   Keyed by the ids in SONAR_DATASETS so a live response merges onto it. */
const SWEPT = [
  { id: 'echo', chip: 'EZANA ECHO', name: 'Ezana Echo archive' },
  { id: 'congress', chip: 'CONGRESS', name: 'Congressional trading' },
  { id: 'gov-contracts', chip: 'GOV CONTRACTS', name: 'Government contracts' },
  { id: 'sec-filings', chip: 'SEC', name: 'SEC filings' },
  { id: 'prediction-markets', chip: 'MARKETS', name: 'Prediction markets' },
  { id: '13f', chip: '13F', name: '13F institutional holdings' },
  { id: 'lobbying', chip: 'LOBBYING', name: 'Lobbying disclosures' },
  { id: 'web', chip: 'WEB', name: 'Live web' },
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

/** Compact money, for a card that has room for four numbers and no more. */
/* Formatters for the rich Sourced matches rows. Every figure they render
   comes from dossier.matches; nothing here estimates, rounds up to a nicer
   number, or fills a gap. */
function usdShort(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

function countShort(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n.toLocaleString('en-US');
}

function fyLabel(fy) {
  return `FY'${String(fy).slice(-2)}`;
}

/** Award value over time. Inline SVG, no chart library, built from `series`. */
/* A chart drawn in PIXEL space.

   Both of these used viewBox="0 0 100 30" with preserveAspectRatio="none",
   which stretches the 100x30 box to roughly 350x80. That is fine for a path,
   and vectorEffect="non-scaling-stroke" kept its stroke honest, but it does
   nothing for filled shapes: every <circle> stretched with the box into a wide
   ellipse, and the last point at r 2.2 became a blob. Measuring the container
   and using its pixel size AS the viewBox means one unit is one pixel, so a
   circle is a circle and every dot is the same size.

   A callback ref rather than an effect with [] deps: the node only exists once
   the guard below passes, and a callback ref attaches whenever that happens
   rather than only on the first mount. */
function usePixelBox() {
  const [box, setBox] = useState(null);
  const roRef = useRef(null);
  const setNode = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);
  return [box, setNode];
}

const CHART_INSET = 6;

function AwardChart({ series }) {
  const [box, setNode] = usePixelBox();
  if (!Array.isArray(series) || series.length < 2) return null;

  /* Until the box is measured the SVG draws on the old nominal grid, uniformly
     scaled. The dots are withheld until then, so the server render and the
     first client paint agree and there is no hydration mismatch. */
  const W = box?.w ?? 100;
  const H = box?.h ?? 30;
  const values = series.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i) => CHART_INSET + (i / (series.length - 1)) * (W - 2 * CHART_INSET);
  const y = (v) => H - CHART_INSET - ((v - min) / span) * (H - 2 * CHART_INSET);
  const line = series.map((d, i) => `${x(i).toFixed(2)},${y(d.value).toFixed(2)}`).join(' ');
  const area = `${CHART_INSET},${H} ${line} ${(W - CHART_INSET).toFixed(2)},${H}`;
  const last = series[series.length - 1];
  const ticks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  return (
    <div className="snr-award-chart">
      {/* The end value is a caption in the corner, not a label on the plot: it
          used to sit on top of the line's last segment. */}
      <span className="snr-award-last">
        {fyLabel(last.fy)} {usdShort(last.value)}
      </span>
      <div className="snr-award-plot" ref={setNode}>
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <polygon points={area} fill="rgba(16,185,129,.16)" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--snr-mint)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {box
            ? series.map((d, i) => {
                const isLast = i === series.length - 1;
                /* The last point is RINGED rather than drawn bigger, so every
                   filled dot in the series is the same size. */
                return isLast ? (
                  <circle
                    key={d.fy}
                    cx={x(i)}
                    cy={y(d.value)}
                    r={3.5}
                    fill="none"
                    stroke="var(--snr-mint)"
                    strokeOpacity={0.55}
                    strokeWidth={1}
                  />
                ) : (
                  <circle
                    key={d.fy}
                    cx={x(i)}
                    cy={y(d.value)}
                    r={2}
                    strokeWidth={0}
                    fill="var(--snr-mint)"
                  />
                );
              })
            : null}
        </svg>
      </div>
      <div className="snr-award-axis" aria-hidden="true">
        {ticks.map((i) => (
          <span key={series[i].fy}>{fyLabel(series[i].fy)}</span>
        ))}
      </div>
    </div>
  );
}

function AgencyBar({ agencies }) {
  if (!Array.isArray(agencies) || !agencies.length) return null;
  /* Mint for the lead agency, graded neutrals behind it, so the ranking reads
     without needing a colour key. */
  const tone = (i) =>
    ['var(--snr-mint)', 'rgba(110,231,183,.55)', 'rgba(110,231,183,.32)', 'rgba(255,255,255,.18)'][
      Math.min(i, 3)
    ];
  return (
    <div className="snr-agency">
      <div className="snr-agency-bar" aria-hidden="true">
        {agencies.map((a, i) => (
          <span
            key={a.name}
            style={{ width: `${(a.share * 100).toFixed(2)}%`, background: tone(i) }}
          />
        ))}
      </div>
      {/* One agency per line. As inline spans they wrapped unevenly and the
          numbers never lined up; as a 4-column grid the shares and the amounts
          form columns down the list. */}
      <div className="snr-agency-legend">
        {agencies.map((a, i) => (
          <span key={a.name} className="snr-agency-item">
            <i style={{ background: tone(i) }} aria-hidden="true" />
            <span className="snr-agency-name">{a.name}</span>
            <span className="snr-agency-share">{Math.round(a.share * 100)}%</span>
            <span className="snr-agency-value">{usdShort(a.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function compactUsd(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  const [div, suffix] =
    abs >= 1e12 ? [1e12, 'T'] : abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1, ''];
  return `$${(n / div).toFixed(abs >= 1e6 ? 2 : 2)}${suffix}`;
}

function statValue(stat) {
  if (!stat || typeof stat.value !== 'number') return null;
  return stat.kind === 'percent' ? `${(stat.value * 100).toFixed(2)}%` : stat.value.toFixed(2);
}

function relativeDay(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(days)) return null;
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

/**
 * Sparkline from the dossier's closes. A polyline over a normalized viewBox,
 * drawn straight from the data with no chart library: deterministic, so the
 * server and the client agree, and weightless on a landing page.
 */
function Sparkline({ points }) {
  const [box, setNode] = usePixelBox();
  if (!Array.isArray(points) || points.length < 2) return null;
  const W = box?.w ?? 100;
  const H = box?.h ?? 30;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => {
      const px = CHART_INSET + (i / (points.length - 1)) * (W - 2 * CHART_INSET);
      const py = H - CHART_INSET - ((v - min) / span) * (H - 2 * CHART_INSET);
      return `${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(' ');
  return (
    <div className="snr-spark" ref={setNode}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <polyline
          points={d}
          fill="none"
          stroke="var(--snr-mint)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function SonarSection() {
  const bandRef = useRef(null);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const headlineRef = useRef(null);
  const eyebrowRef = useRef(null);
  const gateRef = useRef(null);
  /* Where focus was when the gate opened, so closing it puts a keyboard
     visitor back rather than dropping them at the top of the document. */
  const gateReturnRef = useRef(null);
  const innerRef = useRef(null);
  const colsRef = useRef(null);
  const radarRef = useRef(null);
  const pingBtnRef = useRef(null);
  /* Set the moment the visitor touches the field. The demo stands down: it is
     a demonstration, not a fight over the input. */
  const userTookOverRef = useRef(false);
  const [inView, setInView] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  /* Live guest Sonar. null until the first real ping answers; after that the
     band is a live surface for the rest of the visit and the demo timeline
     stays paused. */
  const [live, setLive] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [pingError, setPingError] = useState(null);
  /* The gate serves two paths with different copy: an exhausted quota, and a
     visitor clicking a tool link. Default is the tool-link wording. */
  const [gateCopy, setGateCopy] = useState(null);
  /* Starts as the deterministic fallback so the server render and the first
     client render agree; real rows arrive after hydration. */
  const [rows, setRows] = useState(ROWS);
  /* Bumped on an empty-query Ping press. Keying the row container by it
     remounts the list, which is what restarts the CSS pop animation without
     juggling classes. 0 means untouched, so the first paint and the 15s
     master loop are exactly as before. */
  const [pingPulse, setPingPulse] = useState(0);
  /* The ping field is controlled now, because the demo types into the REAL
     input rather than an overlay: a visitor watching sees the field fill. */
  const [queryValue, setQueryValue] = useState('');
  /* The demo pointer's target, measured off the Ping button each run so it
     lands on the button at any width instead of a hardcoded offset. */
  const [demoCursor, setDemoCursor] = useState(null);
  const [btnPressed, setBtnPressed] = useState(false);
  /* True from the first real ping of the visit onward, never reset. It is what
     freezes the demo choreography and takes the panel out of its pristine
     state: mid-request and after a failure alike, the demo copy is gone. */
  const [hasPinged, setHasPinged] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  /* Takeover lock. lockedIn drives the arrow; the refs are what the scroll
     listeners read, since they fire far too often to chase React state. */
  const [lockedIn, setLockedIn] = useState(false);
  /* The arrow is withheld until the choreography has finished, so the eye is
     not pulled to the exit while the answer is still arriving. Withholding it
     is also the one thing that can trap someone, which is why every path that
     ends the choreography, including failure and a hard deadline, sets it. */
  /* The arrow is derived, never set imperatively. Every path that can end
     the choreography feeds one of these three, so "demo broke, no way down"
     is not a reachable state: stage 2 settling is the happy path, pingError
     covers a user ping, demoFailed covers the demo, and the deadline below
     covers anything that hangs without reporting either. */
  /* 07 C.3: a landscape phone, or anything under 560 tall below 1024 wide,
     cannot hold a legible locked composition. The section then renders as an
     ordinary scrolling block with the arrows hidden. A deliberate degradation,
     not a failure to fit. */
  const [unlocked, setUnlocked] = useState(false);
  const [stage2, setStage2] = useState(false);
  const [stage2Settled, setStage2Settled] = useState(false);
  const [demoFailed, setDemoFailed] = useState(false);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  /* Characters of the answer revealed so far; -1 means "no typewriter, show
     all of it" (reduced motion, or a result restored after one ran). */
  const [typed, setTyped] = useState(-1);
  const demoStartedRef = useRef(false);
  const demoDoneRef = useRef(false);
  const hasPingedRef = useRef(false);
  /* scrollY captured at freeze time; null means the body is not frozen. */
  const frozenAtRef = useRef(null);
  const lastYRef = useRef(0);
  /* Set immediately before any scroll WE cause. The scroll handler consumes
     it instead of arming, so the lock can never be triggered by its own
     entry scroll, by the restore on release, or by the arrow's handoff. This
     replaced a timing grace window, which the restore outlived: the restore
     landed ~750ms late, read as a large downward scroll, and pulled the
     visitor straight back into the lock they had just left. */
  const programmaticRef = useRef(false);
  const dismissedRef = useRef(false);
  const lockedRef = useRef(false);
  const settlingRef = useRef(false);

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

  /* Real dossier rows, fetched after hydration so SSR markup stays byte
     identical. A failure leaves the bracketed placeholders alone. The
     threshold of 3 keeps the card from rendering a half-populated state. */
  useEffect(() => {
    let alive = true;
    fetch('/api/landing/sonar-fixture')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && Array.isArray(data?.rows) && data.rows.length >= 3) {
          setRows(data.rows.map((r, i) => ({ ...r, cls: `snr-anim-row${i}` })));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* Escape closes the gate, as a dialog should. The listener is on the
     document, so it is unaffected by the gate moving up a level in the tree. */
  useEffect(() => {
    if (!gateOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setGateOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [gateOpen]);

  /* Focus follows the dialog. The container takes it rather than the first
     control, because the first control is the close button and landing on it
     invites dismissing the thing the visitor was meant to read. Restoring on
     close is safe even though the opener sits inside the inert region: this
     is a passive effect, so its cleanup runs after the commit that removed
     inert. */
  useEffect(() => {
    if (!gateOpen) return undefined;
    const previous = document.activeElement;
    gateReturnRef.current = previous instanceof HTMLElement ? previous : null;
    gateRef.current?.focus();
    return () => {
      gateReturnRef.current?.focus();
      gateReturnRef.current = null;
    };
  }, [gateOpen]);

  /* The hold is a physical freeze, not a clamp. Re-pinning scrollY from a
     scroll listener always loses a few pixels to momentum between events, and
     in those pixels the next section shows through: it paints its own white
     background, and the page's takeover green sits behind sections rather
     than over them. Taking the body out of flow removes the scroll entirely,
     so there is nothing to lose pixels to.
     The offset is what keeps the view still: the body moves up by exactly the
     scroll position it had, so every element lands where it already was. */
  const freezeBody = useCallback((exactY) => {
    if (frozenAtRef.current !== null) return;
    /* Freeze at the band's true offset, not wherever the entry scroll
       happened to stop. The settle tolerance is a few pixels, and with the
       band sized to exactly one viewport those pixels come off its bottom
       edge and show the next section through the gap. */
    const y = typeof exactY === 'number' ? Math.round(exactY) : window.scrollY;
    frozenAtRef.current = y;
    /* The page scrollbar goes away with the scroll. Pad by its width so the
       content does not jump sideways at the moment of the freeze; the fixed
       navbar reads the same value through --snr-sbw, since a fixed element
       ignores the body's padding. */
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--snr-sbw', `${Math.max(0, sbw)}px`);
    const b = document.body.style;
    b.position = 'fixed';
    b.top = `-${y}px`;
    b.left = '0';
    b.right = '0';
    b.width = '100%';
    if (sbw > 0) b.paddingRight = `${sbw}px`;
  }, []);

  const unfreezeBody = useCallback(() => {
    if (frozenAtRef.current === null) return;
    const y = frozenAtRef.current;
    frozenAtRef.current = null;
    const b = document.body.style;
    b.position = '';
    b.top = '';
    b.left = '';
    b.right = '';
    b.width = '';
    b.paddingRight = '';
    document.documentElement.style.removeProperty('--snr-sbw');
    /* Restoring the scroll is the fiddliest part of the whole freeze. While
       the body is fixed the document's scroll extent collapses to about one
       viewport, and clearing position:fixed does not settle it synchronously,
       so a scrollTo issued straight afterwards gets clamped to single digits
       and the real jump lands a frame or more later. That late jump then
       reads as a large downward scroll and pulls the visitor back into the
       lock they just left. Reading scrollHeight forces the extent to settle;
       the retry covers the engines where one read is not enough. */
    const root = document.documentElement;
    const restore = () => {
      programmaticRef.current = true;
      lastYRef.current = y;
      /* globals.css sets scroll-behavior: smooth on the root, which turned
         this restore into a ~600ms animation. Every frame of it looked like
         the visitor scrolling down toward the band, so the lock re-armed
         before the restore had even finished. It has to be one jump. */
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo({ top: y, behavior: 'instant' });
      root.style.scrollBehavior = previous;
    };
    void root.scrollHeight;
    restore();
    if (Math.abs(window.scrollY - y) > 2) requestAnimationFrame(restore);
  }, []);

  /* Takeover lock manager. One effect owns every listener and its cleanup;
     passive:false only where preventDefault is actually needed. The body
     class drives the page and navbar recolour over in sonar-band.css. */
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const bandTop = () => band.getBoundingClientRect().top + window.scrollY;

    let settleTimer = null;
    /* Both elements: body carries the class the stylesheet scopes off, and
       html is what paints the canvas behind rubber-band overscroll. */
    const setLock = (on) => {
      lockedRef.current = on;
      setLockedIn(on);
      /* html and body are outside React's tree, so they are set here. The
         band's own snr-frozen / snr-composed classes are NOT: React owns that
         element's className and would wipe an imperative toggle on the next
         render, which is exactly what happened the first time this was
         written. They ride lockedIn and composed in the JSX instead. */
      document.body.classList.toggle('snr-takeover', on);
      document.documentElement.classList.toggle('snr-takeover', on);
      if (!on) band.scrollTop = 0;
    };

    const endSettle = () => {
      settlingRef.current = false;
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };

    const release = () => {
      /* Unfreeze first: it restores the real scroll position, and doing it
         after the class removal would paint one frame of the page at scroll 0. */
      unfreezeBody();
      endSettle();
      setLock(false);
    };

    const engage = () => {
      if (lockedRef.current || dismissedRef.current) return;
      setLock(true);
      settlingRef.current = true;
      /* A smooth scroll that gets interrupted never reaches its target, and
         a settling flag that never clears would leave the page green with
         nothing actually locked. Hard deadline, so the state cannot stick. */
      if (settleTimer) clearTimeout(settleTimer);
      /* Deadline, in case a smooth scroll is interrupted and never lands
         within tolerance: freeze where we are rather than leaving the page
         green and still scrollable. */
      settleTimer = setTimeout(() => {
        endSettle();
        if (lockedRef.current) freezeBody(bandTop());
      }, 900);
      const target = bandTop();
      programmaticRef.current = true;
      window.scrollTo({ top: target, behavior: reduced.matches ? 'auto' : 'smooth' });
      if (reduced.matches) {
        /* An instant jump emits no settling scroll event to catch. */
        endSettle();
        freezeBody(target);
      }
    };

    lastYRef.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastYRef.current;
      lastYRef.current = y;
      /* A scroll we caused ourselves is not the visitor asking for anything. */
      if (programmaticRef.current && !lockedRef.current) {
        programmaticRef.current = false;
        return;
      }
      if (lockedRef.current) {
        /* The entry scroll is the only scrolling that happens while locked.
           The moment it lands on the band, the body is frozen and no further
           scroll events arrive at all, so there is no clamp branch: there is
           nothing left to clamp. */
        const target = bandTop();
        if (settlingRef.current && Math.abs(y - target) < 4) {
          programmaticRef.current = false;
          endSettle();
          freezeBody(target);
        }
        return;
      }
      /* Arm when the band's top crosses the upper third on the way down. */
      if (goingDown && band.getBoundingClientRect().top <= window.innerHeight * 0.33) engage();
    };

    /* While locked the wheel drives the BAND, never the page. Leaving the
       default action to the browser made the band scroll only when the
       pointer happened to be over it, and scroll the page underneath (then
       get yanked back by the clamp) when it was not. Taking the delta and
       applying it ourselves makes it deterministic and jitter-free. */
    /* With the body frozen the page cannot move, so this is no longer about
       blocking it. It drives the band's own scroll and reads exit intent. */
    const onWheel = (e) => {
      if (!lockedRef.current || settlingRef.current) return;
      const max = band.scrollHeight - band.clientHeight;
      if (e.deltaY > 0) {
        if (max > 0) {
          e.preventDefault();
          band.scrollTop = Math.min(max, band.scrollTop + e.deltaY);
        }
      } else if (e.deltaY < 0) {
        if (band.scrollTop > 0) {
          e.preventDefault();
          band.scrollTop = Math.max(0, band.scrollTop + e.deltaY);
        } else if (e.deltaY < -8) {
          /* At the band's own top, upward intent is a request to leave. */
          release();
        }
      }
    };

    let touchY = null;
    const onTouchStart = (e) => {
      touchY = e.touches?.[0]?.clientY ?? null;
    };
    const onTouchMove = (e) => {
      if (!lockedRef.current || settlingRef.current || touchY === null) return;
      const dy = (e.touches?.[0]?.clientY ?? touchY) - touchY;
      const insideBand = band.contains(e.target);
      /* The frozen body cannot scroll, but a touch that overscrolls the band
         still triggers the browser's rubber band. Blocking at the band's
         bottom is what keeps that from showing anything underneath. */
      const atBottom = band.scrollTop + band.clientHeight >= band.scrollHeight - 2;
      if (dy < 0) {
        if (!insideBand || atBottom) e.preventDefault();
      } else if (dy > 24) {
        /* Upward swipe releases only from the band's own top, so a visitor
           reading the middle of a tall band is not thrown out of it. */
        if (!insideBand || band.scrollTop <= 2) release();
      }
    };

    const DOWN_KEYS = new Set(['ArrowDown', 'PageDown', 'End', ' ']);
    const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);
    const onKeyDown = (e) => {
      if (!lockedRef.current) return;
      const t = e.target;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return; /* the ping bar stays typeable, space included */
      const max = band.scrollHeight - band.clientHeight;
      const step = e.key === 'PageDown' || e.key === 'PageUp' ? band.clientHeight * 0.9 : 120;
      if (DOWN_KEYS.has(e.key)) {
        e.preventDefault();
        if (max > 0)
          band.scrollTop = Math.min(max, band.scrollTop + (e.key === 'End' ? max : step));
      } else if (UP_KEYS.has(e.key)) {
        if (band.scrollTop > 0) {
          e.preventDefault();
          band.scrollTop = e.key === 'Home' ? 0 : Math.max(0, band.scrollTop - step);
        } else {
          release();
        }
      }
    };

    /* An in-page anchor would fight the clamp and lose, stranding the
       visitor on the band with the wrong target under them. */
    const onHashChange = () => {
      dismissedRef.current = true;
      release();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('hashchange', onHashChange);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('hashchange', onHashChange);
      document.body.classList.remove('snr-takeover');
      document.documentElement.classList.remove('snr-takeover');
      /* Unconditional: a route change that unmounts this section must never
         leave a fixed body behind, which would look like a dead page. */
      unfreezeBody();
    };
  }, [freezeBody, unfreezeBody]);

  /* Reveal an answer one character at a time. Sequential across the three
     paragraphs falls out of revealing the joined string: each paragraph slices
     what is left after the ones before it. */
  const startTypewriter = useCallback((text) => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !text) {
      setTyped(-1);
      return () => {};
    }
    setTyped(0);
    const total = text.length;
    const id = setInterval(() => {
      setTyped((n) => {
        if (n < 0) return n;
        const next = n + 12;
        if (next >= total) {
          clearInterval(id);
          return -1;
        }
        return next;
      });
      /* Roughly 750 chars a second, so three paragraphs land in about two
         seconds. The query types slowly because watching it fill is the
         point; the answer types fast because waiting for it is not. */
    }, 16);
    return () => clearInterval(id);
  }, []);

  /* The auto-demo. It runs once per visit, the first time the lock engages on
     a visitor who has not typed their own ping, and it costs nothing: the
     endpoint is cached for a day, so the Haiku call behind it is paid about
     once daily across every visitor rather than once each.
     The result lands in the same `live` state a real ping uses, so relevance,
     the dossier stage and the arrow all flow through one path. */
  useEffect(() => {
    /* hasPinged is read through a ref, never a dep. The demo SETS it, so
       listing it here made the effect tear itself down mid-fetch: alive went
       false, the result was discarded, and the panel sat on the sweep
       skeleton forever. */
    if (!lockedIn || demoStartedRef.current || hasPingedRef.current) return undefined;
    demoStartedRef.current = true;
    let alive = true;
    let stopType = () => {};

    const DEMO_QUERY = 'Lockheed Martin';
    const CHAR_MS = 70;
    const POINTER_MS = 620;
    const PRESS_MS = 150;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = [];
    const wait = (ms) =>
      new Promise((resolve) => {
        timers.push(setTimeout(resolve, reduce ? 0 : ms));
      });

    /* Beat 1: the query types into the real field, one character at a time. */
    const typeQuery = async () => {
      if (reduce) {
        setQueryValue(DEMO_QUERY);
        return;
      }
      for (let i = 1; i <= DEMO_QUERY.length; i += 1) {
        if (!alive || userTookOverRef.current) return;
        setQueryValue(DEMO_QUERY.slice(0, i));
        await wait(CHAR_MS);
      }
    };

    /* Beat 2: the pointer travels to the Ping button and presses it. The
       target is measured off the button relative to the form, which is the
       cursor's positioning context, so it lands on the button at any width
       rather than at a hardcoded offset. */
    const movePointer = async () => {
      const btn = pingBtnRef.current;
      const form = formRef.current;
      if (!btn || !form) return;
      const b = btn.getBoundingClientRect();
      const f = form.getBoundingClientRect();
      setDemoCursor({
        x: b.left - f.left + b.width * 0.45,
        y: b.top - f.top + b.height * 0.4,
      });
      await wait(POINTER_MS);
      if (!alive || userTookOverRef.current) return;
      setBtnPressed(true);
      timers.push(setTimeout(() => setBtnPressed(false), PRESS_MS));
    };

    const timer = setTimeout(
      async () => {
        if (!alive || userTookOverRef.current) return;
        await typeQuery();
        if (!alive || userTookOverRef.current) return;
        await movePointer();
        if (!alive || userTookOverRef.current) return;

        hasPingedRef.current = true;
        setHasPinged(true);
        setLastQuery(DEMO_QUERY);
        setPinging(true);
        try {
          /* The version is the cache-buster. /api/landing/demo-ping caches for
           a day, so a response produced before a pipeline fix keeps serving
           for up to 24h after the deploy that fixed it. Bumping this asks
           for a different URL, which is a different cache entry. */
          const res = await fetch('/api/landing/demo-ping?v=7');
          const data = await res.json().catch(() => null);
          if (!alive) return;
          if (res.ok && data?.answer) {
            setLive({
              answer: data.answer,
              sources: data.sources || [],
              relevance: data.relevance || null,
              dossier: data.dossier || null,
              grounded: data.grounded !== false,
              webUsed: Boolean(data.webUsed),
              webSources: data.webSources || [],
              remaining: null,
            });
            /* Same bump the user path makes. Without it the dossier rows keep
             their master-timeline classes, which live mode freezes, and the
             card renders its header over three invisible rows. */
            setPingPulse((n) => n + 1);
            stopType = startTypewriter(data.answer);
          } else {
            setPingError('The demo could not load. Type a ping to try it yourself.');
            setDemoFailed(true);
          }
          demoDoneRef.current = true;
        } catch {
          if (alive) {
            setPingError('The demo could not load. Type a ping to try it yourself.');
            setDemoFailed(true);
            demoDoneRef.current = true;
          }
        } finally {
          if (alive) setPinging(false);
        }
      },
      /* No delay. The entry scroll settles underneath the type-out; the two
         are independent, and waiting for one to start the other left the band
         looking inert for the first half second of the lock. */
      0,
    );

    return () => {
      alive = false;
      clearTimeout(timer);
      timers.forEach(clearTimeout);
      stopType();
      /* A demo cancelled mid-flight by a release never reported anything, so
         it must not count as having run. Leaving demoStartedRef set meant the
         next lock skipped the demo, nothing ever resolved, and the arrow
         never appeared: the visitor was locked in with no way down. */
      if (!demoDoneRef.current) demoStartedRef.current = false;
    };
  }, [lockedIn, startTypewriter]);

  /* The deadline that guarantees a way down, in its own effect so it re-arms
     on every lock. It used to live inside the demo effect, where a release
     cleared it and the early return on the next lock never set it again. */
  useEffect(() => {
    if (!lockedIn || deadlinePassed) return undefined;
    const t = setTimeout(() => setDeadlinePassed(true), 14000);
    return () => clearTimeout(t);
  }, [lockedIn, deadlinePassed]);

  /* Stage 2 follows the type-out, and the arrow follows stage 2. A ping that
     failed still opens the way down, just without the stage. */
  /* Stage 2 engages the moment an answer lands, not when the type-out
     finishes: the orbital shrink, the dossier slide and the cards' entrance
     all run WHILE the paragraphs are still typing. */
  useEffect(() => {
    if (!live) return undefined;
    /* Gated on an answer, not on a resolved company. Requiring the dossier
       meant a failed name resolution silently did nothing at all: the band
       kept the demo composition and the whole stage looked broken rather
       than partial. With sources alone the dossier still centres and the
       orbital still shrinks; the cards below render only where there is
       data for them. */
    const staging = Boolean(live.dossier || live.sources?.length);
    setStage2(staging);
    /* Stage 2's transitions are 450ms; settle just after so the arrow does
       not arrive while the composition is still moving. */
    const t = setTimeout(() => setStage2Settled(true), staging ? 500 : 0);
    return () => clearTimeout(t);
  }, [live]);

  /* The measured spec, published as custom properties.
     -------------------------------------------------------------------------
     04-SPEC.md section 1 is a vertical budget whose every column sums exactly
     to its viewport height, and the lock only holds while that stays true. The
     arithmetic lives in sonar-geometry.js and is proven by
     `npm run check:sonar-budget`; this effect is only the wiring.

     Custom properties set on the node, not React inline styles, for the same
     reason as the orbital measurement below: the server cannot know the
     viewport, so anything the geometry touches would be a hydration mismatch
     if it arrived through the rendered markup. The stylesheet carries the 1440
     column as its defaults, so the first paint is already close and this only
     corrects it.

     The nav height is measured, never assumed. 07 C.1 is explicit about it,
     and the real bar is 64 on desktop and 56 on phones. */
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return undefined;

    const apply = () => {
      const nav = document.querySelector('.navbar, nav');
      const navPx = nav ? Math.round(nav.getBoundingClientRect().height) : undefined;
      /* The composition is budgeted against the REAL viewport, and deliberately
         not shrunk for the cookie banner.

         It used to subtract --cookie-banner-height so the cards would clear the
         continue bar, which rides above the banner. That made the layout depend
         on a variable another component publishes, and the banner publishes a
         nonsense value whenever its element has no layout yet: it measures
         viewportH - rect.top, and an unlaid-out element has rect.top === 0, so
         the reserve came out as the whole viewport plus 80px. At 903px tall
         that is 983, and geometryFor(w, 903 - 983, 64) returns work: 0 and
         sub: 24 — a header-only card stack with a one-line subhead sitting in
         the top third of the band, which is exactly what shipped.

         The banner is a dismissible overlay and the bar lifts above it in CSS,
         so the composition should not resize for it at all. Not subtracting it
         also means nothing moves when the banner is dismissed. The cost is that
         while the banner is open the bar's translucent wash overlaps the bottom
         of the cards, which is the same overlay behaviour the round arrow it
         replaced always had, and it ends with the banner.

         The clamp stays even though bannerPx is 0, as the guard for whatever
         reaches this effect next: at most a quarter of the viewport, and never
         a budget below MIN_BUDGET_PX. A bad publish can no longer collapse the
         layout, whatever its source. */
      const MIN_BUDGET_PX = 640;
      const rawBanner =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--cookie-banner-height'),
        ) || 0;
      const clampedBanner = Math.min(Math.max(0, rawBanner), window.innerHeight * 0.25);
      const bannerPx = 0; /* see above; clampedBanner is the documented alternative */
      const budgetH = Math.max(MIN_BUDGET_PX, window.innerHeight - bannerPx);
      const g = geometryFor(window.innerWidth, budgetH, navPx);

      if (process.env.NODE_ENV !== 'production' && g.work < 120) {
        console.warn('[sonar] budget collapsed', {
          innerHeight: window.innerHeight,
          rawBanner,
          clampedBanner,
          budgetH,
          work: g.work,
          sub: g.sub,
        });
      }

      const px = (k, v) => band.style.setProperty(k, `${Math.round(v * 100) / 100}px`);
      px('--snr-nav', g.nav);
      px('--snr-pad-top', g.padTop);
      px('--snr-eyebrow', g.eyebrow);
      px('--snr-g1', g.g1);
      px('--snr-head-h', g.head);
      px('--snr-head-fs', g.headFs);
      px('--snr-g2', g.g2);
      px('--snr-sub-h', g.sub);
      px('--snr-sub-fs', g.subFs);
      px('--snr-g3', g.g3);
      px('--snr-work', g.work);
      px('--snr-g4', g.g4);
      px('--snr-arrow', g.arrow);
      px('--snr-pad-bot', g.padBot);
      px('--snr-gutter', g.gutter);
      px('--snr-content', g.content);
      px('--snr-head-max', g.headMax);
      px('--snr-col-l', g.colL);
      px('--snr-col-c', g.colC);
      px('--snr-col-r', g.colR);
      px('--snr-gap-col', g.gap);
      px('--snr-ping-h', g.pingH);
      px('--snr-syn-h', g.synH);
      px('--snr-chart-h', g.chartH);
      px('--snr-news-h', g.newsH);
      px('--snr-row-h', g.rowH);
      px('--snr-row-gap', g.rowGap);
      px('--snr-orb-rest', g.orbRest);
      px('--snr-orb-mini', g.orbMini);
      px('--snr-orb-icon', g.orbIcon);
      px('--snr-orb-icon-mini', g.orbIconMini);
      px('--snr-orb-hub', g.orbHub);
      px('--snr-orb-hub-mini', g.orbHubMini);
      px('--snr-orb-hub-label', g.orbHubLabel);
      px('--snr-orb-hub-label-mini', g.orbHubLabelMini);
      px('--snr-rest-region', g.restRegion);
      /* Resting placement of the sliced dossier, both derived from the live
         left column so the poke tracks the grid at every width. */
      px('--snr-poke-left', g.gutter + g.content - g.colL + 40);
      px('--snr-poke-w', g.colL + 60);

      /* Flags the stylesheet switches on, so a tier change is one attribute
         rather than a media query per rule. */
      band.dataset.tier = g.tier;
      band.dataset.rowDetail = g.rowDetail ? 'on' : 'off';
      band.dataset.rowsScroll = g.rowsScroll ? 'on' : 'off';
      setUnlocked(g.tier === 'unlocked');
    };

    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    /* <html>'s inline style is where --cookie-banner-height is published and
       removed, with no resize event either way. The budget no longer reads it,
       but the observer stays: it is also how the band recovers from anything
       else that writes a custom property up there, and it costs one coalesced
       frame. Coalesced to one rAF so a burst of style writes is one re-apply. */
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };
    const bannerWatch = new MutationObserver(schedule);
    bannerWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      if (raf) window.cancelAnimationFrame(raf);
      bannerWatch.disconnect();
    };
  }, []);

  /* Stage 2 pins the orbital top-right with its top edge on the headline, and
     drops the stack below it by exactly the orbital's reach.

     Both numbers are measured, not guessed. The offsets depend on how the
     headline copy wraps, which depends on the width; the orbital's height
     depends on its own aspect at the stage-2 width. Two details matter:

     - The offset is taken against .snr-inner, not .snr-band. .snr-inner is
       position: relative, so IT is the containing block for the absolutely
       positioned radar column. Measuring from the band put the orbital the
       band's own top padding (96px) too low.
     - The stack's top clearance used to be a 300px constant. That was taller
       than the orbital actually reaches, and since the stack sits in a grid
       row the surplus inflated the whole band past the viewport. Deriving it
       from the same measurement is what lets the composition fit 768px. */
  useEffect(() => {
    if (!stage2) return undefined;
    /* Captured for the cleanup: by the time it runs the ref may already point
       somewhere else, and the two custom properties have to come off the node
       they were set on. */
    const bandNode = bandRef.current;
    const apply = () => {
      const eyebrow = eyebrowRef.current;
      const inner = innerRef.current;
      const band = bandRef.current;
      if (!eyebrow || !inner || !band) return;
      const innerTop = inner.getBoundingClientRect().top;
      /* The eyebrow row, not the headline. Aligning to the headline left the
         map only the space below it, which after the headline shrank was 134
         to 168px depending on the tier, and a map that small is specks. From
         the eyebrow row the header zone gives it 180. */
      const top = Math.round(eyebrow.getBoundingClientRect().top - innerTop);
      band.style.setProperty('--snr-orb-top', `${top}px`);

      const cols = colsRef.current;
      if (!cols) return;
      const colsTop = cols.getBoundingClientRect().top - innerTop;
      /* The orbital is sized to the room the header zone actually has: from
         its own top edge down to the work area, less a gap. Capped at 200 so
         it does not balloon on a tall screen.

         This replaced --snr-stack-pad, which measured how far the orbital
         overhung the work area and padded the right stack down by that much.
         That was right while the orbital docked above the stack inside the
         work area. It lives in the header zone now, so the overhang became a
         pad that pushed the stack past the work-area baseline and under the
         arrow row, which is what put the bottom-right arrow on top of the
         news card. Sizing the orbital to fit removes the overhang instead of
         compensating for it. */
      /* clamp(180, room, 220). The geometry raises g3 on the desktop anchors
         so room lands on 180 exactly rather than below it; the clamp is the
         floor for every width between them. */
      const room = Math.round(colsTop - top - 8);
      const size = Math.max(180, Math.min(220, room));
      band.style.setProperty('--snr-orb-size', `${size}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    /* No ResizeObserver on the radar any more. It existed to re-measure the
       orbital's own box for the pad; the size above is derived from the header
       zone instead, so watching the element it sizes would only be a loop
       waiting to happen. */
    return () => {
      window.removeEventListener('resize', apply);
      bandNode?.style.removeProperty('--snr-orb-top');
      bandNode?.style.removeProperty('--snr-orb-size');
    };
  }, [stage2]);

  /* Dev-only alignment guard.
     -------------------------------------------------------------------------
     The three columns sharing a top and a bottom edge is the whole point of
     the stage-2 composition, and it is the kind of thing a single new rule
     can break silently months later. This measures it once the stage has
     settled and says so in the console if it drifts.

     Stripped from production builds by the NODE_ENV check, so it costs a
     dead branch and nothing else. */
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;
    if (!stage2) return undefined;
    const t = window.setTimeout(() => {
      const q = (sel) => document.querySelector(sel)?.getBoundingClientRect();
      const dossier = q('.snr-col-dossier');
      const fund = q('.snr-fund');
      const news = q('.snr-news');
      if (!dossier || !fund || !news) return;
      const deltas = {
        chartTopVsDossierTop: +(fund.top - dossier.top).toFixed(1),
        newsBottomVsDossierBottom: +(news.bottom - dossier.bottom).toFixed(1),
      };
      if (
        Math.abs(deltas.chartTopVsDossierTop) > 1 ||
        Math.abs(deltas.newsBottomVsDossierBottom) > 1
      ) {
        console.warn('[sonar] stage 2 misaligned', deltas);
      }
    }, 700);
    return () => window.clearTimeout(t);
  }, [stage2]);

  /* Part 3.5: ONE owner for the takeover classes and the freeze, mirroring
     lockedIn. The classes used to be toggled from three places, and a path
     that set them without freezing produced the state in the screenshot: a
     transparent nav over a page that still scrolled, so the bar overlapped
     the cards. Class and freeze cannot diverge if the same effect asserts
     both, including after a resize. */
  useEffect(() => {
    const band = bandRef.current;
    if (!lockedIn) {
      unfreezeBody();
      document.body.classList.remove('snr-takeover');
      document.documentElement.classList.remove('snr-takeover');
      return undefined;
    }
    const assert = () => {
      document.body.classList.add('snr-takeover');
      document.documentElement.classList.add('snr-takeover');
      if (document.body.style.position !== 'fixed' && band) {
        freezeBody(band.getBoundingClientRect().top + window.scrollY);
      }
    };
    assert();
    window.addEventListener('resize', assert);
    return () => window.removeEventListener('resize', assert);
  }, [lockedIn, freezeBody, unfreezeBody]);

  /* The arrow: dismiss the lock for the rest of the visit, then hand the
     page back to the visitor at the section below. */
  function onContinue() {
    unfreezeBody();
    dismissedRef.current = true;
    lockedRef.current = false;
    settlingRef.current = false;
    setLockedIn(false);
    document.body.classList.remove('snr-takeover');
    document.documentElement.classList.remove('snr-takeover');
    const band = bandRef.current;
    if (band) {
      const nextTop = band.getBoundingClientRect().bottom + window.scrollY;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      programmaticRef.current = true;
      lastYRef.current = nextTop;
      window.scrollTo({ top: nextTop, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function openGate(copy) {
    setGateCopy(copy || null);
    setGateOpen(true);
  }

  /* Guest Sonar runs inline now. The form keeps action="/sonar" so a no-JS
     visitor still reaches the app, but with JS on every submit is intercepted:
     an empty press replays the demo pop, a real query pings for real. */
  async function onPingSubmit(e) {
    e.preventDefault();
    const q = (queryValue || e.currentTarget.elements?.q?.value || '').trim();
    if (!q) {
      setPingPulse((n) => n + 1);
      return;
    }
    if (pinging) return;
    hasPingedRef.current = true;
    setHasPinged(true);
    setLastQuery(q);
    setPinging(true);
    setPingError(null);
    try {
      const res = await fetch('/api/sonar/landing-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => null);
      if (data?.gate) {
        openGate({
          title: 'You\u2019ve used your 5 free pings.',
          sub: 'Create a free account to keep pinging across every Ezana dataset.',
        });
        setLive((l) => (l ? { ...l, remaining: 0 } : l));
      } else if (res.ok && data?.answer) {
        setLive({
          answer: data.answer,
          sources: data.sources || [],
          relevance: data.relevance || null,
          dossier: data.dossier || null,
          grounded: data.grounded !== false,
          webUsed: Boolean(data.webUsed),
          webSources: data.webSources || [],
          remaining: data.remaining,
        });
        startTypewriter(data.answer);
        setPingPulse((n) => n + 1);
      } else if (res.ok) {
        /* The ping worked; the datasets just had nothing on this subject. That
           is a finding, not a failure, and telling the visitor to try again
           would be telling them to retry something a retry cannot fix. The
           quota was still spent, so the remaining count is carried through. */
        setPingError(
          typeof data?.remaining === 'number'
            ? `No dataset coverage for that ping yet. ${data.remaining} free pings left.`
            : 'No dataset coverage for that ping yet.',
        );
      } else if (res.status === 429) {
        /* The strict per-IP limiter, not a broken ping. Naming it stops a
           visitor retrying into the same wall. */
        setPingError('Too many pings too fast. Wait a minute and try again.');
      } else {
        setPingError(data?.error || 'That ping did not land. Try again.');
      }
    } catch {
      setPingError('That ping did not land. Try again.');
    } finally {
      setPinging(false);
    }
  }

  /* Both conditions, not either: now that the stage and the type-out run
     concurrently, the stage settling no longer implies the answer has
     finished arriving. */
  /* Resolved once: the dialog's accessible name has to be the same string the
     title renders, and both gate paths reach the same component. */
  const gateTitle = gateCopy?.title || 'This tool lives inside Ezana.';
  const gateSub =
    gateCopy?.sub || 'Log in or create a free account to open charts, filings, and trackers.';

  /* The composition is latched, and separate from the freeze. The two used to
     be one class: releasing the lock on an upward scroll removed snr-locked,
     which took the locked-tier geometry with it, so the grid and every card
     resized mid-scroll and the whole band visibly jumped. snr-composed carries
     the geometry and stays on for the rest of the visit once the band has
     composed; snr-frozen carries only the body freeze and comes off on release.
     Scrolling up now moves the page and nothing else. */
  const [composed, setComposed] = useState(false);
  useEffect(() => {
    if (lockedIn) setComposed(true);
  }, [lockedIn]);

  /* A3: the deck's two one-shot tugs. Phone only, each fires once, and any
     scroll on the deck cancels a pending one: if the visitor has already found
     the swipe, hinting at it is noise. The class is removed on animationend so
     will-change does not linger. */
  const [tug, setTug] = useState(false);
  const tuggedRef = useRef({ one: false, two: false });
  useEffect(() => {
    const deck = colsRef.current;
    if (!deck || typeof window === 'undefined' || !window.matchMedia) return undefined;
    if (!window.matchMedia('(max-width: 1023px)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let timer = 0;
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      timer = 0;
      setTug(false);
    };
    /* Passive, and it does nothing but cancel: a scroll handler that touches
       layout is the classic way to drop frames mid-swipe. */
    deck.addEventListener('scroll', cancel, { passive: true });

    /* Tug 1: the answer landed and the dossier slide mounted. The delay lets
       the slide mount and its type-out start, so the hint is about the NEXT
       card rather than a card still arriving. */
    if (hasPinged && !tuggedRef.current.one && deck.querySelector('.snr-col-dossier')) {
      tuggedRef.current.one = true;
      timer = window.setTimeout(() => {
        if (!cancelled) setTug(true);
      }, 250);
    }

    /* Tug 2: the visitor swiped to the dossier and a third slide exists. */
    let io;
    const dossier = deck.querySelector('.snr-col-dossier');
    if (dossier && deck.querySelector('.snr-stack') && !tuggedRef.current.two) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || tuggedRef.current.two) return;
          tuggedRef.current.two = true;
          setTug(true);
        },
        { root: deck, threshold: 0.6 },
      );
      io.observe(dossier);
    }

    return () => {
      deck.removeEventListener('scroll', cancel);
      if (timer) window.clearTimeout(timer);
      if (io) io.disconnect();
    };
  }, [hasPinged, stage2]);

  const arrowReady =
    (stage2Settled && typed === -1) || Boolean(pingError) || demoFailed || deadlinePassed;

  return (
    <section
      ref={bandRef}
      className={`snr-band${inView ? '' : ' snr-paused'}${composed ? ' snr-composed' : ''}${
        lockedIn ? ' snr-frozen' : ''
      }${hasPinged ? ' snr-live' : ''}${stage2 ? ' snr-stage2' : ''}${
        live?.dossier?.fundamentals ? ' snr-has-fund' : ''
      }`}
    >
      <div className="snr-grid-layer" aria-hidden="true" />

      <div ref={innerRef} className="snr-inner">
        <div className="snr-head">
          <div ref={eyebrowRef} className="snr-eyebrow-row">
            <span className="snr-beacon" aria-hidden="true" />
            <span className="snr-eyebrow">Sonar</span>
            <span className="snr-rule" aria-hidden="true" />
            <span className="snr-kicker">RESEARCH SURFACE, NOT A CHATBOT</span>
          </div>
          <h2 ref={headlineRef} className="snr-headline">
            Ping anything. Sonar sweeps everything.
          </h2>
          <p className="snr-subhead">
            One query, swept across congressional trades, government contracts, SEC filings,
            prediction markets, lobbying disclosures, Echo editorial, and the live web. Every claim
            cited. Findings only, never advice.
          </p>
        </div>

        <div
          ref={colsRef}
          className={`snr-cols${tug ? ' snr-anim-tug' : ''}`}
          onAnimationEnd={() => setTug(false)}
        >
          <div className="snr-col-left">
            {/* Both shaded regions go inert while the gate is up, so the
                content the visitor cannot read is also content they cannot
                tab into or hear read out. React 18 does not know `inert` as a
                boolean prop, so it is passed as the empty string, which is
                the attribute's own HTML form. */}
            <form
              ref={formRef}
              className="snr-pingbar"
              action="/sonar"
              method="get"
              role="search"
              onSubmit={onPingSubmit}
              inert={gateOpen ? '' : undefined}
            >
              <i className="bi bi-search snr-pingbar-icon" aria-hidden="true" />
              <label className="snr-label-sr" htmlFor="snr-ping-input">
                Ping a company, ticker, politician or bill
              </label>
              <input
                ref={inputRef}
                id="snr-ping-input"
                className="snr-input"
                type="search"
                name="q"
                placeholder=" "
                autoComplete="off"
                value={queryValue}
                onChange={(e) => {
                  userTookOverRef.current = true;
                  setDemoCursor(null);
                  setQueryValue(e.target.value);
                }}
                onFocus={() => {
                  userTookOverRef.current = true;
                  setDemoCursor(null);
                }}
              />
              {/* Decorative demo narration for the pristine loop only. Once
                  the real field has content, whether the demo typed it or the
                  visitor did, the overlay would double it. */}
              {queryValue ? null : (
                <span className="snr-demo" aria-hidden="true">
                  <span className="snr-query snr-anim-query">Lockheed Martin</span>
                  <span className="snr-caret snr-anim-caret" />
                </span>
              )}
              <button
                ref={pingBtnRef}
                type="submit"
                className={`snr-ping-btn snr-anim-press${btnPressed ? ' snr-ping-btn--pressed' : ''}`}
                disabled={pinging}
              >
                {pinging ? (
                  <>
                    <span className="snr-beacon-sm snr-ping-dot" aria-hidden="true" />
                    Pinging
                  </>
                ) : (
                  'Ping'
                )}
              </button>
              <svg
                className={`snr-cursor ${demoCursor ? 'snr-cursor--demo' : 'snr-anim-cursor'}`}
                style={
                  demoCursor
                    ? { transform: `translate(${demoCursor.x}px, ${demoCursor.y}px)` }
                    : undefined
                }
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

            <div className="snr-synth" inert={gateOpen ? '' : undefined}>
              <div className="snr-panel-head">
                <span className="snr-beacon-sm" aria-hidden="true" />
                <span className="snr-panel-title">LIVE SYNTHESIS</span>
                <span className="snr-rule-soft" aria-hidden="true" />
                {/* One label, state-driven. It used to be three absolutely
                    positioned spans cross-fading on the master timeline, which
                    live mode freezes: all three stopped visible and stacked on
                    top of one another. */}
                <span className="snr-status" aria-hidden="true">
                  {pinging ? 'SWEEPING 8 DATASETS' : live ? 'READY' : '8 CLAIMS CITED'}
                </span>
              </div>

              <div className="snr-synth-body">
                <p className="snr-empty snr-anim-idle" aria-hidden="true">
                  Awaiting ping. Nothing is synthesized until you ask.
                </p>
                {!hasPinged ? (
                  SYNTHESIS.map((p) => (
                    <p key={p.cls} className={`snr-para${p.lead ? ' snr-line-lead' : ''} ${p.cls}`}>
                      {p.segments.map((seg, i) =>
                        seg.link ? (
                          <button
                            key={`${p.cls}-${i}`}
                            type="button"
                            className="snr-link"
                            onClick={() => openGate()}
                          >
                            {seg.t}
                          </button>
                        ) : (
                          <span key={`${p.cls}-${i}`}>{seg.t}</span>
                        ),
                      )}
                      {p.cite ? <span className="snr-cite"> {p.cite}</span> : null}
                    </p>
                  ))
                ) : pinging ? (
                  /* The app's own ping loader, reused as-is. Its classes are
                     snrl-, so none of the band's snr-anim pause rules reach
                     it and it keeps moving while the band is frozen. */
                  <SonarLoader caption={`Sweeping 8 datasets for “${lastQuery}”...`} />
                ) : live ? (
                  <>
                    {live.grounded === false ? (
                      /* Two different honesties: with the tool on the answer
                         is current web research; with it off it is the
                         model's own background. The chip has to say which. */
                      <span className="snr-chip-general">
                        {live.webUsed ? 'Web briefing' : 'General briefing'}
                      </span>
                    ) : null}
                    {(() => {
                      /* One reveal counter across the joined answer, so the
                         paragraphs type in sequence without any per-paragraph
                         bookkeeping. typed === -1 means show all of it. */
                      const paras = live.answer.split(/\n\s*\n/).slice(0, 3);
                      let consumed = 0;
                      return paras.map((para, i) => {
                        const start = consumed;
                        consumed += para.length + 2;
                        const shown = typed < 0 ? para : para.slice(0, Math.max(0, typed - start));
                        if (typed >= 0 && !shown) return null;
                        return (
                          <p
                            key={`live-${i}`}
                            className={`snr-para${i === 0 ? ' snr-line-lead' : ''}`}
                          >
                            {shown}
                          </p>
                        );
                      });
                    })()}
                    {typed < 0 ? (
                      <p className="snr-para">
                        <button type="button" className="snr-link" onClick={() => openGate()}>
                          Open the full dossier in Sonar
                        </button>
                        {typeof live.remaining === 'number' ? (
                          <span className="snr-cite"> {live.remaining} free pings left</span>
                        ) : null}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="snr-para snr-line-lead">
                      {pingError || 'That ping did not land.'}
                    </p>
                    <p className="snr-para">
                      <button
                        type="button"
                        className="snr-link"
                        onClick={() => {
                          setPingPulse((n) => n + 1);
                          inputRef.current?.focus();
                        }}
                      >
                        Try another ping
                      </button>
                    </p>
                  </>
                )}
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

            {/* The gate is a sibling of the panel rather than a child of it,
                which is the whole point: inset 0 on the column covers the ping
                bar and the synthesis card together. Pinned to the bottom of
                the panel it left the input readable and usable underneath. */}
            {gateOpen ? (
              <div
                ref={gateRef}
                tabIndex={-1}
                className="snr-gate snr-gate--cover"
                role="dialog"
                /* role="dialog" without aria-modal on purpose. aria-modal
                   tells assistive tech that everything outside the dialog is
                   inert, and here it is not: the gate covers one column, and
                   the dossier, the orbital and the news list stay visible and
                   tabbable, which a tab-order trace confirms. Claiming modal
                   would hide the rest of the band from screen reader users
                   alone, for a dismissible upsell. What the gate does cover is
                   genuinely unreachable, via inert on the two regions. */
                aria-label={gateTitle}
              >
                <button
                  type="button"
                  className="snr-gate-close"
                  aria-label="Close"
                  onClick={() => setGateOpen(false)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
                <div className="snr-gate-inner">
                  <p className="snr-gate-title">{gateTitle}</p>
                  <p className="snr-gate-sub">{gateSub}</p>
                  <div className="snr-gate-actions">
                    <a className="snr-gate-btn snr-gate-btn-ghost" href="/signin?next=/sonar">
                      Log in
                    </a>
                    <a className="snr-gate-btn snr-gate-btn-solid" href="/signup?next=/sonar">
                      Sign up free
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div ref={radarRef} className="snr-col-radar">
            {/* compact in stage 2: the map renders at roughly a sixth of its
                resting width there, and geometry that must keep a real
                rendered size is sized from that rather than from the viewBox. */}
            <SonarOrbital
              relevance={live?.relevance ?? null}
              hubLabel={live ? lastQuery : null}
              hubTicker={live?.dossier?.ticker ?? null}
              compact={stage2}
            />
          </div>

          {/* The dossier does not exist before a ping. It used to render as an
              empty "Sourced matches" card poking in from the right with two dim
              rows, which promised a result the visitor had not asked for yet.
              Pre-ping the composition is the left column and the orbital. */}
          {hasPinged ? (
            <div className="snr-col-dossier">
              <div className="snr-dossier-head">
                <span className="snr-dossier-title">SOURCED MATCHES</span>
                <span className="snr-rule" />
                {/* The pinged term in full, or its ticker when the full name
                  will not fit. It used to be `slice(0, 14)`, which rendered
                  "LOCKHEED MARTIN" as "LOCKHEED MARTI": a truncation that
                  reads as a different company. A ticker is short and true,
                  where half a name is neither. */}
                <span className="snr-meta snr-term">
                  {lastQuery.length > 16 && live?.dossier?.ticker
                    ? live.dossier.ticker.toUpperCase()
                    : lastQuery.toUpperCase()}
                </span>
              </div>

              <div className="snr-dossier-body">
                <div className="snr-rows" key={pingPulse}>
                  {(() => {
                    const m = live?.dossier?.matches || null;
                    /* A dataset is matched only when its leg actually returned
                     something. The honesty rule: no rich row is rendered from
                     an empty leg, and a null leg falls through to the dry row
                     rather than drawing an empty frame. */
                    const rich = {
                      'gov-contracts': m?.contracts || null,
                      echo: m?.echo?.length ? m.echo : null,
                      congress: m?.congress?.length ? m.congress : null,
                      'sec-filings': m?.sec?.length ? m.sec : null,
                    };
                    /* Matched rich rows first, in the brief's order, then
                     everything else dimmed. */
                    const order = ['gov-contracts', 'echo', 'congress', 'sec-filings'];
                    const sorted = [...SWEPT].sort((a, b) => {
                      const ra = rich[a.id] ? order.indexOf(a.id) : 99;
                      const rb = rich[b.id] ? order.indexOf(b.id) : 99;
                      if (ra !== rb) return ra - rb;
                      return SWEPT.indexOf(a) - SWEPT.indexOf(b);
                    });

                    return sorted.map((d, i) => {
                      const data = live ? rich[d.id] : null;
                      const hit = live?.sources?.find((sc) => sc.id === d.id);
                      const matched = Boolean(data) || Boolean(hit?.used);
                      const cls = `snr-row${matched ? '' : ' snr-row--dry'}${data ? ' snr-row--rich' : ''} ${
                        hasPinged || pingPulse > 0 ? 'snr-anim-rowpop' : `snr-anim-row${i}`
                      }`;
                      const style =
                        hasPinged || pingPulse > 0 ? { animationDelay: `${i * 0.08}s` } : undefined;

                      return (
                        <div key={d.id} className={cls} style={style}>
                          <div className="snr-row-top">
                            <span className="snr-tag">{d.chip}</span>
                            <span className="snr-rule" />
                            <span className="snr-src">{matched ? 'matched' : 'searched'}</span>
                          </div>

                          {d.id === 'gov-contracts' && data ? (
                            <div className="snr-rich">
                              <span className="snr-rich-name">{data.recipient}</span>
                              <div className="snr-stat-strip">
                                <div className="snr-stat">
                                  <span className="snr-stat-label">TOTAL AWARDED</span>
                                  <span className="snr-stat-value">{usdShort(data.total)}</span>
                                  <span className="snr-stat-cap">
                                    {fyLabel(data.coverage.fromFy)} to {fyLabel(data.coverage.toFy)}
                                  </span>
                                </div>
                                <div className="snr-stat">
                                  <span className="snr-stat-label">AWARDS</span>
                                  <span className="snr-stat-value">{countShort(data.awards)}</span>
                                  <span className="snr-stat-cap">contracts</span>
                                </div>
                                <div className="snr-stat">
                                  <span className="snr-stat-label">AVG CONTRACT</span>
                                  <span className="snr-stat-value">{usdShort(data.avg)}</span>
                                  <span className="snr-stat-cap">per award</span>
                                </div>
                                <div className="snr-stat">
                                  <span className="snr-stat-label">YOY</span>
                                  {data.yoy ? (
                                    <>
                                      <span
                                        className={`snr-stat-value ${
                                          data.yoy.value >= 0 ? 'snr-up' : 'snr-down'
                                        }`}
                                      >
                                        {data.yoy.value >= 0 ? '+' : ''}
                                        {(data.yoy.value * 100).toFixed(1)}%
                                      </span>
                                      {/* The fiscal years are named because the
                                        figure is meaningless without them, and
                                        because they are complete years: a
                                        partial current year compared against a
                                        whole one is how a quick view reports a
                                        collapse that never happened. */}
                                      <span className="snr-stat-cap">
                                        {fyLabel(data.yoy.from)} to {fyLabel(data.yoy.to)}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="snr-stat-value">n/a</span>
                                      <span className="snr-stat-cap">needs two full years</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <AwardChart series={data.series} />
                              <AgencyBar agencies={data.agencies} />
                              <button
                                type="button"
                                className="snr-rich-link"
                                onClick={() => openGate()}
                              >
                                Full dossier
                                <i className="bi bi-arrow-up-right" aria-hidden="true" />
                              </button>
                            </div>
                          ) : null}

                          {d.id === 'echo' && data ? (
                            <div className="snr-rich snr-rich--echo">
                              {data.map((a) => (
                                <a key={a.slug} className="snr-echo-row" href={`/echo/${a.slug}`}>
                                  <span className="snr-echo-title">{a.title}</span>
                                  {a.excerpt ? (
                                    <span className="snr-echo-excerpt">{a.excerpt}</span>
                                  ) : null}
                                  <span className="snr-echo-date">
                                    {relativeDay(a.publishedAt)}
                                  </span>
                                </a>
                              ))}
                            </div>
                          ) : null}

                          {d.id === 'congress' && data ? (
                            <div className="snr-rich">
                              {data.map((t, k) => (
                                <span key={`${t.member}-${k}`} className="snr-trade">
                                  <span className="snr-trade-member">{t.member}</span>
                                  <span
                                    className={`snr-trade-type ${
                                      /sale|sell/i.test(t.type) ? 'snr-down' : 'snr-up'
                                    }`}
                                  >
                                    {t.type}
                                  </span>
                                  <span className="snr-trade-date">{relativeDay(t.date)}</span>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {d.id === 'sec-filings' && data ? (
                            <div className="snr-rich">
                              {data.map((f, k) => (
                                <span key={`${f.form}-${k}`} className="snr-trade">
                                  <span className="snr-trade-member">{f.form}</span>
                                  <span className="snr-trade-date">{relativeDay(f.filedAt)}</span>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {!data ? (
                            <span className="snr-row-line">
                              {matched ? d.name : 'No matches for this ping'}
                            </span>
                          ) : null}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* The "13F, LOBBYING, WEB / 3 MORE" footer is gone. It existed
                to admit that three of the eight datasets were not on screen,
                which stopped being true once all eight render. */}
            </div>
          ) : null}

          {/* Stage 2's right-hand stack. In the DOM only once a ping has
              actually returned a dossier, so nothing empty is ever laid out.
              The orbital stays in .snr-col-radar and is repositioned by grid
              rather than moved into this wrapper: reparenting it would remount
              the map and restart its drift mid-glide. */}
          {stage2 &&
          (live?.dossier?.fundamentals ||
            live?.dossier?.news?.length ||
            live?.dossier?.echo?.length) ? (
            <div className="snr-stack">
              {live.dossier.fundamentals ? (
                <div className="snr-fund snr-fund--wide">
                  <div className="snr-fund-head">
                    <span className="snr-fund-ticker">{live.dossier.ticker}</span>
                    {live.dossier.sparkLabel ? (
                      <span className="snr-range-chip">{live.dossier.sparkLabel}</span>
                    ) : null}
                    <span className="snr-rule-soft" />
                    <span className="snr-fund-name">{live.dossier.name}</span>
                  </div>
                  <div className="snr-fund-body">
                    <Sparkline points={live.dossier.spark} />
                    <div className="snr-fund-grid">
                      <div className="snr-stat">
                        <span className="snr-stat-label">P/E TTM</span>
                        <span className="snr-stat-value">
                          {typeof live.dossier.fundamentals.peTtm === 'number'
                            ? live.dossier.fundamentals.peTtm.toFixed(2)
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="snr-stat">
                        <span className="snr-stat-label">EV/EBITDA TTM</span>
                        <span className="snr-stat-value">
                          {typeof live.dossier.fundamentals.evToEbitdaTtm === 'number'
                            ? live.dossier.fundamentals.evToEbitdaTtm.toFixed(2)
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="snr-stat">
                        <span className="snr-stat-label">Market cap</span>
                        <span className="snr-stat-value">
                          {compactUsd(live.dossier.fundamentals.marketCap) || 'n/a'}
                        </span>
                      </div>
                      <div className="snr-stat">
                        <span className="snr-stat-label">
                          {live.dossier.fundamentals.fourth?.label || 'Price'}
                        </span>
                        <span className="snr-stat-value">
                          {statValue(live.dossier.fundamentals.fourth) ||
                            (typeof live.dossier.fundamentals.price === 'number'
                              ? `$${live.dossier.fundamentals.price.toFixed(2)}`
                              : 'n/a')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {live.dossier.news.length || live.dossier.echo.length ? (
                <div className="snr-news">
                  <div className="snr-card-head">
                    <span className="snr-panel-title">RELEVANT NEWS</span>
                    <span className="snr-rule-soft" aria-hidden="true" />
                  </div>
                  <div className="snr-news-list">
                    {live.dossier.news.map((n) => (
                      <a
                        key={n.url}
                        className="snr-news-item"
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="snr-news-title">{n.title}</span>
                        <span className="snr-news-meta">
                          {n.source}
                          {relativeDay(n.publishedAt) ? ` · ${relativeDay(n.publishedAt)}` : ''}
                        </span>
                      </a>
                    ))}
                    {live.dossier.echo.map((e) => (
                      <a key={e.slug} className="snr-news-item" href={`/echo/${e.slug}`}>
                        <span className="snr-news-title">
                          <span className="snr-echo-chip">
                            <i className="bi bi-broadcast-pin" aria-hidden="true" />
                            ECHO
                          </span>
                          {e.title}
                        </span>
                        <span className="snr-news-meta">
                          Ezana Echo
                          {relativeDay(e.publishedAt) ? ` · ${relativeDay(e.publishedAt)}` : ''}
                        </span>
                      </a>
                    ))}
                  </div>
                  {/* Pinned to the card bottom. It anchors the bottom edge
                      visually when only two items come back, which is what
                      left 123px of the card empty before. Gated like the other
                      dossier links: this one opens the app, it does not
                      navigate a signed-out visitor into a wall. */}
                  <button type="button" className="snr-news-more" onClick={() => openGate()}>
                    More coverage in Sonar
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* One continue control: a translucent white bar flush with the band's
          bottom edge, fading up into the green. It replaces the two bouncing
          arrows that used to sit at the content box's edges. The bar leaves the
          flow, so the 56px it occupies is reserved by .snr-inner's bottom
          padding rather than by a flex row; the vertical budget still carries
          the zone (sonar-geometry.js `arrow`). */}
      {lockedIn && arrowReady ? (
        <button
          type="button"
          className="snr-continue-bar"
          aria-label="Continue to the rest of the page"
          onClick={onContinue}
        >
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

export default SonarSection;
