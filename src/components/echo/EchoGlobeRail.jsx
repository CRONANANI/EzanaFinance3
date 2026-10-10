'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractiveGlobe } from '@/components/ui/interactive-globe';
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
 * order, so the outcome is stable). Pure function of its inputs: server and
 * client derive the identical result.
 *
 * Returns { sectionToCard, cardToSection }:
 *   sectionToCard: section id -> card index. Sections with no card of their
 *     own inherit the previous section's card (sticky relevance, no flicker to
 *     empty); cards that never match simply never activate.
 *   cardToSection: card index -> the section it claimed (the globe's
 *     click-to-jump target).
 */
function buildSectionCardMap(sections, cities) {
  const claimed = new Map(); // section id -> city index
  const cardToSection = new Map();
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
    if (target) {
      claimed.set(target, idx);
      cardToSection.set(idx, target);
    }
  });
  const sectionToCard = new Map();
  let carry = null;
  for (const s of sections) {
    if (claimed.has(s.id)) carry = claimed.get(s.id);
    sectionToCard.set(s.id, carry);
  }
  return { sectionToCard, cardToSection };
}

/**
 * "Geography of the story" rail: a rotating city globe (a smaller instance of
 * the landing-hero InteractiveGlobe, showing only this article's cities), one
 * impact card per city, and a compact metric sparkline.
 *
 * One rule drives the card at every width: the section in view (the last
 * heading above the 35%-viewport line) picks the city via
 * buildSectionCardMap, so the card always matches the part of the article
 * being read.
 *
 * >=1280px (three-column layout): the head, globe and the ACTIVE city card
 *   are one sticky block. Only that one card is rendered; when the city
 *   changes the new card slides up into place (a plain fade under reduced
 *   motion). No other card sits underneath it.
 * <1280px: the rail renders inline after the hero and all cards scroll
 *   horizontally, the active one highlighted.
 *
 * Clicking a city marker on the globe scrolls the article to that city's
 * section (its sectionAnchor, or the section that first mentions it) and
 * activates its card immediately.
 *
 * All numbers/impact text derive from the article's own content; city
 * lat/lng are geographic facts. Rotation pauses while the sticky block is
 * offscreen; the globe turns to the active city and resumes auto-rotation
 * after 2.5s.
 */
const DESKTOP_QUERY = '(min-width: 1280px)';
const RESUME_AUTOROTATE_MS = 2500;
/* Clear air between the sticky navbar and a jumped-to heading. */
const JUMP_OFFSET_PX = 96;

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

  const { sectionToCard, cardToSection } = useMemo(
    () => buildSectionCardMap(sections, cities),
    [sections, cities],
  );
  // Initial active = the first section's mapped card (usually null until the
  // reader scrolls). Pure derivation, so SSR and hydration agree.
  const [activeIdx, setActiveIdx] = useState(() => sectionToCard.get(sections[0]?.id) ?? null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  /* Desktop always shows a card: before the first city is mentioned it shows
     the first city, so the slot never sits empty. */
  const focusIdx = activeIdx ?? (desktop && cities.length ? 0 : null);

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
  // card changes, so no thrash. Runs at every width.
  useEffect(() => {
    if (typeof window === 'undefined' || sections.length === 0) return undefined;
    let canActivate = false;
    for (const v of sectionToCard.values()) {
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
      const idx = sectionToCard.get(current);
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
  }, [sections, sectionToCard]);

  /* Globe click: jump to the city's section and activate its card now (the
     scroll tracker lands on the same card once the scroll settles). */
  const onMarkerClick = useCallback(
    (i) => {
      if (i == null || !cities[i]) return;
      setActiveIdx(i);
      const id = cardToSection.get(i);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      const reduce =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - JUMP_OFFSET_PX,
        behavior: reduce ? 'auto' : 'smooth',
      });
    },
    [cities, cardToSection],
  );

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

  const card = (c, i, extraClass = '') => (
    <div
      key={`${c.name}-${i}`}
      className={`echo-grail-card${i === focusIdx ? ' is-active' : ''}${extraClass}`}
    >
      <div className="echo-grail-card-city echo-grail-mono">
        {c.name}
        {c.country ? ` · ${c.country}` : ''}
      </div>
      <p className="echo-grail-card-impact">{c.impact}</p>
    </div>
  );

  return (
    <aside className="echo-grail" aria-label="Where this story lands">
      <div ref={stickyRef} className="echo-grail-sticky">
        <div className="echo-grail-head echo-grail-mono">GEOGRAPHY OF THE STORY</div>

        <div className="echo-grail-globe" title="Select a city to jump to it in the article">
          <InteractiveGlobe
            size={280}
            autoRotateSpeed={0.35}
            paused={!visible}
            markers={cities.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng }))}
            showConnections={false}
            focusTarget={globeFocus}
            onMarkerClick={onMarkerClick}
            {...(oceanFill ? { oceanFill } : {})}
          />
        </div>

        {/* >=1280px: the single active card, re-keyed per city so it slides
            up into place when the city changes. */}
        {desktop && activeCity ? (
          <div className="echo-grail-slot" aria-live="polite">
            {card(activeCity, focusIdx, ' echo-grail-card--slot')}
          </div>
        ) : null}

        {/* <1280px keeps the metric in its original place, under the globe. */}
        {metricBlock('inline')}
      </div>

      {/* <1280px: every card, in a horizontal row. */}
      {!desktop ? <div className="echo-grail-cards">{cities.map((c, i) => card(c, i))}</div> : null}

      {/* >=1280px: the sticky block is globe + card, so the metric closes the rail. */}
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
