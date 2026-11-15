'use client';

import { workloadRows } from '@/lib/org-assignments-model';
import { Section } from '@/components/org/command-center/parts';

/**
 * Open, overdue and awaiting-review work per sector team and per cohort,
 * counted from the work this manager can see (there is no council-wide view).
 */
export function Workload({ assignments, refs }) {
  const rows = workloadRows(assignments, refs);
  return (
    <Section id="oas-workload" title="Workload by team and cohort" className="oas-workload">
      {rows.length === 0 ? (
        <p className="tcc-state">
          <span>No open work is tied to a sector team or a cohort.</span>
        </p>
      ) : (
        <>
          <div className="oas-wl" role="table" aria-label="Workload by team and cohort">
            <div className="oas-wl__row oas-wl__row--head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Team or cohort</span>
              <span role="columnheader" className="oas-num">
                Open
              </span>
              <span role="columnheader" className="oas-num">
                Overdue
              </span>
              <span role="columnheader" className="oas-num">
                Awaiting review
              </span>
            </div>
            {rows.map((r, i) => (
              <div key={r.key} className="oas-wl__row" role="row">
                <span role="cell" className="tcc-mono tcc-na">
                  {i + 1}
                </span>
                <span role="rowheader" className="oas-wl__name">
                  <span className="oas-clip">{r.name}</span>
                  <span className="oas-wl__kind">{r.kind}</span>
                </span>
                <span role="cell" className="oas-num tcc-mono">
                  {r.open}
                </span>
                <span role="cell" className={`oas-num tcc-mono${r.overdue > 0 ? ' tcc-neg' : ''}`}>
                  {r.overdue}
                </span>
                <span role="cell" className="oas-num tcc-mono">
                  {r.awaiting_review}
                </span>
              </div>
            ))}
          </div>
          <p className="oas-foot">
            Counted from the work you can see. Work given to people on two teams counts for both.
          </p>
        </>
      )}
    </Section>
  );
}
