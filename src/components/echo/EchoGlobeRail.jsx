'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractiveGlobe } from '@/components/ui/interactive-globe';
import EchoCityNews from './EchoCityNews';
import './echo-globe-rail.css';

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * Section-to-card map for scroll-synced relevance. Renderer-level and
 * deterministic so every article gets it without data-file edits (frozen files
 * included): each card claims the FIRST section whose text mentions its city
 * name (word-boundary, case-insensitive), falling back to region then country;
 * an explicit `sectionAnchor` on the card (optional authoring field, see
 * docs/ECHO_ARTICLE_AUTHORING.md) wins over detection. A section carries at
 * most one card: when a card's first mention lands on a section another card
 * already claimed, it takes its next mentioning section instead (in card
 * order, so the outcome is stable). Sections with no card of their own
 * inherit the previous section's card (sticky relevance, no flicker to
 * empty), and cards that never match simply never activate. Pure function of
 * its inputs: server and client derive the identical map.
 */
function buildSectionCardMap(sections, cities) {
  const claimed = new Map(); // section id -> city index
  cities.forEach((city, idx) => {
    const candidates = [];
    if (city.sectionAnchor && sections.some((s) => s.id === city.sectionAnchor)) {
      candidates.push(city.sectionAnchor);
    }
    for (const name of [city.name, city.region, city.country].filter(Boolean)) {
      const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
      for (const s of sections) {
        if (re.test(s.text)) candidates.push(s.id);
      }
    }
    const target = candidates.find((id) => !claimed.has(id));
    if (target) claimed.set(target, idx);
  });
  const map = new Map();
  let carry = null;
  for (const s of sections) {
    if (claimed.has(s.id)) carry = claimed.get(s.id);
    map.set(s.id, carry);
  }
  return map;
}

/**
 * "Geography of the story" rail: a rotating city globe (a smaller instance of
 * the landing-hero InteractiveGlobe, showing only this article's cities), a
 * compact metric sparkline, and one impact card per city.
 *
 * >=1280px (three-column layout):
 *   - The head + globe block is sticky for the whole article (the rail
 *     stretches to the grid row, so the sticky block has the full article to
 *     travel).
 *   - The city cards are a scroll-driven stack: every card is sticky at the
 *     same line just below the globe (--echo-grail-card-top, measured from the
 *     sticky block), so card N+1 slides up and covers card N. The card that
 *     has completed its overtake (its top has reached the line) is the focused
 *     card; exactly one is focused at a time.
 *   - The globe turns to the focused city (the globe's own focusTarget easing,
 *     which snaps under reduced motion) and resumes auto-rotation after 2.5s.
 *   - A news card for the focused city (EchoCityNews) floats to the right of
 *     the globe when the viewport has room beside the grid, else sits under
 *     the globe inside the sticky block.
 * <1280px: unchanged. The rail renders inline after the hero, cards scroll
 * horizontally, and the section in view drives the active card
 * (buildSectionCardMap). No news card.
 *
 * All numbers/impact text derive from the article's own content; city
 * lat/lng are geographic facts. Rotation pauses while the sticky block is
 * offscreen.
 */
const DESKTOP_QUERY = '(min-width: 1280px)';
const NEWS_PANEL_W = 300;
const NEWS_PANEL_GAP = 16;
const RESUME_AUTOROTATE_MS = 2500;

export function EchoGlobeRail({ rail, sections = [] }) {
  const stickyRef = useRef(null);
  const [visible, setVisible] = useState(true);
  // The globe's default oceanFill is tuned for the dark hero; in the article
  // rail resolve it from the theme so it doesn't render as a black disc in
  // light mode, preferring the article page ground so the ocean matches the
  // page. Read once on mount.
  const [oceanFill, setOceanFill] = useState(null);

  const cities = useMemo(() => rail?.cities ?? [], [rail]);
  const metric = rail?.metric;

  const sectionCardMap = useMemo(() => buildSectionCardMap(sections, cities), [sections, cities]);
  // Initial active = the first section's mapped card (usually null until the
  // reader scrolls). Pure derivation, so SSR and hydration agree.
  const [activeIdx, setActiveIdx] = useState(() => sectionCardMap.get(sections[0]?.id) ?? null);

  const railRef = useRef(null);
  const cardRefs = useRef([]);
  const [desktop, setDesktop] = useState(false);
  const [stackIdx, setStackIdx] = useState(0);
  const [newsSide, setNewsSide] = useState('below'); // 'right' | 'below'

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  /* Measure the sticky block so the cards stick exactly below it, and decide
     whether the news card fits beside the grid (right) or goes under the
     globe (below). */
  useEffect(() => {
    if (!desktop) return undefined;
    const rail = railRef.current;
    const block = stickyRef.current;
    if (!rail || !block || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const top = parseFloat(getComputedStyle(block).top) || 0;
      const h = block.getBoundingClientRect().height;
      rail.style.setProperty('--echo-grail-card-top', `${Math.round(top + h + 12)}px`);
      const room = window.innerWidth - rail.getBoundingClientRect().right;
      setNewsSide(room >= NEWS_PANEL_W + NEWS_PANEL_GAP + 16 ? 'right' : 'below');
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(block);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [desktop]);

  /* Stack focus: the last card whose top has reached the sticky line. */
  useEffect(() => {
    if (!desktop || cities.length === 0) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rail = railRef.current;
      const line = rail
        ? parseFloat(getComputedStyle(rail).getPropertyValue('--echo-grail-card-top')) || 0
        : 0;
      let idx = 0;
      cardRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line + 1) idx = i;
      });
      setStackIdx((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [desktop, cities.length]);

  const focusIdx = desktop ? stackIdx : activeIdx;

  /* Turn the globe to the focused city, then hand rotation back to the
     globe's auto-rotate after a short idle. */
  const [globeFocus, setGlobeFocus] = useState(null);
  useEffect(() => {
    const c = focusIdx != null ? cities[focusIdx] : null;
    if (!c) {
      setGlobeFocus(null);
      return undefined;
    }
    setGlobeFocus({ lat: c.lat, lng: c.lng });
    const t = setTimeout(() => setGlobeFocus(null), RESUME_AUTOROTATE_MS);
    return () => clearTimeout(t);
  }, [focusIdx, cities]);

  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cs = getComputedStyle(stickyRef.current || document.documentElement);
    const token =
      cs.getPropertyValue('--echo-globe-ocean').trim() ||
      cs.getPropertyValue('--echo-page-bg').trim() ||
      cs.getPropertyValue('--bg-primary').trim();
    if (token) setOceanFill(token);
  }, []);

  // Deterministic scroll tracker (same pattern as the Contents rail, which
  // deliberately avoids an IntersectionObserver band: a position scan is
  // correct on initial load, hash deep-links, fast scrolls, and at the page
  // bottom). The section in view is the LAST heading above the 35%-viewport
  // line; its mapped card becomes active. rAF-throttled so fast scrolling
  // coalesces to one update per frame; state only changes when the mapped
  // card changes, so no thrash.
  useEffect(() => {
    if (typeof window === 'undefined' || sections.length === 0 || desktop) return undefined;
    let canActivate = false;
    for (const v of sectionCardMap.values()) {
      if (v != null) canActivate = true;
    }
    if (!canActivate) return undefined; // no card ever matches (allowed: frozen articles)
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
        else if (el) break; // headings are in document order: first one below the line ends the scan
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = sections[sections.length - 1].id;
      }
      const idx = sectionCardMap.get(current);
      // Sticky relevance both directions: sections mapped to null (above the
      // first mention) keep whatever card was last active.
      if (idx != null) setActiveIdx((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [sections, sectionCardMap, desktop]);

  if (!rail) return null;
  const activeCity = focusIdx != null ? cities[focusIdx] : null;

  const metricBlock = (placement) =>
    metric ? (
      <div className={`echo-grail-metric echo-grail-metric--${placement}`}>
        <div className="echo-grail-metric-title echo-grail-mono">{metric.title}</div>
        <MetricSpark data={metric.data} />
        <div className="echo-grail-metric-ends echo-grail-mono">
          <span>{metric.startLabel}</span>
          <span>{metric.endLabel}</span>
        </div>
        {metric.note && <div className="echo-grail-metric-note echo-grail-mono">{metric.note}</div>}
      </div>
    ) : null;

  return (
    <aside ref={railRef} className="echo-grail" aria-label="Where this story lands">
      <div ref={stickyRef} className="echo-grail-sticky">
        <div className="echo-grail-head echo-grail-mono">GEOGRAPHY OF THE STORY</div>

        <div className={`echo-grail-globe-row echo-grail-globe-row--${newsSide}`}>
          <div className="echo-grail-globe">
            <InteractiveGlobe
              size={newsSide === 'below' && desktop ? 240 : 280}
              autoRotateSpeed={0.35}
              paused={!visible}
              markers={cities.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng }))}
              showConnections={false}
              focusTarget={globeFocus}
              {...(oceanFill ? { oceanFill } : {})}
            />
          </div>
          {desktop && activeCity ? (
            <EchoCityNews city={activeCity} className={`echo-grail-news--${newsSide}`} />
          ) : null}
        </div>

        {/* <1280px keeps the metric in its original place, under the globe. */}
        {metricBlock('inline')}
      </div>

      <div className="echo-grail-cards">
        {cities.map((c, i) => [
          /* Scroll runway between overtakes (>=1280px only). A separate
             element, not a margin on the card: a sticky card's margin must
             stay inside the container, which shoved earlier cards up under
             the globe as the last one arrived. */
          i > 0 ? (
            <div key={`gap-${c.name}`} className="echo-grail-stack-gap" aria-hidden="true" />
          ) : null,
          <div
            key={c.name}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className={`echo-grail-card${i === focusIdx ? ' is-active' : ''}`}
            style={desktop ? { zIndex: i + 1 } : undefined}
          >
            <div className="echo-grail-card-city echo-grail-mono">
              {c.name}
              {c.country ? ` · ${c.country}` : ''}
            </div>
            <p className="echo-grail-card-impact">{c.impact}</p>
          </div>,
        ])}
      </div>

      {/* >=1280px: the sticky block is globe-only, so the metric closes the rail. */}
      {metricBlock('end')}
    </aside>
  );
}

function MetricSpark({ data = [] }) {
  if (data.length < 2) return null;
  const W = 320;
  const H = 72;
  const P = 6;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const sx = (v) => P + ((v - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (v) => H - P - ((v - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const d = data.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
  return (
    <svg className="echo-grail-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path
        d={`${d} L ${sx(x1)} ${H - P} L ${sx(x0)} ${H - P} Z`}
        fill="var(--emerald)"
        opacity="0.1"
      />
      <path d={d} fill="none" stroke="var(--emerald)" strokeWidth="1.8" />
      <circle cx={sx(x1)} cy={sy(data.at(-1).y)} r="3" fill="var(--emerald)" />
    </svg>
  );
}

export default EchoGlobeRail;
