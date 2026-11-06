'use client';

/**
 * CobeGlobe: the Ezana Echo article globe (Nov 2026), built on cobe and the
 * 21st.dev "cobe globe CDN" card: a white dotted globe that spins slowly,
 * thin arcs between places, and a small spinning pyramid with a mono label
 * over each place.
 *
 * Ported to plain JSX and page-scoped CSS (no TypeScript, no Tailwind) and
 * wired to the same contract the rail gave the previous globe:
 *   markers        [{ name, lat, lng }]  the article's cities
 *   focusTarget    { lat, lng } | null   ease the globe until that place is
 *                                         front and centre; null hands the
 *                                         globe back to its slow spin
 *   activeIndex    the focused city's index, whose label is emphasised
 *   onMarkerClick  (index) => void       a click on (or near) a marker
 *   paused         stop drawing while the rail is offscreen
 *   size           px, square
 *
 * Labels and clicks use the same projection cobe uses internally (cobe 2.0,
 * lib/echo/globe-math.js), computed every frame, so they track the dots in
 * every browser; the 21st.dev demo used CSS anchor positioning, which not
 * every browser supports yet. Arcs join the cities in the order the article
 * names them; the demo's traffic numbers are not shown, because an article
 * has no such figures. Colours come from the --echo-globe-* tokens.
 * Reduced motion: no spin, the pyramids stand still, focus jumps instead of
 * easing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import createGlobe from 'cobe';
import {
  BASE_THETA,
  MARKER_ELEVATION,
  MAX_THETA,
  focusAngles,
  locationToScreen,
  shortestTurn,
} from '@/lib/echo/globe-math';
import './cobe-globe.css';

const EASE = 0.08;
const DRAG_PHI = 300;
const DRAG_THETA = 1000;
const HIT_PX = 16;

/* A token's colour as cobe's [r, g, b] in 0..1. */
function tokenRgb(el, name, fallback) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.display = 'none';
  el.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/rgba?\(([^)]+)\)/);
  probe.remove();
  if (!m) return fallback;
  const [r, g, b] = m[1].split(',').map((v) => Number.parseFloat(v));
  return [r, g, b].every(Number.isFinite) ? [r / 255, g / 255, b / 255] : fallback;
}

export function CobeGlobe({
  markers = [],
  focusTarget = null,
  activeIndex = null,
  onMarkerClick = null,
  paused = false,
  size = 280,
  speed = 0.003,
  className = '',
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRefs = useRef([]);
  const state = useRef({ phi: 0, theta: BASE_THETA });
  const focusRef = useRef(focusTarget);
  focusRef.current = focusTarget;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;
  const drag = useRef(null);
  const [failed, setFailed] = useState(false);

  const points = useMemo(
    () =>
      markers
        .map((m, i) => ({ ...m, i, lat: Number(m.lat), lng: Number(m.lng) }))
        .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)),
    [markers],
  );
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const key = useMemo(() => points.map((p) => `${p.lat},${p.lng}`).join('|'), [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ink = tokenRgb(wrap, '--echo-globe-ink', [0.07, 0.07, 0.07]);
    const paper = tokenRgb(wrap, '--echo-globe-paper', [1, 1, 1]);
    const glow = tokenRgb(wrap, '--echo-globe-glow', [0.94, 0.93, 0.91]);
    const pts = pointsRef.current;
    const arcs = pts.slice(1).map((p, i) => ({
      from: [pts[i].lat, pts[i].lng],
      to: [p.lat, p.lng],
    }));

    let globe = null;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: size,
        height: size,
        phi: state.current.phi,
        theta: state.current.theta,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: paper,
        markerColor: ink,
        glowColor: glow,
        markerElevation: MARKER_ELEVATION,
        markers: pts.map((p) => ({ location: [p.lat, p.lng], size: 0.012 })),
        arcs,
        arcColor: ink,
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.7,
      });
    } catch {
      globe = null;
    }
    if (!globe) {
      setFailed(true);
      return undefined;
    }
    setFailed(false);

    let raf = 0;
    const frame = () => {
      raf = window.requestAnimationFrame(frame);
      const s = state.current;
      const f = focusRef.current;
      if (drag.current) {
        /* the reader is turning the globe */
      } else if (f && Number.isFinite(f.lat) && Number.isFinite(f.lng)) {
        const t = focusAngles(f.lat, f.lng);
        const dPhi = shortestTurn(s.phi, t.phi);
        const dTheta = t.theta - s.theta;
        if (reduce || (Math.abs(dPhi) < 0.002 && Math.abs(dTheta) < 0.002)) {
          s.phi += dPhi;
          s.theta = t.theta;
        } else {
          s.phi += dPhi * EASE;
          s.theta += dTheta * EASE;
        }
      } else if (!pausedRef.current) {
        if (!reduce) s.phi += speed;
        s.theta += (BASE_THETA - s.theta) * (reduce ? 1 : 0.03);
      } else {
        return; // offscreen and idle: nothing to draw
      }
      globe.update({ phi: s.phi, theta: s.theta });
      for (const p of pointsRef.current) {
        const el = labelRefs.current[p.i];
        if (!el) continue;
        const at = locationToScreen(p.lat, p.lng, s.phi, s.theta);
        el.style.left = `${(at.x * 100).toFixed(3)}%`;
        el.style.top = `${(at.y * 100).toFixed(3)}%`;
        const shown = at.visible ? Math.min(1, at.depth * 4) : 0;
        el.style.setProperty('--cbg-visible', shown.toFixed(3));
      }
    };
    frame();
    window.setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = '1';
    }, 0);
    return () => {
      window.cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, [key, size, speed]);

  /* The nearest facing marker within HIT_PX of a canvas point. */
  const hitTest = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const { phi, theta } = state.current;
    let best = null;
    let bestD = HIT_PX;
    for (const p of pointsRef.current) {
      const at = locationToScreen(p.lat, p.lng, phi, theta);
      if (!at.visible) continue;
      const d = Math.hypot(
        rect.left + at.x * rect.width - clientX,
        rect.top + at.y * rect.height - clientY,
      );
      if (d <= bestD) {
        best = p.i;
        bestD = d;
      }
    }
    return best;
  }, []);

  const onPointerDown = useCallback((e) => {
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      phi: state.current.phi,
      theta: state.current.theta,
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const d = drag.current;
      if (!d) {
        const over = hitTest(e.clientX, e.clientY) != null && clickRef.current;
        e.currentTarget.style.cursor = over ? 'pointer' : 'grab';
        return;
      }
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      state.current.phi = d.phi + dx / DRAG_PHI;
      state.current.theta = Math.max(-MAX_THETA, Math.min(MAX_THETA, d.theta + dy / DRAG_THETA));
    },
    [hitTest],
  );

  const onPointerUp = useCallback(
    (e) => {
      const d = drag.current;
      drag.current = null;
      e.currentTarget.style.cursor = 'grab';
      if (d && !d.moved && clickRef.current) {
        const hit = hitTest(e.clientX, e.clientY);
        if (hit != null) clickRef.current(hit);
      }
    },
    [hitTest],
  );

  return (
    <div
      ref={wrapRef}
      className={`cbg${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <div className="cbg-fallback" aria-hidden="true" />
      ) : (
        <canvas
          ref={canvasRef}
          className="cbg-canvas"
          width={size}
          height={size}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
          aria-hidden="true"
        />
      )}
      {!failed
        ? points.map((p) => (
            <div
              key={`${p.name}-${p.i}`}
              ref={(el) => {
                labelRefs.current[p.i] = el;
              }}
              className={`cbg-label${p.i === activeIndex ? ' is-active' : ''}`}
              aria-hidden="true"
            >
              <span className="cbg-pyramid">
                <span className="cbg-face cbg-face--1" />
                <span className="cbg-face cbg-face--2" />
                <span className="cbg-face cbg-face--3" />
                <span className="cbg-face cbg-face--4" />
              </span>
              <span className="cbg-tag">{p.name}</span>
            </div>
          ))
        : null}
      {/* Keyboard and screen reader route to the same jump as a click. */}
      {onMarkerClick && points.length ? (
        <ul className="cbg-sr">
          {points.map((p) => (
            <li key={`sr-${p.name}-${p.i}`}>
              <button type="button" onClick={() => onMarkerClick(p.i)}>
                Jump to {p.name} in the article
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default CobeGlobe;
