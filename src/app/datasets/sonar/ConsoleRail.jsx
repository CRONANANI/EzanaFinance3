'use client';

/**
 * Console rail, "continuum" design (Oct 21, replaces the Hub V1.1 channel
 * strips). The seven dataset dimensions still sit under the Sonar deck, wired
 * to it by the bus, one card per dimension in taxonomy order. What changed is
 * what the cards say about the platform:
 *
 *   Continuity. One trace runs through all seven cards. Every card's segment
 *   starts and ends on the same baseline and a joint carries it across the gap
 *   to the next card, so the row reads as a single unbroken signal. A relay
 *   pulse travels it left to right, handed from card to card. A roadmap
 *   dimension keeps the thread (dotted, dormant) rather than breaking it.
 *
 *   Adaptability. Each segment's shape follows its dimension: one wave cycle
 *   per dataset, amplitude by live share. The row reflows on hover and on
 *   selection (the chosen card widens, its neighbours give way), and each card
 *   carries its dimension's freshest live signal from the pulse.
 *
 * What is real: the dimension, its live and total dataset counts, one meter
 * cell per dataset (filled live, hollow roadmap), LIVE / ROADMAP, and the
 * latest signal (a real pulse row). What is decorative (aria-hidden): the
 * trace, the joints, the pulse and the bus. Trace points are deterministic
 * (sin of index), so SSR and client agree. No outer outline on the cards.
 *
 * Selecting a card drives the shared SonarSelection (and ?dimension=). While a
 * signal brief is open, choosing a card opens that dimension's freshest signal
 * instead, or closes the brief when the dimension has none. Selecting the
 * selected card again, or Escape inside the rail, clears the selection.
 */
import { useSonarSelection } from './SonarSelection';
import { usePulse } from './PulseProvider';
import './console-rail.css';

const W = 160;
const H = 34;
const BASE = H / 2;
const MAX_AMP = 12;
const STEPS = 64;

/* A segment that starts and ends on the baseline: integer half-cycles of sin
   are zero at both ends, so neighbouring segments meet the joint exactly. */
function tracePoints(cycles, share) {
  const k = Math.max(2, cycles);
  const amp = MAX_AMP * (0.35 + 0.65 * share);
  const pts = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const x = (i / STEPS) * W;
    const t = (x / W) * Math.PI;
    const y = BASE - amp * (0.78 * Math.sin(k * t) + 0.22 * Math.sin(2 * k * t));
    pts.push(`${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`);
  }
  return pts.join(' ');
}

const FLAT = `0,${BASE} ${W},${BASE}`;

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

function Card({ d, index, on, lead, onChoose }) {
  const pending = !Array.isArray(d.items);
  const total = pending ? 0 : d.items.length;
  const live = d.liveCount > 0;
  const share = total ? d.liveCount / total : 0;
  const cells = pending ? [] : [...d.items].sort((a, b) => Number(b.live) - Number(a.live));

  return (
    <button
      type="button"
      className={`dcr-strip${live ? ' is-live' : ' is-road'}${on ? ' is-on' : ''}`}
      style={{ '--dim': `var(--dcr-dim-${d.id}, var(--dcr-mint))`, '--i': index }}
      aria-pressed={on}
      aria-label={`${d.label}, ${d.liveCount} of ${total} datasets live${lead ? `. Latest: ${lead.headline}` : ''}`}
      onClick={onChoose}
    >
      {index > 0 ? <span className="dcr-joint" aria-hidden="true" /> : null}

      <span className="dcr-head">
        <span className="dcr-dot" aria-hidden="true" />
        <span className="dcr-name">{d.label}</span>
      </span>

      <svg
        className="dcr-trace"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <polyline className="dcr-trace-line" points={live ? tracePoints(total, share) : FLAT} />
        <polyline
          className="dcr-trace-pulse"
          pathLength="100"
          points={live ? tracePoints(total, share) : FLAT}
        />
      </svg>

      {pending ? (
        <span className="dcr-cells dcr-shimmer" aria-hidden="true" />
      ) : (
        <span className="dcr-cells" aria-hidden="true">
          {cells.map((it, k) => (
            <span key={`${it.label}-${k}`} className={`dcr-cell${it.live ? ' is-live' : ''}`} />
          ))}
        </span>
      )}

      <span className="dcr-latest" aria-hidden="true">
        {lead ? lead.headline : live ? 'Listening' : 'On the roadmap'}
      </span>

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
  const { openKey, open, close, leadFor } = usePulse();

  const choose = (id) => {
    if (openKey) {
      const lead = leadFor(id);
      if (lead) open(lead.key, 'rail');
      else {
        close();
        select(id, 'rail');
      }
      return;
    }
    select(selected === id ? null : id, 'rail');
  };

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
        className={`dcr-strips${selected ? ' has-on' : ''}`}
        role="group"
        aria-label="Dataset dimensions"
        onKeyDown={onKeyDown}
      >
        {dims.map((d, i) => (
          <Card
            key={d.id}
            d={d}
            index={i}
            on={selected === d.id}
            lead={leadFor(d.id)}
            onChoose={() => choose(d.id)}
          />
        ))}
      </div>
    </div>
  );
}
