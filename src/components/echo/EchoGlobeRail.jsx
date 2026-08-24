'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
 * compact metric sparkline, and one impact card per city. Only the globe +
 * chart block is sticky; the city cards sit in normal page flow below it and
 * scroll with the article. As the reader moves through sections, the card
 * mapped to the section in view activates and the globe focuses its region
 * (see buildSectionCardMap). All numbers/impact text derive from the article's
 * own content; city lat/lng are geographic facts. Rotation pauses when the
 * sticky block is offscreen and under prefers-reduced-motion (both handled via
 * the globe's `paused` prop; focus easing snaps under reduced motion inside
 * the globe itself).
 */
export function EchoGlobeRail({ rail, sections = [] }) {
  const stickyRef = useRef(null);
  const [visible, setVisible] = useState(true);
  // The globe's default oceanFill is tuned for the dark hero; in the article
  // rail resolve it from the theme so it doesn't render as a black disc in
  // light mode. Read once on mount.
  const [oceanFill, setOceanFill] = useState(null);

  const cities = useMemo(() => rail?.cities ?? [], [rail]);
  const metric = rail?.metric;

  const sectionCardMap = useMemo(() => buildSectionCardMap(sections, cities), [sections, cities]);
  // Initial active = the first section's mapped card (usually null until the
  // reader scrolls). Pure derivation, so SSR and hydration agree.
  const [activeIdx, setActiveIdx] = useState(() => sectionCardMap.get(sections[0]?.id) ?? null);

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
    const cs = getComputedStyle(document.documentElement);
    const token =
      cs.getPropertyValue('--echo-globe-ocean').trim() ||
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
    if (typeof window === 'undefined' || sections.length === 0) return undefined;
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
  }, [sections, sectionCardMap]);

  if (!rail) return null;
  const activeCity = activeIdx != null ? cities[activeIdx] : null;

  return (
    <aside className="echo-grail" aria-label="Where this story lands">
      <div ref={stickyRef} className="echo-grail-sticky">
        <div className="echo-grail-head echo-grail-mono">GEOGRAPHY OF THE STORY</div>

        <div className="echo-grail-globe">
          <InteractiveGlobe
            size={280}
            autoRotateSpeed={0.35}
            paused={!visible}
            markers={cities.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng }))}
            showConnections={false}
            focusTarget={activeCity ? { lat: activeCity.lat, lng: activeCity.lng } : null}
            {...(oceanFill ? { oceanFill } : {})}
          />
        </div>

        {metric && (
          <div className="echo-grail-metric">
            <div className="echo-grail-metric-title echo-grail-mono">{metric.title}</div>
            <MetricSpark data={metric.data} />
            <div className="echo-grail-metric-ends echo-grail-mono">
              <span>{metric.startLabel}</span>
              <span>{metric.endLabel}</span>
            </div>
            {metric.note && (
              <div className="echo-grail-metric-note echo-grail-mono">{metric.note}</div>
            )}
          </div>
        )}
      </div>

      <div className="echo-grail-cards">
        {cities.map((c, i) => (
          <div key={c.name} className={`echo-grail-card${i === activeIdx ? ' is-active' : ''}`}>
            <div className="echo-grail-card-city echo-grail-mono">
              {c.name}
              {c.country ? ` · ${c.country}` : ''}
            </div>
            <p className="echo-grail-card-impact">{c.impact}</p>
          </div>
        ))}
      </div>
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
