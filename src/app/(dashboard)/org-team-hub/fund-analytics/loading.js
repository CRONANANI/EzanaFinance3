import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/fund-analytics/fund-analytics.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Fund Analytics, in the page's final layout: the
 * six figures, then the chart beside the sector table, then rows of lists.
 * It renders inside the shared Team Hub shell, whose sidebar stays painted
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
      <div className="ofa-skelrows">
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i}>{bar('100%', 14)}</span>
        ))}
      </div>
    </div>
  );
}

export default function FundAnalyticsLoading() {
  return (
    <SkeletonRegion
      label="Loading Fund Analytics"
      className="dashboard-page-inset ez-canvas tcc-page ofa-page"
    >
      <div className="tcc-top ofa-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip ofa-kpistrip">
            {Array.from({ length: 6 }).map((_, i) => (
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
          {bar('100%', 264)}
        </div>
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={5} />
      </div>
      <div className="tcc-row tcc-row--wide">
        <Block lines={6} />
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={4} />
      </div>
      <div className="tcc-row tcc-row--single">
        <Block lines={5} />
      </div>
    </SkeletonRegion>
  );
}
