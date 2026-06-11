'use client';

import { useMemo, useState } from 'react';
import './org-chart.css';

const ROLE_SHORT = {
  executive: 'Exec',
  portfolio_manager: 'PM',
  analyst: 'Analyst',
};

/**
 * GICS sector coverage grid. Surfaces coverage gaps (sectors with nobody
 * assigned) and lets executives/PMs assign a member to a sector.
 *
 * Props:
 *  - sectors:   string[]  (the 11 GICS sectors)
 *  - members:   flat member array, each with a `sectors` array of { sector }
 *  - canManage: boolean   (executive / portfolio_manager)
 *  - onAssignSector(sector, memberId): assigns coverage (parent calls PATCH)
 */
export function SectorCoverageMap({ sectors = [], members = [], canManage = false, onAssignSector }) {
  const [openSector, setOpenSector] = useState(null);

  // sector -> [members covering it]
  const coverage = useMemo(() => {
    const map = new Map(sectors.map((s) => [s, []]));
    for (const m of members) {
      for (const entry of m.sectors || []) {
        if (map.has(entry.sector)) map.get(entry.sector).push(m);
      }
    }
    return map;
  }, [sectors, members]);

  return (
    <div className="oc2-sector-grid">
      {sectors.map((sector) => {
        const covering = coverage.get(sector) || [];
        const isGap = covering.length === 0;
        // Members not already covering this sector — candidates to assign.
        const candidates = members.filter(
          (m) => !(m.sectors || []).some((s) => s.sector === sector),
        );

        return (
          <div key={sector} className={`oc2-sector-card${isGap ? ' is-gap' : ''}`}>
            <div className="oc2-sector-head">
              <span className="oc2-sector-name">{sector}</span>
              {isGap && <span className="oc2-gap-badge">Coverage Gap</span>}
            </div>

            <div className="oc2-sector-members">
              {covering.length === 0 ? (
                <span className="oc2-sector-empty">No analyst assigned</span>
              ) : (
                covering.map((m) => (
                  <span key={m.id} className="oc2-sector-member">
                    <i className="bi bi-person-fill" aria-hidden />
                    {m.display_name || 'Unnamed'}
                    <span className="oc2-sector-member-role">
                      · {ROLE_SHORT[m.role] || m.role}
                    </span>
                  </span>
                ))
              )}
            </div>

            {canManage &&
              (openSector === sector ? (
                <div className="oc2-assign-row">
                  <select
                    className="oc2-assign-select"
                    defaultValue=""
                    aria-label={`Assign a member to ${sector}`}
                    onChange={(e) => {
                      const memberId = e.target.value;
                      if (memberId) {
                        onAssignSector?.(sector, memberId);
                        setOpenSector(null);
                      }
                    }}
                  >
                    <option value="" disabled>
                      Choose member…
                    </option>
                    {candidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name || 'Unnamed'} ({ROLE_SHORT[m.role] || m.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="oc2-assign-btn"
                    onClick={() => setOpenSector(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="oc2-assign-btn"
                  onClick={() => setOpenSector(sector)}
                  disabled={candidates.length === 0}
                >
                  <i className="bi bi-plus-lg" aria-hidden /> Assign
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}
