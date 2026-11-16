import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/competitions/landing/landing.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Competitions, in the landing screen's final
 * layout: the figures, the two tabs, the four main sections and the side
 * column. It renders inside the shared Team Hub shell, whose sidebar stays
 * painted beside it. Presentation only: no data, no org context.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);
const rows = (n) =>
  Array.from({ length: n }).map((_, i) => (
    <span key={i} className="ocp-skel__row">
      {bar(`${44 - (i % 3) * 6}%`)}
      {bar('16%')}
      {bar('12%')}
    </span>
  ));

export default function CompetitionsLoading() {
  return (
    <SkeletonRegion
      label="Loading competitions"
      className="dashboard-page-inset ez-canvas tcc-page ocp-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip ocp-kpistrip">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(64, 10)}
                {bar(56, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ocp-tabs">
        {bar(132, 14)}
        {bar(112, 14)}
      </div>
      <div className="ocp-body">
        <div className="ocp-main">
          {[3, 3, 3, 2].map((n, i) => (
            <div key={i} className="ocp-section">
              {bar(180, 18)}
              <div className="ocp-skel">{rows(n)}</div>
            </div>
          ))}
        </div>
        <span className="tcc-vrule ocp-vrule" aria-hidden="true" />
        <div className="ocp-rail">
          {[4, 2, 3].map((n, i) => (
            <div key={i} className="ocp-section">
              {bar(160, 18)}
              <div className="ocp-skel">{rows(n)}</div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
