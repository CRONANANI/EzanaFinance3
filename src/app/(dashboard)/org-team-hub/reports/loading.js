import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/reports/reports.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Reports, in the page's final layout: the figures
 * from the latest report, the generate column beside the printable preview,
 * and the saved reports. It renders inside the shared Team Hub shell.
 * Presentation only: no data, no fields and no live controls.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

const lines = (n) => (
  <div className="rpt-skel">
    {Array.from({ length: n }).map((_, i) => (
      <span key={i}>{bar(`${100 - (i % 3) * 9}%`, i === 0 ? 10 : 14)}</span>
    ))}
  </div>
);

export default function ReportsLoading() {
  return (
    <SkeletonRegion
      label="Loading reports"
      className="dashboard-page-inset ez-canvas tcc-page rpt-page"
    >
      <div className="tcc-top rpt-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip rpt-kpistrip">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(80, 10)}
                {bar(64, 16)}
              </div>
            ))}
          </div>
        </div>
        <div className="tcc-actions">
          {bar(64, 14)}
          {bar(132, 34)}
        </div>
      </div>
      <div className="tcc-row rpt-row">
        <div className="tcc-section">
          <div className="tcc-head">{bar(140, 18)}</div>
          {lines(8)}
        </div>
        <span className="tcc-vrule" aria-hidden="true" />
        <div className="tcc-section">
          <div className="tcc-head">{bar(180, 18)}</div>
          {bar('100%', 420)}
        </div>
      </div>
      <div className="tcc-row tcc-row--single">
        <div className="tcc-section">
          <div className="tcc-head">{bar(150, 18)}</div>
          {lines(6)}
        </div>
      </div>
    </SkeletonRegion>
  );
}
