import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org-trading/desk/trading-desk.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for the Trading Desk, in the page's final layout: the
 * KPI strips, the fund book beside the flag queue, then the holdings table.
 * It renders inside the shared Team Hub shell, whose sidebar stays painted
 * beside it. Presentation only: no data, no org context, no import of the page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

function Block({ lines = 4, h = 14 }) {
  return (
    <div className="tcc-section">
      <div className="tcc-head">{bar(180, 18)}</div>
      <div className="otd-skelrows">
        {Array.from({ length: lines }).map((_, i) => (
          <span key={i}>{bar('100%', h)}</span>
        ))}
      </div>
    </div>
  );
}

export default function OrgTradingLoading() {
  return (
    <SkeletonRegion
      label="Loading the Trading Desk"
      className="dashboard-page-inset ez-canvas tcc-page otd-page"
    >
      <div className="tcc-top otd-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(18, 18)}</span>
                <span className="tcc-kpi__label">{bar(72, 10)}</span>
                <span className="tcc-kpi__value">{bar(64, 16)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tcc-row otd-row--even">
        <Block lines={3} h={64} />
        <span className="tcc-vrule" aria-hidden="true" />
        <Block lines={4} h={34} />
      </div>
      <div className="tcc-row tcc-row--single">
        <Block lines={5} />
      </div>
    </SkeletonRegion>
  );
}
