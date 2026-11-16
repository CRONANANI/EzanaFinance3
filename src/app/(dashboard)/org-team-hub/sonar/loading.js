import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/sonar/sonar-research.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Sonar Research, in the page's final layout: the
 * figures, the tabs, then the tables beside the side column. Presentation
 * only: no data, no org context.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function SonarResearchLoading() {
  return (
    <SkeletonRegion
      label="Loading Sonar Research"
      className="dashboard-page-inset ez-canvas tcc-page osp-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpistrip">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="tcc-kpi">
              <span className="tcc-kpi__icon">{bar(20, 20)}</span>
              {bar(72, 10)}
              {bar(48, 16)}
            </div>
          ))}
        </div>
      </div>
      <div className="osp-tabs">{bar(220, 14)}</div>
      <div className="osp-body">
        <div className="osp-main">
          <div className="tcc-head">{bar(140, 18)}</div>
          <div className="osp-skel">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar('100%', 16)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule osp-vrule" aria-hidden="true" />
        <div className="osp-side">
          <div className="tcc-head">{bar(120, 18)}</div>
          <div className="osp-skel">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i}>{bar('100%', 14)}</span>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
