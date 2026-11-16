import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/permissions/team-permissions.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Team Permissions, in the page's final layout: the
 * figures, then the rights by direct report. It renders inside the shared
 * Team Hub shell, whose sidebar stays painted beside it. Presentation only:
 * no data, no org context and no live controls.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function TeamPermissionsLoading() {
  return (
    <SkeletonRegion
      label="Loading team permissions"
      className="dashboard-page-inset ez-canvas tcc-page tpm-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip tpm-kpis">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(80, 10)}
                {bar(28, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tcc-row tcc-row--single">
        <div>
          {bar('18%', 18)}
          <div className="tpm-skel">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="tpm-skel__row">
                {bar('60%', i === 0 ? 10 : 14)}
                {bar('70%')}
                {bar('70%')}
                {bar('70%')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
