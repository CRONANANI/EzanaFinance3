'use client';

import { useMemo, useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';
import { clampLabel, labelSpan, packRows, textWidth, truncate } from './fit';

const W = 1120;
const H_MIN = 620;
const PAD = { l: 24, r: 24, t: 112, b: 40 };
const LANE_H = 66;
const LANES = 6; // the frame grows past this when a cluster needs more
const LANES_MAX = 10;
const PLAQUE_MAX = 300;

/* A plaque's `year` may be fractional (2014.75) with the readable date in
   `label` ("Oct 2014"). Then the date is the headline and the event (from
   `detail`) the second line; otherwise the integer year headlines and
   `label` is the event. */
const DATEISH =
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|h[12]|fy|early|mid|late|spring|summer|autumn|fall|winter|\d{4}$)/i;
function plaqueText(p) {
  const raw = String(p.label || '').trim();
  const dateLabel = raw.length <= 14 && DATEISH.test(raw);
  if (Number.isInteger(p.year) || !dateLabel) {
    return { head: String(Number.isInteger(p.year) ? p.year : Math.floor(p.year)), sub: p.label };
  }
  return { head: p.label, sub: p.title || p.event || p.detail || '' };
}

export function EchoWallTimeline({
  figureLabel,
  kicker,
  hint,
  source,
  startYear,
  endYear,
  windows = [],
  plaques = [],
}) {
  const [selected, setSelected] = useState(null);
  const x = useMemo(() => {
    const span = endYear - startYear;
    /* Clamped: a plaque dated just past endYear sits at the edge, not off it. */
    return (yr) =>
      PAD.l +
      ((Math.min(Math.max(yr, startYear), endYear) - startYear) / span) * (W - PAD.l - PAD.r);
  }, [startYear, endYear]);

  const decades = useMemo(() => {
    const out = [];
    const span = endYear - startYear;
    const step = span > 200 ? 50 : span > 40 ? 10 : span > 12 ? 5 : span > 6 ? 2 : 1;
    for (let yr = Math.ceil(startYear / step) * step; yr <= endYear; yr += step) out.push(yr);
    return out;
  }, [startYear, endYear]);

  /* Window labels: kept inside the frame, and on separate rows when two
     would overlap. */
  const windowLabels = useMemo(() => {
    const items = windows.map((w, i) => {
      const text = `W${i + 1} · ${String(w.label).toUpperCase()}`;
      const width = textWidth(text, 16, { letterSpacing: 1.5 });
      const { x: lx, anchor } = clampLabel(x(w.from) + 6, width, PAD.l, W - PAD.r, 'start', 2);
      return { text, lx, anchor, span: labelSpan(lx, width, anchor) };
    });
    const rows = packRows(
      items.map((i) => i.span),
      { gap: 16, maxRows: 3 },
    );
    return items.map((it, i) => ({ ...it, row: rows[i] }));
  }, [windows, x]);

  /* Plaques: 300px max boxes, flipped left when they would run off the
     right edge, and placed in the first lane where they do not sit on an
     earlier plaque. An explicit `lane` is honoured when it is free. */
  const placed = useMemo(() => {
    const items = plaques.map((p, i) => {
      const { head, sub } = plaqueText(p);
      const px = x(p.year);
      const wdt = Math.min(PLAQUE_MAX, 24 + Math.max(textWidth(head, 16.5), textWidth(sub, 15)));
      const flip = px + wdt > W - PAD.r;
      const bx = flip ? px - wdt : px;
      return { p, i, head, sub, px, wdt, bx, span: [bx, bx + wdt] };
    });
    const laneEnd = new Array(LANES).fill(-Infinity);
    const byX = [...items].sort((a, b) => a.span[0] - b.span[0]);
    for (const it of byX) {
      const want = it.p.lane;
      let lane = -1;
      if (Number.isInteger(want) && want >= 0 && want < LANES && laneEnd[want] + 8 <= it.span[0])
        lane = want;
      if (lane === -1) lane = laneEnd.findIndex((end) => end + 8 <= it.span[0]);
      /* A dense cluster opens a new lane (taller frame) rather than
         stacking two plaques on top of each other. */
      if (lane === -1 && laneEnd.length < LANES_MAX) {
        lane = laneEnd.length;
        laneEnd.push(-Infinity);
      }
      if (lane === -1) lane = laneEnd.indexOf(Math.min(...laneEnd));
      laneEnd[lane] = it.span[1];
      it.lane = lane;
    }
    return items;
  }, [plaques, x]);
  const laneCount = Math.max(LANES, ...placed.map((it) => it.lane + 1));
  const H = Math.max(H_MIN, PAD.t + laneCount * LANE_H + PAD.b + 8);

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg className="echo-fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel}>
        {/* shaded windows + window labels */}
        {windows.map((w, i) => (
          <g key={w.id}>
            <rect
              x={x(w.from)}
              y={PAD.t - 24}
              width={x(w.to) - x(w.from)}
              height={H - PAD.t - PAD.b + 24}
              fill={w.color}
              opacity="0.10"
            />
            <text
              x={windowLabels[i].lx}
              y={PAD.t - 34 - windowLabels[i].row * 18}
              textAnchor={windowLabels[i].anchor}
              className="echo-fig-mono"
              fontSize="16"
              letterSpacing="1.5"
              fill="var(--text-muted)"
            >
              {windowLabels[i].text}
            </text>
            <line
              x1={x(w.from)}
              y1={PAD.t - 30 - windowLabels[i].row * 18}
              x2={x(w.from)}
              y2={PAD.t - 20}
              stroke="var(--border-secondary)"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* axis */}
        <line
          x1={PAD.l}
          y1={H - PAD.b}
          x2={W - PAD.r}
          y2={H - PAD.b}
          stroke="var(--border-secondary)"
        />
        {decades.map((yr) => (
          <g key={yr}>
            <line
              x1={x(yr)}
              y1={H - PAD.b}
              x2={x(yr)}
              y2={H - PAD.b + 5}
              stroke="var(--border-secondary)"
            />
            <text
              x={x(yr)}
              y={H - PAD.b + 20}
              textAnchor="middle"
              className="echo-fig-mono"
              fontSize="16"
              fill="var(--text-muted)"
            >
              {yr}
            </text>
          </g>
        ))}

        {/* plaques */}
        {placed.map(({ p, i, head, sub, px, wdt, bx, lane }) => {
          const py = PAD.t + lane * LANE_H;
          const active = selected === i;
          return (
            <g
              key={`${p.year}-${p.label}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(active ? null : i)}
            >
              <line
                x1={px}
                y1={py + 44}
                x2={px}
                y2={H - PAD.b}
                stroke="var(--echo-chart-annotation)"
                strokeDasharray="2 3"
              />
              <rect
                x={bx}
                y={py}
                width={wdt}
                height={44}
                fill="var(--bg-primary)"
                stroke={active ? 'var(--emerald)' : 'var(--border-primary)'}
                strokeWidth={active ? 1.5 : 1}
              />
              <rect x={bx} y={py} width={3} height={44} fill="var(--echo-chart-blue)" />
              <text
                x={bx + 10}
                y={py + 18}
                className="echo-fig-mono"
                fontWeight="700"
                fontSize="16.5"
                fill="var(--text-primary)"
              >
                {truncate(head, wdt - 20, 16.5)}
              </text>
              <text
                x={bx + 10}
                y={py + 35}
                className="echo-fig-mono"
                fontSize="15"
                fill="var(--text-muted)"
              >
                {truncate(sub, wdt - 20, 15)}
              </text>
            </g>
          );
        })}
      </svg>
      {selected != null && plaques[selected] && (
        <div className="echo-fig-detail">
          <strong>
            {plaques[selected].year} · {plaques[selected].label}
          </strong>{' '}
          — {plaques[selected].detail}
        </div>
      )}
    </EchoFigureShell>
  );
}
