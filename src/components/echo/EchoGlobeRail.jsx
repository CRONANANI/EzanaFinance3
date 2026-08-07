'use client';

import { useEffect, useRef, useState } from 'react';
import { InteractiveGlobe } from '@/components/ui/interactive-globe';
import './echo-globe-rail.css';

/**
 * Sticky "geography of the story" rail: a rotating city globe (a smaller
 * instance of the landing-hero InteractiveGlobe, showing only this article's
 * cities), a compact metric sparkline, and one impact card per city. All
 * numbers/impact text derive from the article's own content; city lat/lng are
 * geographic facts. Rotation pauses when the rail is scrolled offscreen and
 * under prefers-reduced-motion (both handled via the globe's `paused` prop).
 */
export function EchoGlobeRail({ rail }) {
  const hostRef = useRef(null);
  const [visible, setVisible] = useState(true);
  // The globe's default oceanFill is tuned for the dark hero; in the article
  // rail resolve it from the theme so it doesn't render as a black disc in
  // light mode. Read once on mount.
  const [oceanFill, setOceanFill] = useState(null);

  useEffect(() => {
    const el = hostRef.current;
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

  if (!rail) return null;
  const { cities = [], metric } = rail;

  return (
    <aside ref={hostRef} className="echo-grail" aria-label="Where this story lands">
      <div className="echo-grail-head echo-grail-mono">GEOGRAPHY OF THE STORY</div>

      <div className="echo-grail-globe">
        <InteractiveGlobe
          size={280}
          autoRotateSpeed={0.35}
          paused={!visible}
          markers={cities.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng }))}
          showConnections={false}
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

      <div className="echo-grail-cards">
        {cities.map((c) => (
          <div key={c.name} className="echo-grail-card">
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
