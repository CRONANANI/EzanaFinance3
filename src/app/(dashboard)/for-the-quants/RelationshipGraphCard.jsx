'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRelationshipGraph } from '@/lib/quants/backtest-simulation-mapper';

const COLOR = {
  buy: 'var(--emerald)',
  sell: 'var(--negative)',
  hub: 'var(--text-primary)',
  catalyst: 'var(--amber)',
};

export default function RelationshipGraphCard({ seed = 21 }) {
  const graph = useMemo(() => buildRelationshipGraph({ seed }), [seed]);
  const W = 700;
  const H = 320;

  // mutable physics state kept in a ref; React state only triggers re-render
  const nodesRef = useRef(
    graph.nodes.map((n) => ({ ...n, px: n.x * W, py: n.y * H, vx: 0, vy: 0 })),
  );
  const [, setFrame] = useState(0);
  const rafRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    nodesRef.current = graph.nodes.map((n) => ({
      ...n,
      px: n.x * W,
      py: n.y * H,
      vx: 0,
      vy: 0,
    }));

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const idMap = () => Object.fromEntries(nodesRef.current.map((n) => [n.id, n]));

    const step = () => {
      const ns = nodesRef.current;
      const map = idMap();
      // repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i],
            b = ns[j];
          let dx = a.px - b.px,
            dy = a.py - b.py;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1400 / (dist * dist);
          dx /= dist;
          dy /= dist;
          a.vx += dx * force;
          a.vy += dy * force;
          b.vx -= dx * force;
          b.vy -= dy * force;
        }
      }
      // springs along edges
      graph.edges.forEach((e) => {
        const a = map[e.source],
          b = map[e.target];
        if (!a || !b) return;
        let dx = b.px - a.px,
          dy = b.py - a.py;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const rest = 70;
        const k = 0.012 * (dist - rest);
        dx /= dist;
        dy /= dist;
        a.vx += dx * k;
        a.vy += dy * k;
        b.vx -= dx * k;
        b.vy -= dy * k;
      });
      // centering + damping + integrate
      ns.forEach((n) => {
        n.vx += (W / 2 - n.px) * 0.0015;
        n.vy += (H / 2 - n.py) * 0.0015;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.px += n.vx;
        n.py += n.vy;
        n.px = Math.max(14, Math.min(W - 14, n.px));
        n.py = Math.max(14, Math.min(H - 14, n.py));
      });
    };

    if (reduce) {
      for (let k = 0; k < 240; k++) step();
      setFrame((f) => f + 1);
      return;
    }

    const tick = () => {
      step();
      phaseRef.current += 0.03;
      setFrame((f) => f + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [seed, graph]);

  const ns = nodesRef.current;
  const map = Object.fromEntries(ns.map((n) => [n.id, n]));
  const pulse = (Math.sin(phaseRef.current) + 1) / 2;

  return (
    <div className="ezana-card ftq-sim-card ftq-sim-card--wide">
      <div className="ezana-card-header">
        <div>
          <div className="ezana-card-title">Minnow — Relationship Graph Simulation</div>
          <div className="ezana-card-subtitle">Signal Confluence Network</div>
        </div>
        <span className="ezana-pill ftq-sim-live">
          <span className="ftq-sim-dot" aria-hidden="true" /> LIVE
        </span>
      </div>

      <div className="ftq-sim-graph-body">
        <svg
          className="ftq-sim-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Force-directed relationship graph of trading signals"
        >
          {graph.edges.map((e, i) => {
            const a = map[e.source],
              b = map[e.target];
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.px}
                y1={a.py}
                x2={b.px}
                y2={b.py}
                stroke="var(--emerald-border)"
                strokeWidth={0.5 + e.weight}
                opacity={0.25 + e.weight * 0.35 * pulse}
              />
            );
          })}
          {ns.map((n) => (
            <g key={n.id}>
              <circle
                cx={n.px}
                cy={n.py}
                r={4 + n.weight * 8}
                fill={COLOR[n.kind] || 'var(--text-muted)'}
                opacity={n.kind === 'hub' ? 0.95 : 0.85}
              />
              {(n.kind === 'hub' || n.kind === 'catalyst') && (
                <text
                  x={n.px + 8}
                  y={n.py + 3}
                  fontSize="8"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono)"
                >
                  {n.kind.toUpperCase()}
                </text>
              )}
            </g>
          ))}
        </svg>

        <div className="ftq-sim-rail ftq-sim-rail--right">
          <Stat label="P(Bull)" value={graph.stats.pBull.toFixed(2)} positive />
          <Stat label="P(Bear)" value={graph.stats.pBear.toFixed(2)} negative />
          <Stat label="Edges In Book" value={String(graph.stats.edgesInBook)} />
          <Stat
            label="Confluence"
            value={`${(graph.stats.confluence * 100).toFixed(1)}%`}
            positive
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, positive, negative }) {
  return (
    <div className="ftq-sim-stat">
      <div className="ftq-sim-stat-label">{label}</div>
      <div className={`ftq-sim-stat-value${positive ? ' is-pos' : ''}${negative ? ' is-neg' : ''}`}>
        {value}
      </div>
    </div>
  );
}
