'use client';

/**
 * Console rail (Oct 21, Hub V1.1 "Console rail below the deck"): the seven
 * dataset dimensions as channel strips docked under the Sonar deck, wired to
 * it by a bus line. Replaces the Oct 20 ingestion streams (side chips and
 * streams) around the deck. The deck itself (OrbitalMap) is untouched.
 *
 * What is real: one strip per taxonomy dimension in taxonomy order, its live
 * and total dataset counts, one tick per dataset (filled live, hollow
 * roadmap) and the LIVE / ROADMAP status. A dimension is ROADMAP when none of
 * its datasets is live.
 *
 * What is decorative (aria-hidden, no data): the waveform, the bus, the stems
 * and the stem pulse. The waveform's amplitude follows the live share and a
 * roadmap strip draws a flat dashed line; it has no axes and implies no time
 * series. Its points are deterministic (sin of index), so SSR and client agree.
 *
 * Selecting a strip drives the same SonarSelection state (and ?dimension= URL)
 * as the radar nodes, so the deck and the rail stay in step. Selecting the
 * selected strip again, or pressing Escape inside the rail, clears it.
 *
 * Design: docs/design/hub-console-handoff (04-SPEC.md is the measured spec).
 */
import { useSonarSelection } from './SonarSelection';
import './console-rail.css';

const WAVE_W = 134;
const WAVE_H = 34;
const BASE = WAVE_H / 2;
const MAX_AMP = 11;
const STEPS = 40;

/* One full period across WAVE_W, drawn twice (0 to 2W) so the idle drift
   (translateX by -W) loops without a seam. Pure, deterministic. */
function wavePoints(seed, share) {
  const amp = MAX_AMP * (0.55 + 0.45 * share);
  const pts = [];
  for (let i = 0; i <= STEPS * 2; i += 1) {
    const x = (i / STEPS) * WAVE_W;
    const t = (x / WAVE_W) * Math.PI * 2;
    const y = BASE - amp * (0.7 * Math.sin(3 * t + seed * 2.1) + 0.3 * Math.sin(t + seed));
    pts.push(`${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`);
  }
  return pts.join(' ');
}

const FLAT = `0,${BASE} ${WAVE_W * 2},${BASE}`;

/** Status line above the deck. Counts come from taxonomyCounts via the page. */
export function RailStatus({ dims, live, total }) {
  const streaming = dims.filter((d) => d.liveCount > 0).length;
  return (
    <p className="dcr-status">
      {dims.length} dimensions ·{' '}
      <span className="dcr-status-live">
        {live} of {total} datasets live
      </span>{' '}
      · {streaming} streaming
    </p>
  );
}

function Strip({ d, index, on, onToggle }) {
  const pending = !Array.isArray(d.items);
  const total = pending ? 0 : d.items.length;
  const live = d.liveCount > 0;
  const share = total ? d.liveCount / total : 0;
  /* Filled ticks first so the row reads as a meter. */
  const ticks = pending ? [] : [...d.items].sort((a, b) => Number(b.live) - Number(a.live));

  return (
    <button
      type="button"
      className={`dcr-strip${live ? ' is-live' : ' is-road'}${on ? ' is-on' : ''}`}
      style={{ '--dim': `var(--dcr-dim-${d.id}, var(--dcr-mint))`, '--i': index }}
      aria-pressed={on}
      aria-label={`${d.label}, ${d.liveCount} of ${total} datasets live`}
      onClick={onToggle}
    >
      <span className="dcr-head">
        <span className="dcr-dot" aria-hidden="true" />
        <span className="dcr-name">{d.label}</span>
      </span>

      <svg
        className="dcr-wave"
        viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path className="dcr-wave-base" d={`M0 ${BASE}H${WAVE_W}`} />
        <polyline className="dcr-wave-line" points={live ? wavePoints(index + 1, share) : FLAT} />
      </svg>

      {pending ? (
        <span className="dcr-ticks dcr-shimmer" aria-hidden="true" />
      ) : (
        <span className="dcr-ticks" aria-hidden="true">
          {ticks.map((it, k) => (
            <span key={`${it.label}-${k}`} className={`dcr-tick${it.live ? ' is-live' : ''}`} />
          ))}
        </span>
      )}

      <span className="dcr-foot">
        {pending ? (
          <span className="dcr-count dcr-shimmer" aria-hidden="true" />
        ) : (
          <span className="dcr-count">
            {d.liveCount}/{total}
          </span>
        )}
        <span className="dcr-state">{live ? 'LIVE' : 'ROADMAP'}</span>
      </span>
    </button>
  );
}

export default function ConsoleRail({ dims }) {
  const { selected, select } = useSonarSelection();
  const toggle = (id) => select(selected === id ? null : id, 'rail');

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation();
      select(null, 'rail');
    }
  };

  return (
    <div className="dcr-rail">
      <div className="dcr-bus" aria-hidden="true">
        <span className="dcr-feed" />
        <span className="dcr-node" />
        <span className="dcr-hair" />
      </div>
      <div
        className="dcr-strips"
        role="group"
        aria-label="Dataset dimensions"
        onKeyDown={onKeyDown}
      >
        {dims.map((d, i) => (
          <Strip key={d.id} d={d} index={i} on={selected === d.id} onToggle={() => toggle(d.id)} />
        ))}
      </div>
    </div>
  );
}
