'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  THIEL_NETWORK_PEOPLE,
  THIEL_NETWORK_SPHERES,
  computeSphereShares,
} from '@/lib/thiel-network-data';
import './thiel-network-pie.css';

// Tie chip color mapping → existing tokens only.
const TIE_COLOR = {
  business: 'var(--emerald)',
  political: 'var(--echo-chart-purple, var(--purple))',
  intellectual: 'var(--echo-chart-blue, var(--blue))',
  association: 'var(--text-muted)',
};
const TIE_LABEL = {
  business: 'Business tie',
  political: 'Political tie',
  intellectual: 'Intellectual tie',
  association: 'Association',
};

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Build SVG arc path for a pie slice.
function arcPath(cx, cy, r, startAng, endAng) {
  const p = (ang) => [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  const [x1, y1] = p(startAng);
  const [x2, y2] = p(endAng);
  const large = endAng - startAng > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function ThielNetworkPie({
  people = THIEL_NETWORK_PEOPLE,
  spheres = THIEL_NETWORK_SPHERES,
  title = 'Thiel network: figures by sphere',
  caption = 'Hover or tap a face to see who they are, what they do, and how they connect to Thiel. Categorization is editorial; several figures span multiple spheres.',
}) {
  const shares = useMemo(() => computeSphereShares(people, spheres), [people, spheres]);
  const [activeId, setActiveId] = useState(people[0]?.id ?? null);
  const [pinned, setPinned] = useState(false);

  const active = people.find((p) => p.id === activeId) || null;

  const hover = useCallback(
    (id) => {
      if (!pinned) setActiveId(id);
    },
    [pinned],
  );
  const pin = useCallback(
    (id) => {
      setActiveId(id);
      setPinned((prev) => (activeId === id ? !prev : true));
    },
    [activeId],
  );

  // Geometry
  const SIZE = 320;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const rPie = 96;
  const rAvatar = 138; // avatar ring radius
  const rDot = 16;

  // Pie slice angles
  let acc = -Math.PI / 2;
  const slices = shares.map((s) => {
    const frac = s.count / people.length;
    const start = acc;
    const end = acc + frac * Math.PI * 2;
    acc = end;
    return { ...s, start, end, mid: (start + end) / 2 };
  });

  // Position each person around the ring, grouped by sphere arc.
  const avatarNodes = [];
  slices.forEach((slice) => {
    const n = slice.people.length;
    slice.people.forEach((person, i) => {
      // spread people across their slice's angular span with padding
      const pad = (slice.end - slice.start) * 0.12;
      const a0 = slice.start + pad;
      const a1 = slice.end - pad;
      const t = n === 1 ? 0.5 : i / (n - 1);
      const ang = a0 + t * (a1 - a0);
      avatarNodes.push({
        ...person,
        sphereColor: slice.color,
        x: cx + rAvatar * Math.cos(ang),
        y: cy + rAvatar * Math.sin(ang),
      });
    });
  });

  return (
    <div className="ezana-card tnp-card">
      <div className="ezana-card-header">
        <div>
          <div className="ezana-card-title">{title}</div>
          <div className="ezana-card-subtitle">Interactive · {people.length} figures</div>
        </div>
        <div className="tnp-legend">
          {slices.map((s) => (
            <span key={s.id} className="tnp-legend-item">
              <span className="tnp-legend-dot" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
              <span className="tnp-legend-pct">{s.pct.toFixed(1)}%</span>
            </span>
          ))}
        </div>
      </div>

      <p className="tnp-caption">{caption}</p>

      <div className="tnp-body">
        {/* ---- Pie + avatar ring ---- */}
        <div className="tnp-vizwrap">
          <svg
            className="tnp-svg"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label="Pie chart of Thiel network figures by sphere, with selectable faces"
          >
            {/* slices */}
            {slices.map((s) => (
              <path
                key={s.id}
                d={arcPath(cx, cy, rPie, s.start, s.end)}
                fill={s.color}
                opacity={active && active.sphere === s.id ? 0.95 : 0.5}
                stroke="var(--bg-secondary)"
                strokeWidth="2"
              />
            ))}
            {/* center hole for donut feel */}
            <circle cx={cx} cy={cy} r={rPie * 0.42} fill="var(--bg-secondary)" />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontSize="11"
              fill="var(--text-muted)"
            >
              THIEL
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontSize="9"
              fill="var(--text-faint)"
            >
              NETWORK
            </text>

            {/* connector lines from center to active node */}
            {avatarNodes.map((nd) => (
              <line
                key={`l-${nd.id}`}
                x1={cx}
                y1={cy}
                x2={nd.x}
                y2={nd.y}
                stroke={nd.sphereColor}
                strokeWidth={active && active.id === nd.id ? 1.6 : 0.5}
                opacity={active && active.id === nd.id ? 0.9 : 0.18}
              />
            ))}

            {/* avatar nodes */}
            {avatarNodes.map((nd) => {
              const isActive = active && active.id === nd.id;
              return (
                <g
                  key={nd.id}
                  className="tnp-node"
                  transform={`translate(${nd.x},${nd.y})`}
                  onMouseEnter={() => hover(nd.id)}
                  onFocus={() => hover(nd.id)}
                  onClick={() => pin(nd.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${nd.name}, ${nd.role}`}
                  aria-pressed={isActive && pinned}
                >
                  <circle
                    r={rDot + (isActive ? 3 : 0)}
                    fill={nd.sphereColor}
                    opacity={isActive ? 1 : 0.85}
                    stroke="var(--bg-secondary)"
                    strokeWidth="2"
                  />
                  {/* avatar image clipped to circle, with initials fallback underneath */}
                  <clipPath id={`clip-${nd.id}`}>
                    <circle r={rDot - 1} />
                  </clipPath>
                  <text
                    className="tnp-node-initials"
                    textAnchor="middle"
                    dy="3.5"
                    fontFamily="var(--font-sans)"
                    fontWeight="700"
                    fontSize="9"
                  >
                    {initials(nd.name)}
                  </text>
                  <image
                    href={nd.avatar}
                    x={-(rDot - 1)}
                    y={-(rDot - 1)}
                    width={(rDot - 1) * 2}
                    height={(rDot - 1) * 2}
                    clipPath={`url(#clip-${nd.id})`}
                    preserveAspectRatio="xMidYMid slice"
                    onError={(e) => {
                      // hide broken image so initials show through
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* ---- Side detail card ---- */}
        <aside className="tnp-detail" aria-live="polite">
          {active ? (
            <>
              <div className="tnp-detail-head">
                <div className="tnp-detail-avatar" style={{ borderColor: TIE_COLOR[active.tie] }}>
                  <img
                    src={active.avatar}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span className="tnp-detail-initials" aria-hidden="true">
                    {initials(active.name)}
                  </span>
                </div>
                <div>
                  <div className="tnp-detail-name">{active.name}</div>
                  <div className="tnp-detail-role">{active.role}</div>
                  <span
                    className="tnp-tie-chip"
                    style={{ color: TIE_COLOR[active.tie], borderColor: TIE_COLOR[active.tie] }}
                  >
                    {TIE_LABEL[active.tie]}
                  </span>
                </div>
              </div>

              <div className="tnp-detail-section">
                <div className="tnp-detail-label">Connection to Thiel</div>
                <p>{active.relationship}</p>
              </div>

              <div className="tnp-detail-section">
                <div className="tnp-detail-label">Role in markets</div>
                <p>{active.markets}</p>
              </div>

              <div className="tnp-detail-section">
                <div className="tnp-detail-label">Companies / vehicles</div>
                <div className="tnp-chiprow">
                  {active.companies.map((c) => (
                    <span key={c} className="tnp-company-chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="tnp-detail-section">
                <div className="tnp-detail-label">Recent headlines</div>
                <ul className="tnp-headlines">
                  {active.headlines.map((h, i) => (
                    <li key={i}>
                      <span className="tnp-headline-date">{h.date}</span>
                      {h.text}
                    </li>
                  ))}
                </ul>
                <p className="tnp-headline-note">
                  Headlines are point-in-time and may be out of date. Not investment advice.
                </p>
              </div>

              {pinned && (
                <button type="button" className="tnp-unpin" onClick={() => setPinned(false)}>
                  Unpin (resume hover)
                </button>
              )}
            </>
          ) : (
            <p className="tnp-empty">Hover a face to see details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
