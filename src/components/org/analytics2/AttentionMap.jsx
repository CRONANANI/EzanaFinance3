'use client';

import { useEffect, useState } from 'react';

// Friendly labels + display order for the taxonomy dimensions the cron emits.
const DIM_META = [
  ['sector', 'Sectors'],
  ['theme', 'Themes'],
  ['entity', 'Companies & people'],
  ['industry', 'Industries'],
  ['geo', 'Geographies'],
  ['asset_class', 'Asset classes'],
];
const TOP_PER_DIM = 5;

function DimensionBlock({ label, rows }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map((r) => r.score), 1);
  return (
    <div className="am-dim">
      <div className="am-dim-t">{label}</div>
      {rows.slice(0, TOP_PER_DIM).map((r) => (
        <div className="fa-svt" key={r.value}>
          <div className="sn">
            <span className="txt" title={r.value}>
              {r.value}
            </span>
          </div>
          <div className="fa-track">
            <i
              style={{
                width: `${Math.max(4, (r.score / max) * 100)}%`,
                background: 'var(--info, #3b82f6)',
              }}
            />
          </div>
          <div className="wt" title={`${r.memberCount} members`}>
            {r.memberCount}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Org "attention map": what the team is collectively reading about, from
 * /api/org/analytics/attention. That endpoint is managers-only and returns
 * only k-anonymous rows, so this card silently renders nothing for analysts
 * or when there isn't enough aggregated signal yet.
 */
export function AttentionMap() {
  const [dims, setDims] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/org/analytics/attention', { cache: 'no-store' });
        if (!res.ok) return; // 403 for non-managers, etc. — stay invisible.
        const json = await res.json();
        if (cancelled) return;
        setDims(json.dimensions || {});
        setMeta({ k: json.k, computedAt: json.computedAt });
      } catch {
        /* stay invisible on error */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!dims) return null;
  const present = DIM_META.filter(([key]) => dims[key]?.length);
  if (!present.length) return null;

  return (
    <div className="fa-card fa-card-pad am-card" style={{ marginTop: '1rem' }}>
      <div className="am-head">
        <h3 className="fa-card-t">Team attention map</h3>
        <span className="am-note">
          k-anonymous · ≥{meta?.k ?? 3} members per topic · numbers show members
        </span>
      </div>
      <div className="am-grid">
        {present.map(([key, label]) => (
          <DimensionBlock key={key} label={label} rows={dims[key]} />
        ))}
      </div>
    </div>
  );
}
