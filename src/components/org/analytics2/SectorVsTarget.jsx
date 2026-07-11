'use client';

import { sectorColor } from './sectorColors';

const shortSector = (s) => {
  const m = (s || '').toLowerCase();
  if (/information tech|technology|tmt/.test(m)) return 'TMT';
  if (/health/.test(m)) return 'Healthcare';
  if (/financ/.test(m)) return 'Financials';
  if (/consumer/.test(m)) return 'Consumer';
  if (/energy|utilit/.test(m)) return 'Energy';
  if (/industr/.test(m)) return 'Industrials';
  if (/material|metal/.test(m)) return 'Materials';
  return s || '—';
};

/** One bar per sleeve: weight bar + cap marker; over-cap turns amber. */
export function SectorVsTarget({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="fa-card fa-card-pad">
        <h3 className="fa-card-t" style={{ marginBottom: '0.6rem' }}>
          Sector vs. IPS target
        </h3>
        <div className="fa-empty">No positions to weight yet.</div>
      </div>
    );
  }
  const scale = Math.max(
    100,
    ...data.map((s) => s.weight_pct || 0),
    ...data.map((s) => s.cap_pct || 0),
  );

  return (
    <div className="fa-card fa-card-pad">
      <h3 className="fa-card-t" style={{ marginBottom: '0.65rem' }}>
        Sector vs. IPS target
      </h3>
      {data.map((s) => {
        const color = sectorColor(s.sector);
        return (
          <div key={s.sector}>
            <div className="fa-svt">
              <div className="sn">
                <span className="fa-sd" style={{ background: color }} />
                <span className="txt">{shortSector(s.sector)}</span>
              </div>
              <div className="fa-track">
                <i
                  style={{
                    width: `${Math.min(100, (s.weight_pct / scale) * 100)}%`,
                    background: s.over_cap ? 'var(--warning, #f59e0b)' : color,
                  }}
                />
                {s.cap_pct != null && (
                  <span
                    className="tgt"
                    style={{ left: `${Math.min(100, (s.cap_pct / scale) * 100)}%` }}
                  />
                )}
              </div>
              <div className={`wt ${s.over_cap ? 'over' : ''}`}>
                {Number(s.weight_pct).toFixed(1)}%
              </div>
            </div>
            {s.pm_name && (
              <div
                className="fa-svt-pm"
                style={{ paddingLeft: 16, marginTop: -2, marginBottom: 4 }}
              >
                PM {s.pm_name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
