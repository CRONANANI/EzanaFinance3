'use client';

/* Alternate layouts for the chain-of-command chart (the "Tiers" band chart
   lives inline in OrgFinalClient). These are pure-presentational: every node,
   avatar and callback is passed down so committee/role styling stays in one
   place. Classes: oxc-* (Columns) · oxrad-* (Radial). */

import { UserPlus } from 'lucide-react';

/* A single unfilled seat — honest placeholder, never a fabricated person. */
export function VacantSeat({ label = 'Open role' }) {
  return (
    <div className="ox-vacant" role="note" aria-label={`${label} — vacant`}>
      <span className="ox-vacant-ic">
        <UserPlus size={13} strokeWidth={1.8} />
      </span>
      <span className="ox-vacant-tx">
        <span className="ox-vacant-nm">{label}</span>
        <span className="ox-vacant-rl">Vacant</span>
      </span>
    </div>
  );
}

/* ── Columns: leadership column + one column per sector desk ───────────── */
export function ColumnsView({ leadershipNodes, desks, committee, Node, fmtSignedPct }) {
  return (
    <div className={`oxc-wrap${committee ? ' ic-mode' : ''}`}>
      {leadershipNodes.length > 0 && (
        <div className="oxc-col oxc-lead">
          <div className="oxc-col-head">
            <span className="oxc-col-tag">Leadership</span>
            <span className="oxc-col-count">{leadershipNodes.length}</span>
          </div>
          <div className="oxc-col-body">
            {leadershipNodes.map((m) => (
              <Node key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}
      {desks.map((d) => (
        <div className="oxc-col" key={d.teamId}>
          <div className="oxc-col-head">
            <span className="oxc-col-tag">{d.name}</span>
            <span className={`oxc-col-roi${d.roiPct != null && d.roiPct < 0 ? ' neg' : ''}`}>
              {fmtSignedPct(d.roiPct)}
            </span>
          </div>
          <div className="oxc-col-body">
            {d.lead ? <Node m={d.lead} /> : <VacantSeat label="Desk head" />}
            {d.analysts.map((a) => (
              <Node key={a.id} m={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Radial: president at the hub, leadership on an inner ring, desk heads
   on the outer ring, thin SVG spokes connecting them. ─────────────────── */
const RAD_SIZE = 560;
const RAD_C = RAD_SIZE / 2;

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function RadialView({
  president,
  innerNodes,
  desks,
  committee,
  initials,
  clsOf,
  tierOf,
  isCommittee,
  fmtSignedPct,
  onOpen,
}) {
  const innerR = 128;
  const outerR = 232;

  const innerPts = innerNodes.map((m, i) => ({
    m,
    ...polar(RAD_C, RAD_C, innerR, innerNodes.length === 1 ? 180 : (360 / innerNodes.length) * i),
  }));
  const outerPts = desks.map((d, i) => ({
    d,
    ...polar(RAD_C, RAD_C, outerR, (360 / Math.max(desks.length, 1)) * i),
  }));

  return (
    <div className={`oxrad-scroll${committee ? ' ic-mode' : ''}`}>
      <div className="oxrad" style={{ width: RAD_SIZE, height: RAD_SIZE }}>
        <svg className="oxrad-spokes" viewBox={`0 0 ${RAD_SIZE} ${RAD_SIZE}`} aria-hidden="true">
          {innerPts.map((p, i) => (
            <line key={`i${i}`} x1={RAD_C} y1={RAD_C} x2={p.x} y2={p.y} className="oxrad-spoke" />
          ))}
          {outerPts.map((p, i) => (
            <line
              key={`o${i}`}
              x1={RAD_C}
              y1={RAD_C}
              x2={p.x}
              y2={p.y}
              className="oxrad-spoke faint"
            />
          ))}
        </svg>

        {/* president hub */}
        {president && (
          <button
            type="button"
            className={`oxrad-node hub${isCommittee(president) ? ' ic' : ''}`}
            style={{ left: RAD_C, top: RAD_C }}
            onClick={() => onOpen(president)}
          >
            <span
              className={`ox-av ${clsOf(president)}`}
              style={{ width: 40, height: 40, fontSize: 12 }}
            >
              {initials(president.display_name)}
            </span>
            <span className="oxrad-nm">{president.display_name}</span>
            <span className="oxrad-rl">{president.title || tierOf(president).label}</span>
          </button>
        )}

        {/* leadership ring */}
        {innerPts.map(({ m, x, y }) => (
          <button
            type="button"
            key={m.id}
            className={`oxrad-node${isCommittee(m) ? ' ic' : ''}`}
            style={{ left: x, top: y }}
            onClick={() => onOpen(m)}
          >
            <span className={`ox-av ${clsOf(m)}`} style={{ width: 30, height: 30, fontSize: 9.5 }}>
              {initials(m.display_name)}
            </span>
            <span className="oxrad-nm">{m.display_name}</span>
            <span className="oxrad-rl">{m.title || tierOf(m).label}</span>
          </button>
        ))}

        {/* desk ring */}
        {outerPts.map(({ d, x, y }) => {
          const head = d.lead;
          const openCount = head ? 0 : 1;
          return (
            <button
              type="button"
              key={d.teamId}
              className={`oxrad-node desk${head && isCommittee(head) ? ' ic' : ''}${head ? '' : ' vacant'}`}
              style={{ left: x, top: y }}
              onClick={() => (head ? onOpen(head) : undefined)}
              disabled={!head}
            >
              <span className="oxrad-desk-tag">{d.name}</span>
              {head ? (
                <>
                  <span
                    className={`ox-av ${clsOf(head)}`}
                    style={{ width: 26, height: 26, fontSize: 8.5 }}
                  >
                    {initials(head.display_name)}
                  </span>
                  <span className="oxrad-nm">{head.display_name}</span>
                </>
              ) : (
                <span className="oxrad-nm vacant">Desk head vacant</span>
              )}
              <span className="oxrad-desk-meta">
                <span className={`oxrad-roi${d.roiPct != null && d.roiPct < 0 ? ' neg' : ''}`}>
                  {fmtSignedPct(d.roiPct)}
                </span>
                {openCount > 0 && <span className="oxrad-open">{openCount} open</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
