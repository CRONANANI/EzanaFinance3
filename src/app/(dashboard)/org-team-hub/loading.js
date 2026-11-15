import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for the Command Center, in the page's final layout:
 * the KPI strips, then rows of two sections. It renders inside the shared
 * Team Hub shell, whose sidebar stays painted beside it. Presentation only:
 * no data, no org context, no import of the page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

function Block({ lines = 4 }) {
  return (
    <div className="tcc-section">
      <div className="tcc-head">{bar(180, 18)}</div>
      <ul className="tcc-rows">
        {Array.from({ length: lines }).map((_, i) => (
          <li key={i} className="tcc-health__row">
            {bar(16, 16)}
            {bar('60%')}
            {bar(72, 11)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OrgTeamHubLoading() {
  return (
    <SkeletonRegion
      label="Loading Command Center"
      className="dashboard-page-inset ez-canvas tcc-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(72, 10)}
                {bar(88, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tcc-row tcc-row--wide">
        <div className="tcc-section">
          <div className="tcc-head">{bar(180, 18)}</div>
          {bar('100%', 216)}
        </div>
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={4} />
      </div>
      <div className="tcc-row tcc-row--wide">
        <Block lines={5} />
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={5} />
      </div>
    </SkeletonRegion>
  );
}
