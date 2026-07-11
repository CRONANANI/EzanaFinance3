'use client';

import { Filter } from 'lucide-react';

/** Submitted → Approved → Executed with counts + conversion %. */
export function PitchFunnel({ data }) {
  const submitted = data?.submitted ?? 0;
  const approved = data?.approved ?? 0;
  const executed = data?.executed ?? 0;
  const max = Math.max(1, submitted);

  const stages = [
    { label: 'Submitted', n: submitted, base: null, shade: 0.55 },
    { label: 'Approved', n: approved, base: submitted, shade: 0.78 },
    { label: 'Executed', n: executed, base: approved, shade: 1 },
  ];

  return (
    <div className="fa-card fa-card-pad">
      <h3 className="fa-card-t" style={{ marginBottom: '0.7rem' }}>
        <Filter size={15} aria-hidden /> Pitch funnel
      </h3>
      {submitted === 0 ? (
        <div className="fa-empty">No pitches submitted yet.</div>
      ) : (
        <div className="fa-funnel">
          {stages.map((s) => {
            const conv = s.base ? Math.round((s.n / s.base) * 100) : null;
            return (
              <div className="fa-fstage" key={s.label}>
                <span className="lbl">{s.label}</span>
                <span
                  className="bar an4-num"
                  style={{
                    width: `${Math.max(12, (s.n / max) * 100)}%`,
                    background: `color-mix(in srgb, var(--emerald, #10b981) ${s.shade * 100}%, transparent)`,
                  }}
                >
                  {s.n}
                </span>
                <span className="cv">{conv == null ? '' : `${conv}%`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
