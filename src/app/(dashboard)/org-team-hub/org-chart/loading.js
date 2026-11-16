import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/org-chart/org-chart.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for the Org chart, in the page's final layout: the
 * eight figures, the structure beside sector coverage, then the tables. It
 * renders inside the shared Team Hub shell, whose sidebar stays painted
 * beside it. Presentation only: no data, no org context, no import of the
 * page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

function Block({ lines = 4 }) {
  return (
    <div className="tcc-section">
      <div className="tcc-head">{bar(180, 18)}</div>
      <div className="ooc-skelrows">
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i}>{bar('100%', 14)}</span>
        ))}
      </div>
    </div>
  );
}

export default function OrgChartLoading() {
  return (
    <SkeletonRegion
      label="Loading the org chart"
      className="dashboard-page-inset ez-canvas tcc-page ooc-page"
    >
      <div className="tcc-top ooc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(72, 10)}
                {bar(56, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tcc-row ooc-row--tree">
        <Block lines={8} />
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={11} />
      </div>
      <div className="tcc-row tcc-row--wide">
        <Block lines={5} />
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={5} />
      </div>
      <div className="tcc-row tcc-row--single">
        <Block lines={8} />
      </div>
    </SkeletonRegion>
  );
}
