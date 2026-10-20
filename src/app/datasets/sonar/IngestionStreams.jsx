'use client';

/**
 * Ingestion streams (Oct 20): the seven dataset dimensions drawn as sources
 * around the Sonar device, each with a stream that runs into the radar centre,
 * so the page shows the data being taken in, not only the device.
 *
 * What is real: one source per taxonomy dimension, its live dataset count,
 * and the flow state. A dimension with live datasets streams (moving packets);
 * a roadmap dimension draws a still, dashed line, because nothing is flowing
 * from it yet. Selecting a source locks that dimension, the same selection the
 * radar nodes use (SonarSelection), so the two stay in step.
 *
 * Geometry is measured, not assumed: each stream runs from its chip's port to
 * the device's hub button (.dso-sc-hub), so it holds at every width. Wide
 * screens put four sources left and three right; narrow screens put all seven
 * in a row above the device and the streams drop into it.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSonarSelection } from './SonarSelection';
import './ingestion-streams.css';

const SPLIT = 4;
const NARROW = 1100;

function useStreams(wrapRef, portRefs, ids) {
  const [geo, setGeo] = useState({ w: 0, h: 0, mode: 'side', paths: [] });
  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const hub = wrap?.querySelector('.dso-sc-hub');
    if (!wrap || !hub) return;
    const box = wrap.getBoundingClientRect();
    const hb = hub.getBoundingClientRect();
    const hx = hb.left + hb.width / 2 - box.left;
    const hy = hb.top + hb.height / 2 - box.top;
    const mode = box.width < NARROW ? 'top' : 'side';
    const paths = ids.map((id) => {
      const el = portRefs.current[id];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const px = r.left + r.width / 2 - box.left;
      const py = r.top + r.height / 2 - box.top;
      const d =
        mode === 'top'
          ? `M${px} ${py}C${px} ${py + (hy - py) * 0.55} ${hx} ${hy - (hy - py) * 0.35} ${hx} ${hy}`
          : `M${px} ${py}C${px + (hx - px) * 0.55} ${py} ${hx - (hx - px) * 0.3} ${hy} ${hx} ${hy}`;
      return { id, d, px, py, hx, hy };
    });
    setGeo({ w: box.width, h: box.height, mode, paths: paths.filter(Boolean) });
  }, [wrapRef, portRefs, ids]);

  useLayoutEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(wrap);
    const stage = wrap.querySelector('.dso-sc-stage');
    if (stage) ro.observe(stage);
    return () => ro.disconnect();
  }, [measure, wrapRef]);

  /* Fonts and the scene settle after first paint; measure once more. */
  useEffect(() => {
    const t = setTimeout(measure, 400);
    return () => clearTimeout(t);
  }, [measure]);

  return geo;
}

function Source({ d, on, quiet, onToggle, portRef, side }) {
  return (
    <button
      type="button"
      className={`dso-ing-src is-${side}${d.live ? ' is-live' : ' is-road'}${on ? ' is-on' : ''}${quiet ? ' is-quiet' : ''}`}
      aria-pressed={on}
      aria-label={`${d.label}: ${
        d.live
          ? `${d.liveCount} live datasets streaming into Sonar`
          : 'on the roadmap, not yet streaming'
      }. ${on ? 'Selected, select again to clear.' : 'Select to lock.'}`}
      onClick={onToggle}
    >
      <span className="dso-ing-src-text">
        <span className="dso-ing-src-name">{d.label}</span>
        <span className="dso-ing-src-meta">
          {d.live ? `${d.liveCount}/${d.items.length} LIVE` : 'ROADMAP'}
        </span>
      </span>
      <span className="dso-ing-port" ref={portRef} aria-hidden="true" />
    </button>
  );
}

export default function IngestionStreams({ dims, children }) {
  const { selected, select } = useSonarSelection();
  const wrapRef = useRef(null);
  const portRefs = useRef({});
  const ids = useRef(dims.map((d) => d.id)).current;
  const geo = useStreams(wrapRef, portRefs, ids);
  const byId = Object.fromEntries(dims.map((d) => [d.id, d]));
  const toggle = (id) => select(selected === id ? null : id, 'streams');
  const left = dims.slice(0, SPLIT);
  const right = dims.slice(SPLIT);
  const live = dims.filter((d) => d.live).length;

  const source = (d, side) => (
    <Source
      key={d.id}
      d={d}
      side={side}
      on={selected === d.id}
      quiet={Boolean(selected) && selected !== d.id}
      onToggle={() => toggle(d.id)}
      portRef={(el) => {
        portRefs.current[d.id] = el;
      }}
    />
  );

  return (
    <div className="dso-ing-host">
      <div className={`dso-ing is-${geo.mode}`} ref={wrapRef}>
        <p className="dso-ing-kicker">
          {dims.length} dimensions in · <span>{live} streaming</span> · one Sonar
        </p>
        <div className="dso-ing-col dso-ing-col--left">{left.map((d) => source(d, 'left'))}</div>
        <div className="dso-ing-stage">{children}</div>
        <div className="dso-ing-col dso-ing-col--right">{right.map((d) => source(d, 'right'))}</div>

        {geo.w > 0 ? (
          <svg
            className="dso-ing-svg"
            width={geo.w}
            height={geo.h}
            viewBox={`0 0 ${geo.w} ${geo.h}`}
            aria-hidden="true"
          >
            <defs>
              {geo.paths.map((p) => (
                <linearGradient
                  key={p.id}
                  id={`dso-ing-g-${p.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={p.px}
                  y1={p.py}
                  x2={p.hx}
                  y2={p.hy}
                >
                  <stop offset="0%" className="dso-ing-stop" stopOpacity="0.9" />
                  <stop offset="70%" className="dso-ing-stop" stopOpacity="0.35" />
                  <stop offset="100%" className="dso-ing-stop" stopOpacity="0.05" />
                </linearGradient>
              ))}
            </defs>
            {geo.paths.map((p) => {
              const d = byId[p.id];
              const cls = `${d?.live ? ' is-live' : ' is-road'}${selected === p.id ? ' is-on' : ''}${
                selected && selected !== p.id ? ' is-quiet' : ''
              }`;
              return (
                <g key={p.id} className={`dso-ing-stream${cls}`}>
                  <path className="dso-ing-line" d={p.d} stroke={`url(#dso-ing-g-${p.id})`} />
                  {d?.live ? <path className="dso-ing-flow" d={p.d} /> : null}
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
