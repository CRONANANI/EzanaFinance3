import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/assignments/assignments.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Assignments, in the page's final layout: the four
 * figures, then the grouped list beside the side column. It renders inside
 * the shared Team Hub shell, whose sidebar stays painted beside it.
 * Presentation only: no data, no org context, no import of the page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function AssignmentsLoading() {
  return (
    <SkeletonRegion
      label="Loading assignments"
      className="dashboard-page-inset ez-canvas tcc-page oas-page"
    >
      <div className="tcc-top oas-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(72, 10)}
                {bar(48, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="oas-body">
        <div className="oas-main">
          <div className="tcc-head">{bar(160, 18)}</div>
          <div className="oas-filters">{bar('100%', 14)}</div>
          <div className="oas-skel">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar('100%', 16)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule oas-vrule" aria-hidden="true" />
        <div className="oas-side">
          <div className="tcc-head">{bar(110, 18)}</div>
          <div className="oas-skel oas-skel--side">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar(`${92 - i * 9}%`, 12)}</span>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
