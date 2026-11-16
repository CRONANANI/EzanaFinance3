import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/compliance/compliance.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Compliance, in the page's final layout: the
 * figures, then breaches beside the policy summary, rules beside sector
 * headroom, and the idea check. It renders inside the shared Team Hub shell,
 * whose sidebar stays painted beside it. Presentation only: no data, no org
 * context, no import of the page, no fields and no live controls.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

const lines = (n, base = 100) => (
  <div className="cmp-skel">
    {Array.from({ length: n }).map((_, i) => (
      <span key={i}>{bar(`${base - (i % 3) * 8}%`, i === 0 ? 10 : 14)}</span>
    ))}
  </div>
);

export default function ComplianceLoading() {
  return (
    <SkeletonRegion
      label="Loading compliance"
      className="dashboard-page-inset ez-canvas tcc-page cmp-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(80, 10)}
                {bar(32, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="cmp-row">
        <div>
          {bar('24%', 18)}
          {lines(4)}
        </div>
        <span className="tcc-vrule cmp-vrule" aria-hidden="true" />
        <div>
          {bar('50%', 18)}
          {lines(5, 92)}
        </div>
      </div>
      <div className="cmp-row">
        <div>
          {bar('30%', 18)}
          {lines(7)}
        </div>
        <span className="tcc-vrule cmp-vrule" aria-hidden="true" />
        <div>
          {bar('50%', 18)}
          {lines(5, 92)}
        </div>
      </div>
      <div className="cmp-row cmp-row--single">
        <div>
          {bar('16%', 18)}
          {lines(3, 70)}
        </div>
      </div>
    </SkeletonRegion>
  );
}
